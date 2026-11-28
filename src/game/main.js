
import Phaser from 'phaser';
import WorldMapScene from './scenes/WorldMapScene';
import GameScene from './scenes/GameScene';
import ShopInteriorScene from './scenes/ShopInteriorScene';
import WorkstationScene from './scenes/WorkstationScene';
import { observeGameContainer } from './exploration/ExplorationCamera.js';
import { SaveSystem } from './state/SaveSystem.js';

const scenes = { WorldMapScene, GameScene, ShopInteriorScene, WorkstationScene };

class Game extends Phaser.Game {
    start() {
        // Phaser 3's visibility handler installs global listeners without a destroy hook.
        const visibility = new AbortController();
        const addListener = document.addEventListener;
        const ownAddListener = Object.getOwnPropertyDescriptor(document, 'addEventListener');
        const previousFocus = window.onfocus;
        const previousBlur = window.onblur;

        document.addEventListener = function (type, listener, options) {
            const isVisibilityListener = /^(webkit|moz|ms)?visibilitychange$/.test(type) && options === false;
            return addListener.call(this, type, listener, isVisibilityListener ? { signal: visibility.signal } : options);
        };

        try {
            super.start();
        } finally {
            if (ownAddListener) Object.defineProperty(document, 'addEventListener', ownAddListener);
            else delete document.addEventListener;

            const gameFocus = window.onfocus;
            const gameBlur = window.onblur;
            this.events.once(Phaser.Core.Events.DESTROY, () => {
                visibility.abort();
                if (window.onfocus === gameFocus) window.onfocus = previousFocus;
                if (window.onblur === gameBlur) window.onblur = previousBlur;
            });
        }
    }
}

export function createGame(parent, { gameState, profile }) {
    let restoredPlayer = null;
    const saveSystem = new SaveSystem(gameState, {
        onRestore: () => {
            restoredPlayer = gameState.getPlayer();
        }
    });
    const initialScene = gameState.getPlayer().currentScene;
    return new Game({
        type: Phaser.AUTO,
        parent: parent,

        width: 800,
        height: 450,

        backgroundColor: '#A8C99B',
        pixelArt: true,
        roundPixels: true,
        input: { touch: true, activePointers: 2 },

        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            fullscreenTarget: parent,
            width: 800,
            height: 450,
        },

        scene: [scenes[initialScene], ...Object.values(scenes).filter(scene => scene !== scenes[initialScene])],
        callbacks: {
            postBoot(game) {
                observeGameContainer(game, parent);
            },
            preBoot(game) {
                game.registry.set('gameState', gameState);
                game.registry.set('saveSystem', saveSystem);
                if (profile) game.registry.set('playerProfile', profile);

                const restoreScene = () => {
                    if (!restoredPlayer) return;

                    const player = restoredPlayer;
                    restoredPlayer = null;
                    // Finish queued navigation before restarting from the restored player.
                    game.scene.processQueue();
                    for (const scene of game.scene.getScenes(false)) {
                        const { status } = scene.sys.settings;
                        if (status >= Phaser.Scenes.START && status <= Phaser.Scenes.SLEEPING) {
                            game.scene.stop(scene);
                        }
                    }
                    gameState.setPlayer(player);
                    game.scene.start(player.currentScene, {});
                };
                game.events.on(Phaser.Core.Events.PRE_STEP, restoreScene);
                game.events.once(Phaser.Core.Events.DESTROY, () => {
                    game.events.off(Phaser.Core.Events.PRE_STEP, restoreScene);
                });
            }
        }
    });
}
