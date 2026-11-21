import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Kích thước thật của mỗi frame trong sprite sheet mới
        this.frameWidth = 48;
        this.frameHeight = 64;

        const sprites = {
            down: 'witch_down.png',   // nhìn xuống / chính diện
            up: 'witch_up.png',       // quay lưng
            left: 'witch_left.png',   // nhìn sang trái
            right: 'witch_right.png'  // nhìn sang phải
        };

        for (const direction in sprites) {
            this.load.spritesheet(
                direction,
                '/assets/sprites/' + sprites[direction],
                {
                    frameWidth: this.frameWidth,
                    frameHeight: this.frameHeight
                }
            );
        }
    }

    create() {
        this.cameras.main.setBackgroundColor('#536B5A');

        const width = this.scale.width;
        const height = this.scale.height;

        // Tạo nhân vật ở giữa màn hình
        this.witch = this.add.sprite(
            width / 2,
            height / 2,
            'down',
            0
        );

        // Vì sprite gốc rất to nên phải scale nhỏ lại
        this.witch.setScale(2);
        this.witch.setDepth(5);
        this.witch.setVisible(true);

        // Animation
        const directions = ['down', 'up', 'left', 'right'];

        for (const direction of directions) {
            const key = 'walk_' + direction;

            if (!this.anims.exists(key)) {
                this.anims.create({
                    key: key,
                    frames: this.anims.generateFrameNumbers(direction, {
                        start: 0,
                        end: 3
                    }),
                    frameRate: 6,
                    repeat: -1
                });
            }
        }

        // Bàn phím
        this.keys = this.input.keyboard.addKeys('W,A,S,D,E');

        this.speed = 160;
        this.direction = 'down';

        this.createJoystick();
        this.createBackButton();
        this.createInteractButton();

        this.resizeGame(this.scale.gameSize);

        this.scale.on('resize', this.resizeGame, this);

        this.events.once('shutdown', () => {
            this.scale.off('resize', this.resizeGame, this);
            this.resetJoystick();
        });
    }

    createJoystick() {
        this.joyX = 85;
        this.joyY = this.scale.height - 85;

        this.joyRadius = 45;
        this.joyDX = 0;
        this.joyDY = 0;
        this.joyPointer = null;

        this.joyBase = this.add.circle(
            this.joyX,
            this.joyY,
            55,
            0x48654B,
            0.35
        );

        this.joyBase.setStrokeStyle(3, 0x26372D, 0.6);
        this.joyBase.setDepth(10);
        this.joyBase.setScrollFactor(0);

        this.joyThumb = this.add.circle(
            this.joyX,
            this.joyY,
            23,
            0x48654B,
            0.9
        );

        this.joyThumb.setStrokeStyle(2, 0x26372D);
        this.joyThumb.setDepth(11);
        this.joyThumb.setScrollFactor(0);

        this.joyZone = this.add.zone(
            this.joyX,
            this.joyY,
            130,
            130
        );

        this.joyZone.setInteractive();
        this.joyZone.setDepth(12);
        this.joyZone.setScrollFactor(0);

        if (this.input.manager.pointers.length < 3) {
            this.input.addPointer(2);
        }

        this.joyZone.on('pointerdown', (pointer) => {
            if (this.joyPointer !== null) return;

            this.joyPointer = pointer.id;
            this.updateJoystick(pointer);
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer.id === this.joyPointer) {
                this.updateJoystick(pointer);
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (pointer.id === this.joyPointer) {
                this.resetJoystick();
            }
        });

        this.input.on('pointerupoutside', (pointer) => {
            if (pointer.id === this.joyPointer) {
                this.resetJoystick();
            }
        });
    }

    updateJoystick(pointer) {
        let dx = pointer.x - this.joyX;
        let dy = pointer.y - this.joyY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.joyRadius) {
            dx = (dx / distance) * this.joyRadius;
            dy = (dy / distance) * this.joyRadius;
        }

        this.joyThumb.setPosition(this.joyX + dx, this.joyY + dy);

        this.joyDX = dx / this.joyRadius;
        this.joyDY = dy / this.joyRadius;
    }

    resetJoystick() {
        this.joyPointer = null;
        this.joyDX = 0;
        this.joyDY = 0;

        if (this.joyThumb) {
            this.joyThumb.setPosition(this.joyX, this.joyY);
        }
    }

    createBackButton() {
        this.backButton = this.add.rectangle(
            80,
            32,
            140,
            48,
            0x26372D
        );

        this.backButton.setDepth(20);
        this.backButton.setScrollFactor(0);
        this.backButton.setInteractive({ useHandCursor: true });

        this.backText = this.add.text(
            80,
            32,
            '← Bản đồ',
            {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#FFFFFF'
            }
        );

        this.backText.setOrigin(0.5);
        this.backText.setDepth(21);
        this.backText.setScrollFactor(0);

        this.backButton.on('pointerdown', () => {
            this.scene.start('WorldMapScene');
        });
    }

    createInteractButton() {
        this.interactButton = this.add.circle(
            0,
            0,
            42,
            0x936C4C,
            0.95
        );

        this.interactButton.setStrokeStyle(3, 0xF1E4CB);
        this.interactButton.setDepth(20);
        this.interactButton.setScrollFactor(0);
        this.interactButton.setInteractive({ useHandCursor: true });

        this.interactText = this.add.text(
            0,
            0,
            '✋',
            {
                fontSize: '34px',
                align: 'center'
            }
        );

        this.interactText.setOrigin(0.5);
        this.interactText.setDepth(21);
        this.interactText.setScrollFactor(0);

        this.interactButton.on('pointerdown', () => {
            this.interactButton.setFillStyle(0xB58A68);
            this.interact();
        });

        this.interactButton.on('pointerup', () => {
            this.interactButton.setFillStyle(0x936C4C);
        });

        this.interactButton.on('pointerout', () => {
            this.interactButton.setFillStyle(0x936C4C);
        });
    }

    interact() {
        // để trống tạm
    }

    resizeGame(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;

        this.joyX = 85;
        this.joyY = height - 85;

        this.joyBase.setPosition(this.joyX, this.joyY);
        this.joyZone.setPosition(this.joyX, this.joyY);

        this.resetJoystick();

        this.backButton.setPosition(80, 32);
        this.backText.setPosition(80, 32);

        this.interactButton.setPosition(width - 85, height - 85);
        this.interactText.setPosition(width - 85, height - 85);

        this.clampPlayer();
    }

    clampPlayer() {
        const width = this.scale.width;
        const height = this.scale.height;

        const halfWidth = this.witch.displayWidth / 2;
        const halfHeight = this.witch.displayHeight / 2;

        this.witch.x = Phaser.Math.Clamp(
            this.witch.x,
            halfWidth,
            Math.max(halfWidth, width - halfWidth)
        );

        this.witch.y = Phaser.Math.Clamp(
            this.witch.y,
            halfHeight,
            Math.max(halfHeight, height - halfHeight)
        );
    }

    update(time, delta) {
        let dx = 0;
        let dy = 0;

        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
            this.interact();
        }

        if (this.keys.A.isDown) dx -= 1;
        if (this.keys.D.isDown) dx += 1;
        if (this.keys.W.isDown) dy -= 1;
        if (this.keys.S.isDown) dy += 1;

        if (dx === 0 && dy === 0) {
            dx = this.joyDX;
            dy = this.joyDY;
        }

        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0.15) {
            dx /= length;
            dy /= length;

            this.witch.x += dx * this.speed * delta / 1000;
            this.witch.y += dy * this.speed * delta / 1000;

            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? 'right' : 'left';
            } else {
                this.direction = dy > 0 ? 'down' : 'up';
            }

            this.witch.anims.play('walk_' + this.direction, true);
        } else {
            this.witch.anims.stop();
            this.witch.setTexture(this.direction, 0);
        }

        this.clampPlayer();
    }
}