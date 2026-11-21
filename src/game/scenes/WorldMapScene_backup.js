import Phaser from 'phaser';

// Little Alchemist: World Map prototype
// 80 x 60 tiles at 32px each: more real terrain, not an enlarged background image.
const TILE = 32;
const MAP_COLS = 80;
const MAP_ROWS = 60;
const MAP_WIDTH = MAP_COLS * TILE;
const MAP_HEIGHT = MAP_ROWS * TILE;

// Central landmarks (world coordinates, not screen coordinates).
const SHOP = { x: 430, y: 1390 };
const MUSHROOM = { x: 700, y: 465 };
const FLOWER = { x: 1930, y: 425 };
const ROCK = { x: 1700, y: 1000 };
const LAKE = { x: 2000, y: 1540 };
const MAILBOX = { x: 515, y: 1410 };

// All routes leave the front courtyard, then turn around the cottage.
// The house occupies approximately x=350..510 and y=1245..1410.
const SHOP_PATH_START = { x: SHOP.x, y: SHOP.y + 90 };
const LEFT_SIDE = [
    SHOP_PATH_START,
    { x: 330, y: 1510 },
    { x: 290, y: 1410 },
    { x: 285, y: 1250 },
    { x: 340, y: 1150 }
];
const RIGHT_SIDE = [
    SHOP_PATH_START,
    { x: 595, y: 1520 },
    { x: 635, y: 1420 },
    { x: 650, y: 1260 },
    { x: 720, y: 1150 }
];

const PATHS = {
    mushroom: [
        ...LEFT_SIDE,
        { x: 440, y: 1060 },
        { x: 570, y: 1000 },
        { x: 530, y: 770 },
        { x: 710, y: 625 },
        MUSHROOM
    ],
    flower: [
        ...RIGHT_SIDE,
        { x: 970, y: 980 },
        { x: 1230, y: 770 },
        { x: 1630, y: 600 },
        FLOWER
    ],
    rock: [
        ...RIGHT_SIDE,
        { x: 900, y: 1220 },
        { x: 1120, y: 1170 },
        ROCK
    ],
    lake: [
        ...RIGHT_SIDE,
        { x: 840, y: 1510 },
        { x: 1270, y: 1700 },
        { x: 1660, y: 1660 },
        LAKE
    ]
};

function noise(x, y) {
    let n = (x * 374761393 + y * 668265263) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax;
    const vy = by - ay;
    const t = Phaser.Math.Clamp(
        ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1),
        0, 1
    );
    return Phaser.Math.Distance.Between(px, py, ax + t * vx, ay + t * vy);
}

