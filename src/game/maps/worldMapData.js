import { circle, corridor, distanceToPath, ellipse, polygon, rect } from '../exploration/ExplorationGeometry.js';
import { groundPosition } from '../exploration/GroundDepth.js';

export const TILE = 32;
export const MAP_COLS = 80;
export const MAP_ROWS = 60;
export const MAP_WIDTH = MAP_COLS * TILE;
export const MAP_HEIGHT = MAP_ROWS * TILE;

export const SHOP = { x: 430, y: 1390 };
export const MUSHROOM = { x: 700, y: 465 };
export const FLOWER = { x: 1930, y: 425 };
export const ROCK = { x: 1700, y: 1000 };
export const LAKE = { x: 2000, y: 1540 };
export const HOUSE = { x: SHOP.x, y: SHOP.y + 65, scale: 1 };
export const MAILBOX = { x: SHOP.x + 105, y: SHOP.y + 105, scale: 1.5 };
export const WORLD_WITCH_SCALE = 1.5;
// The visible sprite ends at row 62 of a 64px frame with a centered origin.
export const WORLD_FOOT_OFFSET = (62 - 32) * WORLD_WITCH_SCALE;
export const WORLD_WITCH_GROUND_OFFSET = { x: 0, y: WORLD_FOOT_OFFSET };

// Mailbox: 32 × 48px, origin (16, 48). The last visible row is 46, at x = 14..16.
const mailboxPixelOffset = (x, y) => ({ x: (x - 16) * MAILBOX.scale, y: (y - 48) * MAILBOX.scale });
export const MAILBOX_GROUND_OFFSET = mailboxPixelOffset(15.5, 47);
export const MAILBOX_FOOT = groundPosition(MAILBOX, MAILBOX_GROUND_OFFSET);
const mailboxBaseStart = groundPosition(MAILBOX, mailboxPixelOffset(13, 41));
const mailboxBaseEnd = groundPosition(MAILBOX, mailboxPixelOffset(19, 47));

export const SHOP_PATH_START = { x: SHOP.x, y: SHOP.y + 90 };
const LEFT_SIDE = [
    SHOP_PATH_START, { x: 330, y: 1510 }, { x: 290, y: 1410 },
    { x: 285, y: 1250 }, { x: 340, y: 1150 }
];
const RIGHT_SIDE = [
    SHOP_PATH_START, { x: 595, y: 1520 }, { x: 635, y: 1420 },
    { x: 650, y: 1260 }, { x: 720, y: 1150 }
];

export const PATHS = {
    mushroom: [
        ...LEFT_SIDE, { x: 440, y: 1060 }, { x: 570, y: 1000 },
        { x: 530, y: 770 }, { x: 710, y: 625 }, MUSHROOM
    ],
    flower: [
        ...RIGHT_SIDE, { x: 970, y: 980 }, { x: 1230, y: 770 }, { x: 1630, y: 600 }, FLOWER
    ],
    rock: [...RIGHT_SIDE, { x: 900, y: 1220 }, { x: 1120, y: 1170 }, ROCK],
    lake: [...RIGHT_SIDE, { x: 840, y: 1510 }, { x: 1270, y: 1700 }, { x: 1660, y: 1660 }, LAKE]
};

export function noise(x, y) {
    let n = (x * 374761393 + y * 668265263) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function forestProps() {
    const props = [];
    const landmarks = [SHOP_PATH_START, MUSHROOM, FLOWER, ROCK, LAKE];
    const paths = Object.values(PATHS);
    for (let y = 55; y < MAP_HEIGHT - 40; y += 55) {
        for (let x = 45; x < MAP_WIDTH - 40; x += 55) {
            const nx = x + (noise(x, y) - 0.5) * 22;
            const ny = y + (noise(x + 9, y + 6) - 0.5) * 22;
            if (paths.some(path => distanceToPath(nx, ny, path) < 90) ||
                landmarks.some(point => Math.hypot(nx - point.x, ny - point.y) < 185)) continue;
            const placement = noise(x + 13, y + 21);
            if (placement > 0.29) {
                props.push({ type: 'tree', x: nx, y: ny, size: 0.8 + noise(x + 11, y) * 0.5 });
            } else if (placement > 0.18) {
                props.push({ type: 'rock', x: nx, y: ny });
            }
        }
    }
    return props;
}

export const WORLD_FOREST_PROPS = forestProps();
export const LANDMARK_ROCKS = Array.from({ length: 18 }, (_, index) => ({
    type: 'rock',
    x: ROCK.x + (noise(index, 99) - 0.5) * 300,
    y: ROCK.y + (noise(index, 54) - 0.5) * 210
}));

function propCollider({ type, x, y, size }) {
    return type === 'tree' ? circle(x, y + 3 * size, 14 * size) : circle(x, y - 4, 17);
}

export const worldGeometry = {
    bounds: rect(35, 45, MAP_WIDTH - 35, MAP_HEIGHT - 25),
    footprint: { radiusX: 8, radiusY: 8 },
    walkable: [
        ...Object.values(PATHS).map(path => corridor(path, 52)),
        circle(SHOP.x, SHOP.y, 177),
        circle(MUSHROOM.x, MUSHROOM.y, 145),
        circle(FLOWER.x, FLOWER.y, 145),
        circle(ROCK.x, ROCK.y, 145),
        circle(LAKE.x, LAKE.y, 148),
        circle(SHOP_PATH_START.x, SHOP_PATH_START.y + 35, 175)
    ],
    colliders: [
        rect(SHOP_PATH_START.x - 80, SHOP_PATH_START.y - 210, SHOP_PATH_START.x + 80, HOUSE.y - 7),
        rect(mailboxBaseStart.x, mailboxBaseStart.y, mailboxBaseEnd.x, MAILBOX_FOOT.y),
        ellipse(LAKE.x, LAKE.y, 148, 93),
        ...WORLD_FOREST_PROPS.map(propCollider),
        ...LANDMARK_ROCKS.map(propCollider)
    ],
    zones: [
        {
            id: 'mailbox', name: 'Hòm thư',
            regions: [polygon([479, 1460], [565, 1452], [600, 1504], [567, 1564], [490, 1560])]
        },
        {
            id: 'shop', name: 'Vào Tiệm thuốc',
            // The drawn doorway is left of the sprite's midpoint.
            regions: [polygon([369, 1456], [426, 1456], [468, 1549], [338, 1549])]
        }
    ]
};
