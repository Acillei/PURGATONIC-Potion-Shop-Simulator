
import Phaser from 'phaser';

import { createExplorationCamera } from '../exploration/ExplorationCamera.js';
import { createExplorationControls, facingFor, movementVector } from '../exploration/ExplorationControls.js';
import { createExplorationDebug } from '../exploration/ExplorationDebug.js';
import { createCollision, findInteraction } from '../exploration/ExplorationGeometry.js';
import { ROOM_H, ROOM_W, SHOP_SPAWN, shopGeometry } from '../maps/shopInteriorData.js';

const WITCH_SCALE = 3.0;
const WITCH_FOOT_ORIGIN = 62 / 64;
const HUD_MARGIN = 16;

export default class ShopInteriorScene extends Phaser.Scene {
    #workstationView;

    constructor() {
        super('ShopInteriorScene');
    }

    preload() {
        this.load.image(
            'shopInteriorBg',
            '/assets/interior/potion_shop_interior.png'
        );

        for (const dir of [
            'down',
            'up',
            'left',
            'right'
        ]) {
            if (!this.textures.exists(dir)) {
                this.load.spritesheet(
                    dir,
                    `/assets/sprites/witch_${dir}.png`,
                    {
                        frameWidth: 48,
                        frameHeight: 64
                    }
                );
            }
        }
    }

    create() {
        this.cameras.main.setBackgroundColor('#211627');

        // Anh noi that da chot
        const room = this.add.image(
            0,
            0,
            'shopInteriorBg'
        )
            .setOrigin(0)
            .setDepth(-10);

        // Dieu khien
        this.keys = this.input.keyboard.addKeys(
            'W,A,S,D,E'
        );

        this.speed = 185;

        this.gameState = this.registry.get('gameState');
        const returningFromWorkstation = this.gameState.getPlayer().currentScene === 'WorkstationScene';
        const { position, facing } = this.gameState.enterScene('ShopInteriorScene', SHOP_SPAWN);
        this.facing = facing;

        this.collision = createCollision(shopGeometry);

        // Animation phu thuy
        for (const dir of [
            'down',
            'up',
            'left',
            'right'
        ]) {
            const key = `walk_${dir}`;

            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames:
                        this.anims.generateFrameNumbers(
                            dir,
                            {
                                start: 0,
                                end: 3
                            }
                        ),
                    frameRate: 8,
                    repeat: -1
                });
            }
        }

        this.witch = this.add.sprite(
            position.x,
            position.y,
            this.facing,
            0
        )
            .setOrigin(0.5, WITCH_FOOT_ORIGIN)
            .setScale(WITCH_SCALE)
            .setDepth(10);

        this.camera = createExplorationCamera(this, this.witch, {
            bounds: { width: ROOM_W, height: ROOM_H },
            targetView: { width: 1320, height: 800 },
            deadzone: { x: 0.18, y: 0.14 },
            offsetY: 64
        });
        this.camera.ui.ignore([room, this.witch]);
        const addUI = obj => {
            obj.setScrollFactor(0).setDepth(100);
            this.camera.world.ignore(obj);
            return obj;
        };
        this.controls = createExplorationControls(this, addUI, () => this.interact(),
            { touchOnly: true, fullscreenY: 64 });

        // Giao dien
        const uiStyle = {
            fontFamily: 'Arial',
            fontSize: '21px',
            color: '#f9e9d2',
            backgroundColor: '#352342',
            padding: {
                x: 12,
                y: 8
            }
        };

        this.hint = this.add.text(
            0,
            0,
            '',
            uiStyle
        )
            .setOrigin(0)
            .setDepth(100);

        this.exitButton = this.add.text(
            0,
            0,
            'RA NGOÀI',
            uiStyle
        )
            .setOrigin(1, 0)
            .setDepth(100)
            .setInteractive({
                useHandCursor: true
            });

        addUI(this.hint);
        addUI(this.exitButton);

        this.exitButton.on('pointerdown', () => {
            this.leaveShop();
        });

        this.debug = createExplorationDebug(this, this.camera.ui, shopGeometry);
        const view = this.#workstationView;
        this.#workstationView = undefined;
        if (returningFromWorkstation && view &&
            view.playerX === position.x && view.playerY === position.y && view.facing === facing) {
            this.camera.world.centerOn(view.centerX, view.centerY);
        }
        this.camera.start((width, height) => {
            this.hint.setPosition(HUD_MARGIN, HUD_MARGIN);
            this.exitButton.setPosition(width - HUD_MARGIN, HUD_MARGIN);
            this.controls.resize(width, height);
            this.debug.resize(height);
        });
    }

    interactionAtFoot() {
        return findInteraction(this.witch, shopGeometry.zones, this.collision.canStand);
    }

    // Xu ly tuong tac chung
    interact() {
        const zone = this.interactionAtFoot();
        if (!zone) return false;
        this.controls.reset();

        if (zone.id === 'exit') {
            this.leaveShop();
            return true;
        }

        const { x, y } = this.cameras.main.midPoint;
        this.#workstationView = {
            centerX: x,
            centerY: y,
            playerX: this.witch.x,
            playerY: this.witch.y,
            facing: this.facing
        };
        this.scene.start(
            'WorkstationScene',
            { station: zone.id }
        );
        return true;
    }

    // Ra khoi Tiem thuoc
    leaveShop() {
        this.scene.start('WorldMapScene');
    }

    update(_time, delta) {
        const zone = this.interactionAtFoot();
        this.hint.setText(zone ? 'E: ' + zone.name : 'WASD: di chuyển');
        this.debug.update(this.witch);
        if (Phaser.Input.Keyboard.JustDown(this.keys.E) && this.interact()) return;

        const vector = movementVector(this.keys, this.controls.vector);
        if (vector) {
            const distance = this.speed * Math.min(delta, 60) / 1000;
            const next = this.collision.move(this.witch, vector.x * distance, vector.y * distance);
            if (this.witch.x !== next.x || this.witch.y !== next.y) {
                this.witch.setPosition(next.x, next.y);
                this.facing = facingFor(vector);
                this.witch.anims.play('walk_' + this.facing, true);
                this.gameState.updatePlayerPose('ShopInteriorScene', this.witch, this.facing);
                return;
            }
        }
        this.witch.anims.stop();
        this.witch.setTexture(this.facing, 0);
    }
}
