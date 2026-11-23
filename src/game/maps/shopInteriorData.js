import { polygon, rect } from '../exploration/ExplorationGeometry.js';

export const ROOM_W = 1448;
export const ROOM_H = 1086;
export const SHOP_SPAWN = { position: { x: 724, y: 967 }, facing: 'up' };

export const shopGeometry = {
    bounds: rect(0, 0, ROOM_W, ROOM_H),
    footprint: { radiusX: 10, radiusY: 7 },
    walkable: [
        polygon([74, 535], [244, 462], [270, 438], [1180, 438], [1387, 474],
            [1402, 912], [1338, 982], [112, 982], [61, 930]),
        rect(628, 935, 820, 1030)
    ],
    colliders: [
        rect(271, 394, 564, 447), // Left cabinet
        rect(884, 394, 1176, 447), // Right cabinet
        polygon([587, 377], [622, 350], [821, 350], [863, 376],
            [859, 419], [828, 438], [769, 457], [678, 457], [614, 436], [587, 419]), // Cauldron platform
        polygon([26, 655], [62, 620], [163, 615], [211, 640], [212, 684],
            [316, 676], [381, 604], [466, 605], [475, 632], [463, 806],
            [438, 854], [380, 887], [286, 911], [181, 913], [73, 890], [27, 822]), // Reception counter
        polygon([999, 469], [1356, 467], [1380, 505], [1373, 639],
            [1020, 644], [1002, 612]), // Preparation table including the front legs
        polygon([1206, 738], [1227, 703], [1356, 701], [1408, 722],
            [1402, 840], [1329, 860], [1212, 849]), // Chest
        polygon([1081, 797], [1119, 767], [1200, 767], [1234, 797],
            [1352, 807], [1391, 856], [1372, 941], [1282, 928],
            [1101, 925], [1081, 891]) // Storage baskets and crates
    ],
    // Order gives the exit precedence where areas meet.
    zones: [
        { id: 'exit', name: 'Ra ngoài', regions: [rect(628, 919, 820, 1030)] },
        { id: 'brewing', name: 'Vạc nấu thuốc', regions: [rect(591, 448, 861, 598)] },
        {
            id: 'preparation', name: 'Bàn sơ chế',
            regions: [polygon([937, 489], [1015, 489], [1015, 625], [1377, 635],
                [1377, 744], [985, 744], [937, 675])]
        },
        {
            id: 'storage', name: 'Rương nguyên liệu',
            regions: [polygon([977, 748], [1097, 748], [1097, 902], [1357, 931],
                [1357, 970], [979, 970])]
        },
        {
            id: 'reception', name: 'Quầy lễ tân',
            regions: [polygon([306, 575], [480, 574], [618, 627], [618, 862],
                [450, 905], [456, 738], [306, 700])]
        }
    ]
};
