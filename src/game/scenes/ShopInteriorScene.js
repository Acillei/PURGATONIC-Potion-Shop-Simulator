
import Phaser from 'phaser';

// Little Alchemist - Ben trong Tiem thuoc
// Phien ban thu nghiem, chua can asset noi that rieng

const WIDTH = 960;
const HEIGHT = 640;
const DOOR = { x: 480, y: 562 };

export default class ShopInteriorScene extends Phaser.Scene {
    constructor() {
        super('ShopInteriorScene');
    }

    preload() {
        for (const dir of ['down', 'up', 'left', 'right']) {
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
        this.cameras.main.setBackgroundColor('#241b32');

        this.speed = 160;
        this.facing = 'down';
        this.keys = this.input.keyboard.addKeys('W,A,S,D,E');

        // Cac khu vuc chan nhan vat
        this.blockers = [
            { left: 108, right: 325, top: 210, bottom: 330 },
            { left: 625, right: 853, top: 210, bottom: 330 },
            { left: 348, right: 612, top: 274, bottom: 384 },
            { left: 132, right: 300, top: 402, bottom: 480 },
            { left: 660, right: 829, top: 402, bottom: 480 }
        ];

        const g = this.add.graphics();

        // Nen phong
        g.fillStyle(0x241b32);
        g.fillRect(0, 0, WIDTH, HEIGHT);

        // Khung phong
        g.fillStyle(0x665041);
        g.fillRoundedRect(64, 90, 832, 492, 18);

        // San go
        g.fillStyle(0xaa8463);
        g.fillRect(92, 181, 776, 389);

        for (let y = 190; y < 570; y += 28) {
            g.lineStyle(2, 0x7f5c4a, 0.55);
            g.lineBetween(92, y, 868, y);
        }

        for (let x = 112; x < 868; x += 105) {
            g.lineStyle(2, 0x7f5c4a, 0.35);
            g.lineBetween(x, 190, x, 560);
        }

        // Tuong sau
        g.fillStyle(0x4a3653);
        g.fillRect(92, 106, 776, 80);

        g.fillStyle(0xc3a179);
        g.fillRect(92, 177, 776, 11);

        // Cua so
        for (const x of [235, 725]) {
            g.fillStyle(0x594260);
            g.fillRoundedRect(x - 40, 116, 80, 56, 8);

            g.fillStyle(0xe6c996);
            g.fillRect(x - 29, 124, 58, 40);

            g.lineStyle(4, 0x6a4a61);
            g.lineBetween(x, 124, x, 164);
        }

        // Ke thuoc
        for (const area of [
            this.blockers[0],
            this.blockers[1]
        ]) {
            g.fillStyle(0x49312f);
            g.fillRoundedRect(
                area.left,
                area.top,
                area.right - area.left,
                area.bottom - area.top,
                8
            );

            g.fillStyle(0x9a694b);
            g.fillRect(
                area.left + 8,
                area.top + 22,
                area.right - area.left - 16,
                12
            );

            g.fillRect(
                area.left + 8,
                area.top + 74,
                area.right - area.left - 16,
                12
            );

            // Lo thuoc tren ke
            for (let i = 0; i < 5; i++) {
                const bx = area.left + 26 + i * 36;

                g.fillStyle(
                    i % 2 ? 0x8ebbb0 : 0xb58ac9
                );

                g.fillRoundedRect(
                    bx,
                    area.top + 44,
                    17,
                    26,
                    5
                );

                g.fillStyle(0xe7d0a0);
                g.fillRect(
                    bx + 5,
                    area.top + 39,
                    7,
                    6
                );
            }
        }

        // Ban pha che
        g.fillStyle(0x563e35);
        g.fillRoundedRect(348, 274, 264, 110, 12);

        g.fillStyle(0xb58b66);
        g.fillRoundedRect(360, 281, 240, 84, 9);

        // Vac thuoc
        g.fillStyle(0x433e53);
        g.fillEllipse(480, 315, 82, 58);

        g.fillStyle(0x77b4a9);
        g.fillEllipse(480, 309, 59, 30);

        g.fillStyle(0xc4e4c6, 0.6);
        g.fillCircle(465, 303, 6);

        g.fillStyle(0xdfc79f);
        g.fillCircle(495, 310, 4);

        // Tu luu tru
        for (const area of this.blockers.slice(3)) {
            g.fillStyle(0x604137);
            g.fillRoundedRect(
                area.left,
                area.top,
                area.right - area.left,
                area.bottom - area.top,
                8
            );

            g.fillStyle(0xa77b55);
            g.fillRect(
                area.left + 8,
                area.top + 7,
                area.right - area.left - 16,
                13
            );
        }

        // Cua ra ngoai
        g.fillStyle(0x3e2847);
        g.fillRect(428, 562, 104, 35);

        g.fillStyle(0xb48c65);
        g.fillRect(440, 570, 80, 12);

        g.lineStyle(3, 0xe3c99e);
        g.strokeRect(428, 562, 104, 35);

        // Tao animation cho phu thuy
        for (const dir of ['down', 'up', 'left', 'right']) {
            const anim = 'walk_' + dir;

            if (!this.anims.exists(anim)) {
                this.anims.create({
                    key: anim,
                    frames: this.anims.generateFrameNumbers(
                        dir,
                        { start: 0, end: 3 }
                    ),
                    frameRate: 8,
                    repeat: -1
                });
            }
        }

        // Tao nhan vat
        this.witch = this.add.sprite(
            480,
            501,
            'down',
            0
        );

        this.witch.setScale(1.5);
        this.witch.setDepth(10);

        // Tieu de
        this.title = this.add.text(
            WIDTH / 2,
            35,
            'TIỆM THUỐC',
            {
                fontFamily: 'Arial',
                fontSize: '28px',
                fontStyle: 'bold',
                color: '#f2dcb6'
            }
        ).setOrigin(0.5);

        // Huong dan
        this.hint = this.add.text(
            WIDTH / 2,
            609,
            'WASD: Di chuyển | Đến cửa và nhấn E để ra sân',
            {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#f2dcb6'
            }
        ).setOrigin(0.5);

        // Nut ra ngoai
        this.exitButton = this.add.text(
            841,
            39,
            'RA NGOÀI',
            {
                fontFamily: 'Arial',
                fontSize: '17px',
                fontStyle: 'bold',
                color: '#fff0db',
                backgroundColor: '#5d3e71',
                padding: {
                    x: 11,
                    y: 8
                }
            }
        );

        this.exitButton.setOrigin(0.5);
        this.exitButton.setInteractive({
            useHandCursor: true
        });

        this.exitButton.on('pointerdown', () => {
            this.leaveShop();
        });

        // Responsive
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

    resizeScene(size) {
        const zoom = Math.min(
            size.width / WIDTH,
            size.height / HEIGHT
        );

        this.cameras.main.setSize(
            size.width,
            size.height
        );

        this.cameras.main.setZoom(zoom);

        this.cameras.main.centerOn(
            WIDTH / 2,
            HEIGHT / 2
        );
    }

    // Kiem tra va cham
    canWalk(x, y) {
        const footY = y + 22;

        // Khong di xuyen tuong
        if (
            x < 113 ||
            x > 847 ||
            footY < 207 ||
            footY > 568
        ) {
            return false;
        }

        // Khong di xuyen do dac
        for (const b of this.blockers) {
            if (
                x > b.left - 14 &&
                x < b.right + 14 &&
                footY > b.top - 8 &&
                footY < b.bottom + 8
            ) {
                return false;
            }
        }

        return true;
    }

    // Tro ve World Map
    leaveShop() {
        this.scene.start(
            'WorldMapScene',
            { fromShop: true }
        );
    }

    update(_time, delta) {
        // Nhan E gan cua de ra ngoai
        if (
            Phaser.Input.Keyboard.JustDown(this.keys.E) &&
            Phaser.Math.Distance.Between(
                this.witch.x,
                this.witch.y,
                DOOR.x,
                DOOR.y
            ) < 90
        ) {
            this.leaveShop();
            return;
        }

        // Di chuyen WASD
        let dx =
            Number(this.keys.D.isDown) -
            Number(this.keys.A.isDown);

        let dy =
            Number(this.keys.S.isDown) -
            Number(this.keys.W.isDown);

        const length = Math.hypot(dx, dy);

        if (length > 0) {
            dx /= length;
            dy /= length;

            const seconds = Math.min(delta, 60) / 1000;

            const nx =
                this.witch.x + dx * this.speed * seconds;

            const ny =
                this.witch.y + dy * this.speed * seconds;

            const ox = this.witch.x;
            const oy = this.witch.y;

            // Va cham theo tung truc
            if (this.canWalk(nx, this.witch.y)) {
                this.witch.x = nx;
            }

            if (this.canWalk(this.witch.x, ny)) {
                this.witch.y = ny;
            }

            // Animation
            if (
                this.witch.x !== ox ||
                this.witch.y !== oy
            ) {
                this.facing =
                    Math.abs(dx) > Math.abs(dy)
                        ? (dx > 0 ? 'right' : 'left')
                        : (dy > 0 ? 'down' : 'up');

                this.witch.anims.play(
                    'walk_' + this.facing,
                    true
                );
            } else {
                this.witch.anims.stop();
                this.witch.setTexture(
                    this.facing,
                    0
                );
            }
        } else {
            this.witch.anims.stop();
            this.witch.setTexture(
                this.facing,
                0
            );
        }
    }
}
