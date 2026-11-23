
import Phaser from 'phaser';

const W = 960;
const H = 640;
const SPAWN = { position: { x: 724, y: 960 }, facing: 'up' };

const STATIONS = {
    brewing: {
        title: 'VẠC NẤU THUỐC',
        subtitle: 'Nơi kết hợp nguyên liệu và pha chế thuốc'
    },
    preparation: {
        title: 'BÀN SƠ CHẾ',
        subtitle: 'Chuẩn bị nguyên liệu trước khi nấu'
    },
    storage: {
        title: 'RƯƠNG NGUYÊN LIỆU',
        subtitle: 'Xem và sắp xếp nguyên liệu đang có'
    },
    reception: {
        title: 'QUẦY LỄ TÂN',
        subtitle: 'Tiếp khách, quản lý đơn và thuốc thành phẩm'
    }
};

export default class WorkstationScene extends Phaser.Scene {
    constructor() {
        super('WorkstationScene');
    }

    init(data = {}) {
        this.gameState = this.registry.get('gameState');
        const station = Object.hasOwn(STATIONS, data.station) ? data.station : undefined;
        this.stationId = this.gameState.enterScene('WorkstationScene', SPAWN, station).station;
    }

    create() {
        const station = STATIONS[this.stationId];

        this.cameras.main.setBackgroundColor('#211a2b');

        this.escKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC
        );

        const g = this.add.graphics();

        // Khung giao dien lam viec
        g.fillStyle(0x30263a);
        g.fillRoundedRect(40, 32, 880, 574, 22);

        g.lineStyle(5, 0x9a79af);
        g.strokeRoundedRect(40, 32, 880, 574, 22);

        // Mat ban lam viec
        g.fillStyle(0x62483f);
        g.fillRoundedRect(105, 188, 750, 335, 18);

        g.fillStyle(0xa47a55);
        g.fillRoundedRect(120, 202, 720, 310, 12);

        // Hinh minh hoa theo tung tram
        if (this.stationId === 'brewing') {
            // Vac nau thuoc
            g.fillStyle(0x3b3146);
            g.fillEllipse(480, 372, 282, 220);

            g.fillStyle(0x9b69b7);
            g.fillEllipse(480, 323, 228, 100);

            g.lineStyle(10, 0xc5a2d1);
            g.strokeEllipse(480, 323, 228, 100);

        } else if (this.stationId === 'preparation') {
            // Nguyen lieu tuoi
            for (let i = 0; i < 5; i++) {
                g.fillStyle(
                    i % 2 ? 0x4b774d : 0x80aa6e
                );

                g.fillEllipse(
                    320 + i * 84,
                    347,
                    58,
                    100
                );
            }

        } else if (this.stationId === 'storage') {
            // Ruong nguyen lieu
            g.fillStyle(0x6b423b);
            g.fillRoundedRect(314, 281, 335, 190, 15);

            g.lineStyle(12, 0xd6ad63);
            g.strokeRoundedRect(314, 281, 335, 190, 15);

            g.fillStyle(0xe3c479);
            g.fillRect(460, 334, 40, 42);

        } else {
            // Cac lo thuoc tren quay le tan
            const colors = [
                0xb26dbe,
                0x62b8bd,
                0xc78f9e
            ];

            for (let i = 0; i < 5; i++) {
                const x = 280 + i * 95;

                g.fillStyle(colors[i % 3]);
                g.fillRoundedRect(
                    x, 308, 51, 106, 12
                );

                g.fillStyle(0xe8c993);
                g.fillRect(
                    x + 16, 291, 19, 24
                );
            }
        }

        const centerText = (
            y,
            value,
            size,
            color
        ) => {
            return this.add.text(
                480,
                y,
                value,
                {
                    fontFamily: 'Arial',
                    fontStyle: 'bold',
                    fontSize: `${size}px`,
                    color,
                    align: 'center'
                }
            ).setOrigin(0.5);
        };

        centerText(
            82,
            station.title,
            31,
            '#f6dfb4'
        );

        centerText(
            127,
            station.subtitle,
            19,
            '#d7bed7'
        );

        centerText(
            550,
            'Giao diện thao tác sẽ được phát triển tiếp',
            17,
            '#f3e6d5'
        );

        // Nut quay lai
        const back = this.add.text(
            73,
            55,
            '← QUAY LẠI',
            {
                fontFamily: 'Arial',
                fontSize: '19px',
                color: '#fff1dc',
                backgroundColor: '#694d80',
                padding: {
                    x: 12,
                    y: 9
                }
            }
        ).setInteractive({
            useHandCursor: true
        });

        back.on('pointerdown', () => {
            this.goBack();
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
        const camera = this.cameras.main;

        camera.setSize(
            size.width,
            size.height
        );

        camera.setZoom(
            Math.min(
                size.width / W,
                size.height / H
            )
        );

        camera.centerOn(
            W / 2,
            H / 2
        );
    }

    // Tro ve dung vi tri cu trong tiem
    goBack() {
        this.scene.start('ShopInteriorScene');
    }

    update() {
        if (
            Phaser.Input.Keyboard.JustDown(
                this.escKey
            )
        ) {
            this.goBack();
        }
    }
}
