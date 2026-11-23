
import Phaser from 'phaser';
import WorldMapScene from './scenes/WorldMapScene';
import GameScene from './scenes/GameScene';
import ShopInteriorScene from './scenes/ShopInteriorScene';
import WorkstationScene from './scenes/WorkstationScene';

export function createGame(parent) {
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

        scene: [WorldMapScene,GameScene,ShopInteriorScene,WorkstationScene],
    });
}
