import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    containsPoint, createCollision, findInteraction, polygon, rect
} from '../src/game/exploration/ExplorationGeometry.js';
import { shopGeometry, SHOP_SPAWN } from '../src/game/maps/shopInteriorData.js';
import {
    HOUSE, LAKE, MAILBOX, MAILBOX_FOOT, WORLD_FOOT_OFFSET, WORLD_WITCH_SCALE, worldGeometry
} from '../src/game/maps/worldMapData.js';
import { GameState } from '../src/game/state/GameState.js';

test('zones include their boundaries, resolve overlaps by order, and require walkable feet', () => {
    const bounds = rect(0, 0, 100, 100);
    const collision = createCollision({
        bounds, walkable: [bounds], colliders: [rect(40, 30, 50, 45)],
        footprint: { radiusX: 2, radiusY: 2 }
    });
    const regions = [polygon([10, 10], [65, 10], [65, 60], [10, 60])];
    const zones = [{ id: 'first', regions }, { id: 'second', regions: [rect(10, 10, 90, 90)] }];

    assert.equal(containsPoint(regions[0], 10, 29), true);
    assert.equal(findInteraction({ x: 10, y: 29 }, zones, collision.canStand).id, 'first');
    assert.equal(findInteraction({ x: 41, y: 42 }, zones, collision.canStand), null);
    assert.equal(findInteraction({ x: 75, y: 70 }, zones, collision.canStand).id, 'second');
    assert.equal(findInteraction({ x: 9, y: 29 }, zones, collision.canStand), null);
});

test('movement stops at thin barriers and slides on either axis without cutting closed corners', () => {
    const bounds = rect(0, 0, 100, 100);
    const footprint = { radiusX: 2, radiusY: 2 };
    const vertical = createCollision({ bounds, footprint, walkable: [bounds], colliders: [rect(30, 0, 32, 80)] });
    const horizontal = createCollision({ bounds, footprint, walkable: [bounds], colliders: [rect(0, 30, 80, 32)] });
    const from = { x: 20, y: 20 };

    const stopped = vertical.move(from, 60, 0);
    assert.ok(stopped.x > from.x && stopped.x <= 28);
    const slidesDown = vertical.move(from, 30, 30);
    assert.ok(slidesDown.x <= 28 && Math.abs(slidesDown.y - 50) < 1e-8);
    const slidesRight = horizontal.move(from, 30, 30);
    assert.ok(slidesRight.y <= 28 && Math.abs(slidesRight.x - 50) < 1e-8);

    const corner = createCollision({
        bounds,
        footprint: { radiusX: 0.1, radiusY: 0.1 },
        walkable: [rect(0, 0, 10, 10), rect(11, 11, 20, 20)],
        colliders: []
    });
    assert.deepEqual(corner.move({ x: 10, y: 10 }, 2, 2), { x: 10, y: 10 });
});

test('shop collision follows the table legs and leaves the floor beside the counter open', () => {
    const collision = createCollision(shopGeometry);
    assert.equal(collision.canStand(1120, 625), false);
    assert.equal(collision.canStand(1120, 660), true);
    assert.equal(collision.canStand(333, 609), true);
    assert.equal(collision.canStand(435, 755), false);
    assert.equal(collision.canStand(485, 815), true);
    assert.equal(collision.canStand(500, 980), true);
    assert.equal(collision.canStand(500, 994), false);
    assert.equal(collision.canStand(724, 450), false);
    assert.equal(collision.canStand(724, 970), true);
    assert.equal(collision.canStand(724, 1027), true);
    assert.equal(collision.canStand(610, 1010), false);
});

test('legacy position inside the extended preparation collider can walk out without teleporting', () => {
    const collision = createCollision(shopGeometry);
    const saved = { x: 1120, y: 625 };
    assert.equal(collision.canStand(saved.x, saved.y), false);
    assert.deepEqual(collision.move(saved, 0, -6), saved);
    const firstStep = collision.move(saved, 0, 6);
    assert.deepEqual(firstStep, { x: 1120, y: 631 });

    const recovered = collision.move(firstStep, 0, 36);
    assert.equal(collision.canStand(recovered.x, recovered.y), true);
    const returning = collision.move(recovered, 0, -40);
    assert.equal(collision.canStand(returning.x, returning.y), true);
    assert.ok(returning.y > 648 && returning.y < 660);
});

test('every shop zone is reachable from multiple valid positions', () => {
    const collision = createCollision(shopGeometry);
    const cases = {
        exit: [[655, 1000], [796, 974]],
        brewing: [[630, 488], [822, 560]],
        preparation: [[954, 580], [1118, 667], [1330, 678]],
        storage: [[1020, 820], [1060, 880], [1220, 960]],
        reception: [[500, 710], [565, 806]]
    };
    for (const [id, samples] of Object.entries(cases)) {
        for (const [x, y] of samples) {
            assert.equal(findInteraction({ x, y }, shopGeometry.zones, collision.canStand)?.id, id, String([x, y]));
        }
    }
    assert.equal(findInteraction({ x: 1120, y: 625 }, shopGeometry.zones, collision.canStand), null);
    assert.equal(findInteraction({ x: 724, y: 713 }, shopGeometry.zones, collision.canStand), null);
});

test('World Map uses visible feet for a door left of the house center and preserves asset scales', () => {
    const collision = createCollision(worldGeometry);
    const zoneAt = (x, y) => findInteraction({ x, y }, worldGeometry.zones, collision.canStand)?.id;
    assert.deepEqual([WORLD_WITCH_SCALE, HOUSE.scale, MAILBOX.scale], [1.5, 1, 1.5]);
    assert.equal(WORLD_FOOT_OFFSET, 45);
    assert.equal(zoneAt(399, 1470), 'shop');
    assert.equal(zoneAt(435, 1530), 'shop');
    assert.equal(zoneAt(399, 1437), undefined);
    assert.equal(zoneAt(503, 1518), 'mailbox');
    assert.equal(zoneAt(MAILBOX_FOOT.x, MAILBOX_FOOT.y), undefined);
    assert.equal(collision.canStand(LAKE.x, LAKE.y), false);
    assert.equal(zoneAt(435, 1535 + WORLD_FOOT_OFFSET), undefined);
});

test('a trip via the new zones preserves player pose, facing and the shared inventory', () => {
    const world = createCollision(worldGeometry);
    const shop = createCollision(shopGeometry);
    const state = new GameState();
    const inventory = state.inventory;
    inventory.addItem('sample', 2);
    const exterior = { x: 399, y: 1500 - WORLD_FOOT_OFFSET };
    state.updatePlayerPose('WorldMapScene', exterior, 'up');
    assert.equal(findInteraction({ ...exterior, y: exterior.y + WORLD_FOOT_OFFSET },
        worldGeometry.zones, world.canStand).id, 'shop');

    state.enterScene('ShopInteriorScene', SHOP_SPAWN);
    const position = { x: 1020, y: 820 };
    state.updatePlayerPose('ShopInteriorScene', position, 'right');
    const zone = findInteraction(position, shopGeometry.zones, shop.canStand);
    state.enterScene('WorkstationScene', SHOP_SPAWN, zone.id);
    assert.equal(state.getPlayer().station, 'storage');
    assert.deepEqual(state.enterScene('ShopInteriorScene', SHOP_SPAWN).position, position);
    assert.equal(state.getPlayer().facing, 'right');
    assert.deepEqual(state.enterScene('WorldMapScene').position, exterior);
    assert.equal(state.getPlayer().facing, 'up');
    assert.equal(state.inventory, inventory);
    assert.equal(inventory.getQuantity('sample'), 2);
});