function distanceToPath(x, y, points) {
    let best = Infinity;
    for (let i = 1; i < points.length; i++) {
        best = Math.min(best, distanceToSegment(
            x, y, points[i - 1].x, points[i - 1].y,
            points[i].x, points[i].y
        ));
    }
    return best;
}

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
    }

    create() {
        this.cameras.main.setBackgroundColor('#241B32');
        this.modalOpen = false;
        this.speed = 160;
        this.colliders = [];
        this.lastFogX = null;
        this.lastFogY = null;
        this.spawn = { x: SHOP_PATH_START.x + 5, y: SHOP_PATH_START.y + 55 };
        this.facing = 'down';
        this.joyX = 85;
        this.joyY = 300;
        this.joyRadius = 42;
        this.joyDX = 0;
        this.joyDY = 0;
        this.joyPointer = null;

        // Everything on the world uses world coordinates.
        this.land = this.add.graphics().setDepth(-10);
        this.routes = this.add.graphics().setDepth(-8);
        this.decor = this.add.graphics().setDepth(-5);
        this.buildTerrain();
        this.buildPlaces();

        this.witch = this.add.sprite(this.spawn.x, this.spawn.y, 'down', 0)
            .setScale(1.5).setDepth(10);
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

        this.worldCamera = this.cameras.main;
        this.worldCamera.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
        this.worldCamera.startFollow(this.witch, true, 0.18, 0.18);
        this.worldCamera.setZoom(1);

        // Second camera for fixed-size UI even while the world camera zooms.
        this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        this.uiCamera.ignore([this.land, this.routes, this.decor, this.witch, this.fog]);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,E');
        this.createUI();
        this.resizeWorld(this.scale.gameSize);
        this.scale.on('resize', this.resizeWorld, this);

        this.input.on('wheel', (pointer, objects, dx, dy) => {
            this.adjustZoom(dy > 0 ? -0.1 : 0.1);
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.resizeWorld, this);
        });
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
        for (const [name, points] of Object.entries(PATHS)) {
            const visible = name === 'mushroom' ? 0x92715F : 0x92715F;
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

        // Forest details spread across map: keep paths readable.
        for (let y = 55; y < MAP_HEIGHT - 40; y += 55) {
            for (let x = 45; x < MAP_WIDTH - 40; x += 55) {
                const nx = x + (noise(x, y) - 0.5) * 22;
                const ny = y + (noise(x + 9, y + 6) - 0.5) * 22;
                const nearPath = Object.values(PATHS).some(path =>
                    distanceToPath(nx, ny, path) < 90
                );
                const nearPlace = [SHOP_PATH_START, MUSHROOM, FLOWER, ROCK, LAKE].some(p =>
                    Phaser.Math.Distance.Between(nx, ny, p.x, p.y) < 185
                );
                if (nearPath || nearPlace) continue;
                const r = noise(x + 13, y + 21);
                if (r > 0.29) this.drawTree(nx, ny, 0.8 + noise(x + 11, y) * 0.5);
                else if (r > 0.18) this.drawRock(nx, ny);
            }
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
        // Chỉ thân cây cản đường, không dùng toàn bộ tán cây.
        this.colliders.push({ x, y: y + 3 * size, radius: 14 * size });
    }

    drawRock(x, y) {
        this.decor.fillStyle(0x323747);
        this.decor.fillRoundedRect(x - 13, y - 11, 27, 20, 4);
        this.decor.fillStyle(0x68707A);
        this.decor.fillTriangle(x - 12, y - 9, x - 1, y - 19, x + 13, y - 9);
        this.colliders.push({ x, y: y - 4, radius: 17 });
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
        // Potion shop and readable mailbox in the initial clearing.
        g.fillStyle(0x272034, 0.3);
        g.fillEllipse(SHOP_PATH_START.x, SHOP_PATH_START.y - 19, 185, 38);
        g.fillStyle(0x765845);
        g.fillRect(SHOP_PATH_START.x - 65, SHOP_PATH_START.y - 130, 130, 104);
        g.fillStyle(0x9D8067);
        g.fillRect(SHOP_PATH_START.x - 56, SHOP_PATH_START.y - 123, 112, 91);
        g.fillStyle(0x4C2F68);
        g.fillTriangle(SHOP_PATH_START.x - 78, SHOP_PATH_START.y - 125, SHOP_PATH_START.x, SHOP_PATH_START.y - 208,
            SHOP_PATH_START.x + 78, SHOP_PATH_START.y - 125);
        g.lineStyle(5, 0xC9A16B);
        g.strokeTriangle(SHOP_PATH_START.x - 78, SHOP_PATH_START.y - 125, SHOP_PATH_START.x, SHOP_PATH_START.y - 208,
            SHOP_PATH_START.x + 78, SHOP_PATH_START.y - 125);
        g.fillStyle(0xE7B968);
        g.fillRect(SHOP_PATH_START.x - 40, SHOP_PATH_START.y - 91, 20, 24);
        g.fillStyle(0xE7B968);
        g.fillRect(SHOP_PATH_START.x + 20, SHOP_PATH_START.y - 91, 20, 24);
        g.fillStyle(0x4B304F);
        g.fillRect(SHOP_PATH_START.x - 12, SHOP_PATH_START.y - 73, 24, 48);
        g.fillStyle(0xE9C994);
        g.fillCircle(SHOP_PATH_START.x + 5, SHOP_PATH_START.y - 53, 3);
        
        // Chặn toàn bộ mái và thân Tiệm thuốc
        // Nhân vật chỉ có thể đứng trước cửa
        this.colliders.push({
            type: 'rect',
            left: SHOP_PATH_START.x - 80,
            right: SHOP_PATH_START.x + 80,
            top: SHOP_PATH_START.y - 210,
            bottom: SHOP_PATH_START.y - 45
        });


        // Mailbox: physical world object; quest workflow comes later.
        g.fillStyle(0x6C4A3C);
        g.fillRect(MAILBOX.x - 4, MAILBOX.y - 12, 8, 40);
        g.fillStyle(0x69417B);
        g.fillRoundedRect(MAILBOX.x - 21, MAILBOX.y - 38, 42, 30, 6);
        g.lineStyle(3, 0xE6C68B);
        g.strokeRoundedRect(MAILBOX.x - 21, MAILBOX.y - 38, 42, 30, 6);
        g.fillStyle(0xF2E4CB);
        g.fillRect(MAILBOX.x - 13, MAILBOX.y - 30, 26, 15);
        g.lineStyle(2, 0x946C7F);
        g.lineBetween(MAILBOX.x - 13, MAILBOX.y - 30, MAILBOX.x, MAILBOX.y - 21);
        g.lineBetween(MAILBOX.x + 13, MAILBOX.y - 30, MAILBOX.x, MAILBOX.y - 21);
        this.colliders.push({ x: MAILBOX.x, y: MAILBOX.y - 14, radius: 13 });

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
        for (let i = 0; i < 18; i++) {
            this.drawRock(ROCK.x + (noise(i, 99) - 0.5) * 300,
                ROCK.y + (noise(i, 54) - 0.5) * 210);
        }
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

        const spacing = 150;
        let id = 0;

    // Hai lớp mây đặt lệch nhau để che kín bản đồ
        for (let layer = 0; layer < 2; layer++) {
            const offset = layer === 0 ? 0 : 75;

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

                    cloud.setAlpha(0.9);
                    cloud.setScale(1.05 + variation * 0.2);

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

        if (distance < 12) return;

        this.lastFogX = x;
        this.lastFogY = y;

        const revealRadius = 155;

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

                duration: 1100,
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
    

    // Collision: đường rừng thực sự đi được, phần rừng dày chặn bước chân.
    // Phải có clearing cho từng địa điểm + sân nhà thuốc.
    canWalk(x, y) {
        const footX = x;
        const footY = y + 23;
        if (x < 35 || y < 45 || x > MAP_WIDTH - 35 || y > MAP_HEIGHT - 48) return false;

        const onTrail = Object.values(PATHS).some(path =>
            distanceToPath(footX, footY, path) <= 52
        );
        const onClearing = [
            { p: SHOP, radius: 177 },
            { p: MUSHROOM, radius: 145 },
            { p: FLOWER, radius: 145 },
            { p: ROCK, radius: 145 },
            { p: LAKE, radius: 148 }
        ].some(({ p, radius }) => Phaser.Math.Distance.Between(
            footX, footY, p.x, p.y
        ) <= radius);
        if (!onTrail && !onClearing) return false;

        for (const c of this.colliders) {
            if (c.type === 'rect') {
                const margin = 8;
                if (footX >= c.left - margin && footX <= c.right + margin &&
                    footY >= c.top - margin && footY <= c.bottom + margin) return false;
            } else {
                const dx = footX - c.x;
                const dy = footY - c.y;
                const radius = c.radius + 10;
                if (dx * dx + dy * dy < radius * radius) return false;
            }
        }
        const ex = (footX - LAKE.x) / 148;
        const ey = (footY - LAKE.y) / 93;
        if (ex * ex + ey * ey < 1) return false;
        return true;
    }

    createUI() {
        this.uiObjects = [];
        const addUI = (obj) => {
            obj.setScrollFactor(0).setDepth(100);
            this.worldCamera.ignore(obj);
            this.uiObjects.push(obj);
            return obj;
        };

        this.joyBase = addUI(this.add.circle(0, 0, 54, 0x563A6E, 0.6)
            .setStrokeStyle(3, 0xE7CFAE));
        this.joyThumb = addUI(this.add.circle(0, 0, 22, 0x926EAA)
            .setStrokeStyle(2, 0xE7CFAE));
        this.joyZone = addUI(this.add.zone(0, 0, 145, 145).setInteractive());
        if (this.input.manager.pointers.length < 3) this.input.addPointer(2);
        this.joyZone.on('pointerdown', pointer => {
            if (this.joyPointer !== null) return;
            this.joyPointer = pointer.id;
            this.updateJoystick(pointer);
        });
        this.input.on('pointermove', pointer => {
            if (pointer.id === this.joyPointer) this.updateJoystick(pointer);
        });
        this.input.on('pointerup', pointer => {
            if (pointer.id === this.joyPointer) this.resetJoystick();
        });
        this.input.on('pointerupoutside', pointer => {
            if (pointer.id === this.joyPointer) this.resetJoystick();
        });

        this.interactButton = addUI(this.add.circle(0, 0, 38, 0x74518B)
            .setStrokeStyle(3, 0xE8CDA8).setInteractive({ useHandCursor: true }));
        this.interactIcon = addUI(this.add.text(0, 0, '✋', { fontSize: '30px' })
            .setOrigin(0.5));
        this.interactButton.on('pointerdown', () => this.interact());

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
            'Tiệm thuốc  •  E: Hòm thư', {
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

    updateJoystick(pointer) {
        let dx = pointer.x - this.joyX;
        let dy = pointer.y - this.joyY;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > this.joyRadius) {
            dx *= this.joyRadius / length;
            dy *= this.joyRadius / length;
        }
        this.joyDX = dx / this.joyRadius;
        this.joyDY = dy / this.joyRadius;
        this.joyThumb.setPosition(this.joyX + dx, this.joyY + dy);
    }

    resetJoystick() {
        this.joyPointer = null;
        this.joyDX = 0;
        this.joyDY = 0;
        if (this.joyThumb) this.joyThumb.setPosition(this.joyX, this.joyY);
    }

    resizeWorld(size) {
        const w = size.width;
        const h = size.height;
        this.uiCamera.setSize(w, h);
        this.worldCamera.setSize(w, h);
        this.worldCamera.setDeadzone(w * 0.43, h * 0.38);
        this.joyX = 86;
        this.joyY = h - 86;
        this.joyBase.setPosition(this.joyX, this.joyY);
        this.joyZone.setPosition(this.joyX, this.joyY);
        this.resetJoystick();
        this.interactButton.setPosition(w - 79, h - 84);
        this.interactIcon.setPosition(w - 79, h - 84);
        this.zoomIn.setPosition(w - 42, 45);
        this.zoomOut.setPosition(w - 42, 100);
        this.zoomValue.setPosition(w - 42, 143);
        this.infoText.setPosition(w / 2, 10);
        this.modalBg.setPosition(w / 2, h / 2);
        this.modalText.setPosition(w / 2, h / 2);
        this.modalClose.setPosition(w / 2 + 143, h / 2 - 60);
    }

    adjustZoom(amount) {
        const old = this.worldCamera.zoom;
        const next = Phaser.Math.Clamp(Math.round((old + amount) * 100) / 100, 0.75, 1.7);
        this.worldCamera.setZoom(next);
        this.zoomValue.setText(next.toFixed(2) + '×');
    }

    interact() {
        if (this.modalOpen) {
            this.closeModal();
            return;
        }
        const distance = Phaser.Math.Distance.Between(
            this.witch.x, this.witch.y, MAILBOX.x, MAILBOX.y
        );
        if (distance <= 95) {
            this.modalOpen = true;
            this.resetJoystick();
            this.modalBg.setVisible(true);
            this.modalText.setVisible(true);
            this.modalClose.setVisible(true);
        }
    }

    closeModal() {
        this.modalOpen = false;
        this.modalBg.setVisible(false);
        this.modalText.setVisible(false);
        this.modalClose.setVisible(false);
    }

    update(time, delta) {
        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.interact();

        if (this.modalOpen) return;
        let dx = 0;
        let dy = 0;
        if (this.keys.A.isDown) dx--;
        if (this.keys.D.isDown) dx++;
        if (this.keys.W.isDown) dy--;
        if (this.keys.S.isDown) dy++;
        if (dx === 0 && dy === 0) {
            dx = this.joyDX;
            dy = this.joyDY;
        }
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0.15) {
            dx /= length;
            dy /= length;
            const seconds = Math.min(delta, 60) / 1000;
            const nx = this.witch.x + dx * this.speed * seconds;
            const ny = this.witch.y + dy * this.speed * seconds;
            // Trượt dọc cạnh vật cản; không phát animation đi khi hoàn toàn bị chặn.
            const oldX = this.witch.x;
            const oldY = this.witch.y;
            if (this.canWalk(nx, this.witch.y)) this.witch.x = nx;
            if (this.canWalk(this.witch.x, ny)) this.witch.y = ny;
            const didMove = Phaser.Math.Distance.Between(
                oldX, oldY, this.witch.x, this.witch.y) > 0.01;
            if (didMove) {
                this.revealAlongMovement(this.witch.x, this.witch.y);
                this.facing = Math.abs(dx) > Math.abs(dy)
                    ? (dx > 0 ? 'right' : 'left')
                    : (dy > 0 ? 'down' : 'up');
                this.witch.anims.play('walk_' + this.facing, true);
            } else {
                this.witch.anims.stop();
                this.witch.setTexture(this.facing, 0);
            }
        } else {
            this.witch.anims.stop();
            this.witch.setTexture(this.facing, 0);
        }
    }
}