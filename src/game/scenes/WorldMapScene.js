import Phaser from 'phaser';

import { createExplorationCamera } from '../exploration/ExplorationCamera.js';
import { createExplorationControls, facingFor, movementVector } from '../exploration/ExplorationControls.js';
import { createExplorationDebug } from '../exploration/ExplorationDebug.js';
import { createCollision, findInteraction } from '../exploration/ExplorationGeometry.js';
import { groundPosition, sortByGround } from '../exploration/GroundDepth.js';
import {
    FLOWER, HOUSE, LAKE, LANDMARK_ROCKS, MAILBOX, MAILBOX_GROUND_OFFSET,
    MAP_COLS, MAP_HEIGHT, MAP_ROWS, MAP_WIDTH, MUSHROOM, PATHS, SHOP, SHOP_PATH_START, TILE,
    WORLD_FOREST_PROPS, WORLD_WITCH_GROUND_OFFSET, WORLD_WITCH_SCALE, noise, worldGeometry
} from '../maps/worldMapData.js';

export default class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMapScene');
    }

    preload() {
        const sprites = {
            down: 'witch_down.png',
            up: 'witch_up.png',
            left: 'witch_left.png',
            right: 'witch_right.png'
        };
        for (const direction in sprites) {
            if (!this.textures.exists(direction)) {
                this.load.spritesheet(direction, '/assets/sprites/' + sprites[direction], {
                    frameWidth: 48,
                    frameHeight: 64
                });
            }
        }

    this.load.image(
        'potionShop',
        '/assets/objects/potion_shop.png'
    );

    this.load.image(
        'mailboxSprite',
        '/assets/objects/mailbox.png'
    );

    this.load.image(
        'wisteriaPergola',
        '/assets/objects/wisteria_pergola.png'
    );

    this.load.image(
        'woodenBridge',
        '/assets/objects/wooden_bridge.png'
    );
}

    create() {
        this.cameras.main.setBackgroundColor('#241B32');
        this.modalOpen = false;
        this.speed = 160;
        this.collision = createCollision(worldGeometry);
        this.lastFogX = null;
        this.lastFogY = null;
        this.gameState = this.registry.get('gameState');
        const { position, facing } = this.gameState.enterScene('WorldMapScene');
        this.facing = facing;

        // Everything on the world uses world coordinates.
        this.land = this.add.graphics().setDepth(-10);
        this.routes = this.add.graphics().setDepth(-8);
        this.decor = this.add.graphics().setDepth(-5);
        this.buildTerrain();
        this.buildPlaces();

        // Tiệm thuốc pixel art
        this.shopSprite = this.add.image(
            HOUSE.x,
            HOUSE.y,
            'potionShop'
        );

        this.shopSprite.setOrigin(0.5, 1).setScale(HOUSE.scale);
        this.shopSprite.setDepth(2);
        // Hòm thư pixel art
        this.mailboxSprite = this.add.image(
            MAILBOX.x,
            MAILBOX.y,
            'mailboxSprite'
        );

        this.mailboxSprite.setOrigin(0.5, 1);
        this.mailboxSprite.setScale(MAILBOX.scale);
        sortByGround(this.mailboxSprite, MAILBOX_GROUND_OFFSET);

        this.witch = this.add.sprite(position.x, position.y, facing, 0)
            .setScale(WORLD_WITCH_SCALE);
        sortByGround(this.witch, WORLD_WITCH_GROUND_OFFSET);
        for (const dir of ['down', 'up', 'left', 'right']) {
            const name = 'walk_' + dir;
            if (!this.anims.exists(name)) {
                this.anims.create({
                    key: name,
                    frames: this.anims.generateFrameNumbers(dir, { start: 0, end: 3 }),
                    frameRate: 8,
                    repeat: -1
                });
            }
        }

        // Lớp sương mù riêng, mềm và được xóa theo bước chân.
        this.createFog();

        this.camera = createExplorationCamera(this, this.witch, {
            bounds: { width: MAP_WIDTH, height: MAP_HEIGHT },
            zoom: 1,
            zoomLimits: { min: 0.75, max: 1.7 },
            deadzone: { x: 0.43, y: 0.38 }
        });
        this.camera.ui.ignore([this.land, this.routes, this.decor, this.witch, this.fog,
            this.shopSprite, this.mailboxSprite]);
        this.keys = this.input.keyboard.addKeys('W,A,S,D,E');
        this.createUI();
        this.debug = createExplorationDebug(this, this.camera.ui, worldGeometry);
        this.camera.start((width, height) => this.layoutUI(width, height));

        const onWheel = (_pointer, _objects, _dx, dy) => this.adjustZoom(dy > 0 ? -0.1 : 0.1);
        this.input.on('wheel', onWheel);
        this.events.once('shutdown', () => this.input.off('wheel', onWheel));
    }

    buildTerrain() {
        // Pixel-aligned base terrain (80 x 60 separate tiles).
        const grass = [0x344B42, 0x3A5145, 0x405849, 0x31463F];
        for (let ty = 0; ty < MAP_ROWS; ty++) {
            for (let tx = 0; tx < MAP_COLS; tx++) {
                const x = tx * TILE;
                const y = ty * TILE;
                this.land.fillStyle(grass[Math.floor(noise(tx, ty) * grass.length)]);
                this.land.fillRect(x, y, TILE, TILE);
                if (noise(tx + 101, ty + 89) > 0.70) {
                    this.land.fillStyle(0x61735C, 0.35);
                    this.land.fillRect(x + 7, y + 7, 3, 7);
                    this.land.fillRect(x + 13, y + 10, 3, 4);
                }
            }
        }

        // Routes are added as new terrain, NOT the old background enlarged.
        for (const points of Object.values(PATHS)) {
            for (let i = 1; i < points.length; i++) {
                const a = points[i - 1];
                const b = points[i];
                const length = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
                for (let j = 0; j <= length; j += 7) {
                    const t = j / Math.max(1, length);
                    const x = Phaser.Math.Linear(a.x, b.x, t);
                    const y = Phaser.Math.Linear(a.y, b.y, t);
                    this.routes.fillStyle(0x745E53);
                    this.routes.fillCircle(x, y, 30);
                    this.routes.fillStyle(0xAB8A6C);
                    this.routes.fillCircle(x, y, 24);
                }
            }
        }

        this.routes.fillStyle(0xAD8D6E);
        this.routes.fillCircle(SHOP_PATH_START.x, SHOP_PATH_START.y + 35, 175);

        for (const { type, x, y, size } of WORLD_FOREST_PROPS) {
            if (type === 'tree') this.drawTree(x, y, size);
            else this.drawRock(x, y);
        }
    }

    drawTree(x, y, size) {
        const g = this.decor;
        g.fillStyle(0x201F32, 0.35);
        g.fillEllipse(x, y + 7 * size, 48 * size, 17 * size);
        g.fillStyle(0x674F42);
        g.fillRect(x - 4 * size, y - 6 * size, 8 * size, 20 * size);
        g.fillStyle(0x183C3A);
        g.fillTriangle(x, y - 52 * size, x - 23 * size, y - 10 * size,
            x + 23 * size, y - 10 * size);
        g.fillStyle(0x286053);
        g.fillTriangle(x, y - 39 * size, x - 25 * size, y + 2 * size,
            x + 25 * size, y + 2 * size);
        g.fillStyle(0x3D7863, 0.65);
        g.fillTriangle(x, y - 44 * size, x - 7 * size, y - 22 * size,
            x + 5 * size, y - 21 * size);
    }

    drawRock(x, y) {
        this.decor.fillStyle(0x323747);
        this.decor.fillRoundedRect(x - 13, y - 11, 27, 20, 4);
        this.decor.fillStyle(0x68707A);
        this.decor.fillTriangle(x - 12, y - 9, x - 1, y - 19, x + 13, y - 9);
    }

    drawMushroom(x, y, scale, glow = false) {
        const g = this.decor;
        if (glow) {
            g.fillStyle(0x7A6FD6, 0.18);
            g.fillCircle(x, y - 5 * scale, 28 * scale);
        }
        g.fillStyle(0xD4B89D);
        g.fillRect(x - 5 * scale, y - 7 * scale, 10 * scale, 17 * scale);
        g.fillStyle(glow ? 0x927AC6 : 0xA34E69);
        g.fillEllipse(x, y - 10 * scale, 36 * scale, 22 * scale);
        g.fillStyle(0xF2E1CB);
        g.fillCircle(x - 8 * scale, y - 13 * scale, 3 * scale);
        g.fillCircle(x + 7 * scale, y - 10 * scale, 3 * scale);
    }

    buildPlaces() {
        const g = this.decor;

        // Far-off destinations on genuinely separated coordinates.
        for (let i = 0; i < 12; i++) {
            const angle = i * Math.PI / 6;
            const x = MUSHROOM.x + Math.cos(angle) * (85 + i % 3 * 22);
            const y = MUSHROOM.y + Math.sin(angle) * (85 + i % 3 * 18);
            this.drawMushroom(x, y, 1.2 + (i % 2) * 0.3, i % 3 === 0);
        }
        for (let i = 0; i < 20; i++) {
            const x = FLOWER.x + (noise(i * 11, 31) - 0.5) * 290;
            const y = FLOWER.y + (noise(i * 7, 15) - 0.5) * 240;
            g.fillStyle(i % 3 === 0 ? 0xC3A0D1 : 0xE6C7CE);
            g.fillCircle(x, y, 6);
            g.fillStyle(0xEAD69B);
            g.fillCircle(x, y, 2);
        }
        for (const { x, y } of LANDMARK_ROCKS) this.drawRock(x, y);
        g.fillStyle(0x265B73);
        g.fillEllipse(LAKE.x, LAKE.y, 300, 190);
        g.fillStyle(0x5F8E9C, 0.4);
        g.fillEllipse(LAKE.x, LAKE.y, 245, 135);
        g.fillStyle(0x6B967F);
        g.fillEllipse(LAKE.x - 45, LAKE.y + 23, 34, 16);
    }

    // Toàn bản đồ có sương mù. Chỉ sân Tiệm thuốc và các lối đã đi qua được hé lộ.
    // Texture sương dùng pixel resolution thấp để tiết kiệm RAM; rìa tán mịn.
    
    createFog() {
    // Tạo texture mây với rìa mềm
        const fogKey = 'fogCloudV04';

        if (!this.textures.exists(fogKey)) {
            const texture = this.textures.createCanvas(
                fogKey, 256, 256
            );

            const ctx = texture.context;

            const gradient = ctx.createRadialGradient(
                128, 128, 15,
                128, 128, 128
            );

            gradient.addColorStop(0, 'rgba(95, 84, 112, 1)');
            gradient.addColorStop(0.45, 'rgba(105, 95, 122, 0.98)');
            gradient.addColorStop(0.72, 'rgba(123, 113, 138, 0.78)');
            gradient.addColorStop(1, 'rgba(140, 130, 151, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 256);

            texture.refresh();
        }

    // Container giúp mây phủ theo tọa độ toàn bản đồ
        this.fog = this.add.container(0, 0);
        this.fog.setDepth(50);

        this.fogClouds = [];
        this.fogCleared = new Set(
            this.registry.get('worldFogClearedV04') || []
        );

        const spacing = 250;
        let id = 0;

    // Hai lớp mây đặt lệch nhau để che kín bản đồ
        for (let layer = 0; layer < 2; layer++) {
            const offset = layer === 0 ? 0 : spacing / 2;

            for (let y = -180; y < MAP_HEIGHT + 180; y += spacing) {
                for (let x = -180; x < MAP_WIDTH + 180; x += spacing) {
                    const cloudId = id++;

                    if (this.fogCleared.has(cloudId)) {
                        continue;
                    }

                    const cloudX = x + offset;
                    const cloudY = y + offset;

                // Sân Tiệm thuốc sáng ngay từ đầu
                    const distanceToShop = Phaser.Math.Distance.Between(
                        cloudX, cloudY,
                        SHOP.x, SHOP.y + 20
                    );

                    if (distanceToShop < 230) {
                        continue;
                    }

                    const variation = noise(
                        cloudId + 17, layer + 9
                    );

                    const cloud = this.add.image(
                        cloudX, cloudY, fogKey
                );

                    cloud.setAlpha(0.6);
                    cloud.setScale(1.15 + variation * 0.4);

                    this.fog.add(cloud);

                    this.fogClouds.push({
                        id: cloudId,
                        sprite: cloud,
                        x: cloudX,
                        y: cloudY,
                        clearing: false
                    });
                }
            }
        }

        this.lastFogX = this.witch.x;
        this.lastFogY = this.witch.y;
    }

    revealAlongMovement(x, y) {
        const distance = Phaser.Math.Distance.Between(
            x, y,
            this.lastFogX,
            this.lastFogY
        );

        if (distance < 7) return;

        this.lastFogX = x;
        this.lastFogY = y;

        const revealRadius = 275;

        for (const fog of this.fogClouds) {
            if (fog.clearing) continue;

            const dx = fog.x - x;
            const dy = fog.y - y;

            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > revealRadius) continue;

            fog.clearing = true;

            // Mây bay tránh sang hai bên nhân vật
            const directionX = dx >= 0 ? 1 : -1;
            const directionY = dy >= 0 ? 1 : -1;

            this.tweens.add({
                targets: fog.sprite,

                x: fog.x + directionX * 95,
                y: fog.y + directionY * 35,

                alpha: 0,

                duration: 900,
                ease: 'Sine.easeOut',

                onComplete: () => {
                    fog.sprite.destroy();

                    this.fogCleared.add(fog.id);

                    this.registry.set(
                        'worldFogClearedV04',
                        [...this.fogCleared]
                    );
                }
            });
        }
    }
    

    getFootPosition() {
        return groundPosition(this.witch, WORLD_WITCH_GROUND_OFFSET);
    }

    interactionAtFoot() {
        return findInteraction(this.getFootPosition(), worldGeometry.zones, this.collision.canStand);
    }

    createUI() {
        const addUI = obj => {
            obj.setScrollFactor(0).setDepth(100);
            this.camera.world.ignore(obj);
            return obj;
        };
        this.controls = createExplorationControls(this, addUI, () => this.interact());

        this.zoomIn = addUI(this.add.text(0, 0, '+', {
            fontFamily: 'Arial', fontSize: '29px', fontStyle: 'bold', color: '#FFF0DC',
            backgroundColor: '#513665', padding: { x: 12, y: 3 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        this.zoomOut = addUI(this.add.text(0, 0, '−', {
            fontFamily: 'Arial', fontSize: '29px', fontStyle: 'bold', color: '#FFF0DC',
            backgroundColor: '#513665', padding: { x: 12, y: 3 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        this.zoomValue = addUI(this.add.text(0, 0, '1.0×', {
            fontFamily: 'Arial', fontSize: '14px', color: '#FFF0DC'
        }).setOrigin(0.5));
        this.zoomIn.on('pointerdown', () => this.adjustZoom(0.15));
        this.zoomOut.on('pointerdown', () => this.adjustZoom(-0.15));

        this.infoText = addUI(this.add.text(0, 0,
            'Tiệm thuốc', {
                fontFamily: 'Arial', fontSize: '15px', color: '#F5E6D1',
                backgroundColor: '#392747', padding: { x: 10, y: 7 }
            }).setOrigin(0.5, 0));

        this.modalBg = addUI(this.add.rectangle(0, 0, 330, 144, 0x2E203E, 0.97)
            .setStrokeStyle(3, 0xE8CDA8)).setVisible(false);
        this.modalText = addUI(this.add.text(0, 0,
            'HÒM THƯ ĐƠN HÀNG\n\nĐơn đầu tiên: 2 Nấm Ánh Dương\n(Chức năng giao hàng sẽ bổ sung sau)', {
                fontFamily: 'Arial', fontSize: '15px', color: '#F5E6D1',
                align: 'center', wordWrap: { width: 292 }
            }).setOrigin(0.5)).setVisible(false);
        this.modalClose = addUI(this.add.text(0, 0, '✕', {
            fontSize: '22px', color: '#F5E6D1'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })).setVisible(false);
        this.modalClose.on('pointerdown', () => this.closeModal());
    }

    layoutUI(w, h) {
        this.controls.resize(w, h);
        this.debug.resize(h);
        this.zoomValue.setText(this.camera.world.zoom.toFixed(2) + '×');
        this.zoomIn.setPosition(w - 42, 45);
        this.zoomOut.setPosition(w - 42, 100);
        this.zoomValue.setPosition(w - 42, 143);
        this.infoText.setPosition(w / 2, 10);
        this.modalBg.setPosition(w / 2, h / 2);
        this.modalText.setPosition(w / 2, h / 2);
        this.modalClose.setPosition(w / 2 + 143, h / 2 - 60);
    }

    adjustZoom(amount) {
        const zoom = this.camera.adjustZoom(amount);
        this.zoomValue.setText(zoom.toFixed(2) + '×');
    }

    interact() {
        if (this.modalOpen) {
            this.closeModal();
            return true;
        }

        const zone = this.interactionAtFoot();
        if (!zone) return false;
        this.controls.reset();
        if (zone.id === 'mailbox') {
            this.modalOpen = true;
            this.modalBg.setVisible(true);
            this.modalText.setVisible(true);
            this.modalClose.setVisible(true);
        } else {
            this.scene.start('ShopInteriorScene');
        }
        return true;
    }

    closeModal() {
        this.modalOpen = false;
        this.modalBg.setVisible(false);
        this.modalText.setVisible(false);
        this.modalClose.setVisible(false);
    }

    update(_time, delta) {
        const zone = this.interactionAtFoot();
        this.infoText.setText(zone ? 'E: ' + zone.name : 'Tiệm thuốc');
        this.debug.update(this.getFootPosition());
        if (Phaser.Input.Keyboard.JustDown(this.keys.E) && this.interact()) return;
        if (this.modalOpen) return;

        const vector = movementVector(this.keys, this.controls.vector);
        if (vector) {
            const previous = this.getFootPosition();
            const distance = this.speed * Math.min(delta, 60) / 1000;
            const next = this.collision.move(previous, vector.x * distance, vector.y * distance);
            if (next.x !== previous.x || next.y !== previous.y) {
                this.witch.setPosition(next.x, next.y - WORLD_WITCH_GROUND_OFFSET.y);
                sortByGround(this.witch, WORLD_WITCH_GROUND_OFFSET);
                this.facing = facingFor(vector);
                this.witch.anims.play('walk_' + this.facing, true);
                this.revealAlongMovement(this.witch.x, this.witch.y);
                this.gameState.updatePlayerPose('WorldMapScene', this.witch, this.facing);
                return;
            }
        }
        this.witch.anims.stop();
        this.witch.setTexture(this.facing, 0);
    }
}
