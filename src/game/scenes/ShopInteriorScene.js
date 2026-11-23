
import Phaser from 'phaser';

const ROOM_W = 1448;
const ROOM_H = 1086;
const MAX_VIEW_W = 1320;
const MAX_VIEW_H = 800;
const CAMERA_FOLLOW_LERP = 0.18;
const CAMERA_LOOK_UP = 64;
const HUD_MARGIN = 16;

const DOOR = {
    x: 724,
    y: 980
};
const SPAWN = { position: { x: 724, y: 967 }, facing: 'up' };

const WITCH_SCALE = 2.5;
const DEBUG_COLLISION = false;

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
        const camera = this.cameras.main;
        camera.setBackgroundColor('#211627');

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
        const { position, facing } = this.gameState.enterScene('ShopInteriorScene', SPAWN);
        this.facing = facing;

        // Chi giu va cham voi vat can lon
        this.blockers = [
            // Hai tu nguyen lieu
            {
                left: 270,
                right: 540,
                top: 150,
                bottom: 412
            },
            {
                left: 885,
                right: 1165,
                top: 150,
                bottom: 412
            },

            // Vac thuoc
            {
                left: 585,
                right: 860,
                top: 275,
                bottom: 420
            },

            // Quay le tan cong
            {
                left: 42,
                right: 190,
                top: 635,
                bottom: 810
            },
            {
                left: 170,
                right: 320,
                top: 700,
                bottom: 832
            },
            {
                left: 310,
                right: 430,
                top: 595,
                bottom: 780
            },

            // Ban so che
            {
                left: 990,
                right: 1342,
                top: 490,
                bottom: 605
            },

            // Ruong va gio nguyen lieu
            {
                left: 1180,
                right: 1360,
                top: 710,
                bottom: 808
            },
            {
                left: 1080,
                right: 1360,
                top: 820,
                bottom: 895
            }
        ];

        // Cac tram lam viec
        this.stations = [
            {
                id: 'brewing',
                name: 'Vạc nấu thuốc',
                x: 725,
                y: 505,
                radius: 115
            },
            {
                id: 'preparation',
                name: 'Bàn sơ chế',
                x: 1120,
                y: 665,
                radius: 125
            },
            {
                id: 'storage',
                name: 'Rương nguyên liệu',
                x: 1045,
                y: 827,
                radius: 135
            },
            {
                id: 'reception',
                name: 'Quầy lễ tân',
                x: 505,
                y: 690,
                radius: 135
            }
        ];

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
            .setOrigin(0.5, 1)
            .setScale(WITCH_SCALE)
            .setDepth(10);

        camera.setBounds(0, 0, ROOM_W, ROOM_H);
        camera.startFollow(this.witch, true, CAMERA_FOLLOW_LERP, CAMERA_FOLLOW_LERP, 0, CAMERA_LOOK_UP);
        this.uiCamera = this.cameras.add();
        this.uiCamera.ignore([room, this.witch]);

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

        camera.ignore([this.hint, this.exitButton]);

        this.exitButton.on('pointerdown', () => {
            this.leaveShop();
        });

        // Hien thi vung va cham va vung tuong tac
        if (DEBUG_COLLISION) {
            const dbg = this.add.graphics()
                .setDepth(50);
            this.uiCamera.ignore(dbg);

            // Mau do: khu vuc bi chan
            dbg.lineStyle(
                3,
                0xff5555,
                0.85
            );

            for (const b of this.blockers) {
                dbg.strokeRect(
                    b.left,
                    b.top,
                    b.right - b.left,
                    b.bottom - b.top
                );
            }

            // Mau xanh: vung kich hoat tram
            dbg.lineStyle(
                2,
                0x55ffbb,
                0.7
            );

            for (const p of this.stations) {
                dbg.strokeCircle(
                    p.x,
                    p.y,
                    p.radius
                );
            }
        }

        const view = this.#workstationView;
        this.#workstationView = undefined;
        if (returningFromWorkstation && view &&
            view.playerX === position.x && view.playerY === position.y && view.facing === facing) {
            camera.centerOn(view.centerX, view.centerY);
        }
        this.resizeScene(this.scale.gameSize);

        this.scale.on(
            'resize',
            this.resizeScene,
            this
        );

        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            () => {
                this.scale.off(
                    'resize',
                    this.resizeScene,
                    this
                );
            }
        );
    }

    // Dieu chinh camera
    resizeScene({ width, height }) {
        if (width <= 0 || height <= 0) return;

        const camera = this.cameras.main;
        const { x, y } = camera.midPoint;
        camera.setSize(width, height);
        // Keep the visible world smaller than the room on both axes.
        camera.setZoom(Math.max(width / MAX_VIEW_W, height / MAX_VIEW_H));
        camera.setDeadzone(camera.displayWidth * 0.18, camera.displayHeight * 0.14);
        camera.centerOn(x, y);

        this.uiCamera.setSize(width, height);
        this.hint.setPosition(HUD_MARGIN, HUD_MARGIN);
        this.exitButton.setPosition(width - HUD_MARGIN, HUD_MARGIN);
    }

    // Kiem tra va cham theo ban chan
    canWalk(x, y) {
        const radiusX = 10;
        const radiusY = 7;

        const inRoom =
            x >= 92 &&
            x <= 1355 &&
            y >= 405 &&
            y <= 976;

        const onDoorway =
            x >= 628 &&
            x <= 820 &&
            y >= 905 &&
            y <= 1030;

        if (!inRoom && !onDoorway) {
            return false;
        }

        return !this.blockers.some(b =>
            x + radiusX > b.left &&
            x - radiusX < b.right &&
            y + radiusY > b.top &&
            y - radiusY < b.bottom
        );
    }

    // Tim tram lam viec gan phu thuy
    nearestInteraction() {
        const x = this.witch.x;
        const y = this.witch.y;

        // Uu tien cua ra ngoai
        if (
            Phaser.Math.Distance.Between(
                x,
                y,
                DOOR.x,
                DOOR.y
            ) < 85
        ) {
            return {
                id: 'exit',
                name: 'Ra ngoài'
            };
        }

        // Tim tram co the tuong tac
        return this.stations.find(p =>
            Phaser.Math.Distance.Between(
                x,
                y,
                p.x,
                p.y
            ) <= p.radius
        ) || null;
    }

    // Xu ly tuong tac chung
    interact() {
        const point = this.nearestInteraction();

        if (!point) return;

        if (point.id === 'exit') {
            this.leaveShop();
            return;
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
            { station: point.id }
        );
    }

    // Ra khoi Tiem thuoc
    leaveShop() {
        this.scene.start('WorldMapScene');
    }

    // Cap nhat di chuyen
    update(_time, delta) {
        const point = this.nearestInteraction();

        this.hint.setText(
            point
                ? `E: ${point.name}`
                : 'WASD: di chuyển'
        );

        // Nhan E de mo tram
        if (
            Phaser.Input.Keyboard.JustDown(
                this.keys.E
            )
        ) {
            this.interact();
            return;
        }

        let dx =
            Number(this.keys.D.isDown) -
            Number(this.keys.A.isDown);

        let dy =
            Number(this.keys.S.isDown) -
            Number(this.keys.W.isDown);

        const length = Math.hypot(dx, dy);

        if (length <= 0) {
            this.witch.anims.stop();
            this.witch.setTexture(
                this.facing,
                0
            );
            return;
        }

        dx /= length;
        dy /= length;

        const step =
            this.speed *
            Math.min(delta, 60) /
            1000;

        const oldX = this.witch.x;
        const oldY = this.witch.y;

        // Truot doc vat can theo tung truc
        if (
            this.canWalk(
                oldX + dx * step,
                oldY
            )
        ) {
            this.witch.x += dx * step;
        }

        if (
            this.canWalk(
                this.witch.x,
                oldY + dy * step
            )
        ) {
            this.witch.y += dy * step;
        }

        // Xu ly animation
        if (
            this.witch.x !== oldX ||
            this.witch.y !== oldY
        ) {
            this.facing =
                Math.abs(dx) > Math.abs(dy)
                    ? (dx > 0 ? 'right' : 'left')
                    : (dy > 0 ? 'down' : 'up');

            this.witch.anims.play(
                `walk_${this.facing}`,
                true
            );
            this.gameState.updatePlayerPose('ShopInteriorScene', this.witch, this.facing);

        } else {
            this.witch.anims.stop();
            this.witch.setTexture(
                this.facing,
                0
            );
        }
    }
}

