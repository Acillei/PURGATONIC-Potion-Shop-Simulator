
import Phaser from 'phaser';
import WorldMapScene from './scenes/WorldMapScene';
import GameScene from './scenes/GameScene';
import ShopInteriorScene from './scenes/ShopInteriorScene';
import WorkstationScene from './scenes/WorkstationScene';
import { GameState } from './state/GameState.js';
import { SaveSystem } from './state/SaveSystem.js';

const scenes = { WorldMapScene, GameScene, ShopInteriorScene, WorkstationScene };

export function createGame(parent) {
    const gameState = new GameState();
    let restoredPlayer = null;
    const saveSystem = new SaveSystem(gameState, {
        onRestore: () => {
            restoredPlayer = gameState.getPlayer();
        }
    });
    saveSystem.loadGame();
    restoredPlayer = null;

    const initialScene = gameState.getPlayer().currentScene;
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent: parent,

        width: 800,
        height: 450,

        backgroundColor: '#A8C99B',
        pixelArt: true,
        roundPixels: true,

        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 800,
            height: 450,
        },

        scene: [scenes[initialScene], ...Object.values(scenes).filter(scene => scene !== scenes[initialScene])],
        callbacks: {
            preBoot(game) {
                game.registry.set('gameState', gameState);
                game.registry.set('saveSystem', saveSystem);

                game.events.on(Phaser.Core.Events.PRE_STEP, () => {
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
                });
            }
        }
    });
}
