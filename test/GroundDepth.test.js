import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCollision, findInteraction } from '../src/game/exploration/ExplorationGeometry.js';
import { groundPosition, sortByGround } from '../src/game/exploration/GroundDepth.js';
import {
    MAILBOX, MAILBOX_FOOT, MAILBOX_GROUND_OFFSET, WORLD_WITCH_GROUND_OFFSET, worldGeometry
} from '../src/game/maps/worldMapData.js';

function makeSprite(x, y) {
    return {
        x,
        y,
        setDepth(depth) { this.depth = depth; return this; }
    };
}

test('mailbox keeps its image origin while sorting by the post touching the ground', () => {
    const sprite = sortByGround(makeSprite(MAILBOX.x, MAILBOX.y), MAILBOX_GROUND_OFFSET);
    assert.deepEqual(MAILBOX_FOOT, { x: 534.25, y: 1493.5 });
    assert.deepEqual({ x: sprite.x, y: sprite.y }, { x: MAILBOX.x, y: MAILBOX.y });
    assert.equal(sprite.depth, 1493.5);
});

test('witch depth follows the visible feet above, below, left and right of the mailbox', () => {
    const mailbox = sortByGround(makeSprite(MAILBOX.x, MAILBOX.y), MAILBOX_GROUND_OFFSET);
    const { x, y } = MAILBOX_FOOT;
    const positions = {
        above: { foot: { x, y: y - 20 }, order: -1 },
        below: { foot: { x, y: y + 12 }, order: 1 },
        left: { foot: { x: x - 16, y }, order: 0 },
        right: { foot: { x: x + 16, y }, order: 0 }
    };
    for (const [side, { foot, order }] of Object.entries(positions)) {
        const witch = sortByGround(makeSprite(foot.x, foot.y - 45), WORLD_WITCH_GROUND_OFFSET);
        assert.deepEqual(groundPosition(witch, WORLD_WITCH_GROUND_OFFSET), foot, side);
        assert.equal(witch.y, foot.y - 45, side);
        assert.equal(Math.sign(witch.depth - mailbox.depth), order, side);
    }
});

test('mailbox collision stops feet at the post from all four sides', () => {
    const collision = createCollision(worldGeometry);
    const { x, y } = MAILBOX_FOOT;
    assert.equal(collision.canStand(x, y), false);

    for (const [dx, dy] of [[0, -24], [0, 24], [-24, 0], [24, 0]]) {
        const start = { x: x + dx, y: y + dy };
        assert.equal(collision.canStand(start.x, start.y), true);
        const result = collision.move(start, -dx * 2, -dy * 2);
        assert.notDeepEqual(result, start);
        assert.ok((result.x - x) * dx + (result.y - y) * dy > 0);
        assert.equal(collision.canStand(result.x, result.y), true);
    }
});

test('paths through the mailbox silhouette remain open north and south of its base', () => {
    const collision = createCollision(worldGeometry);
    const { x, y } = MAILBOX_FOOT;
    for (const pathY of [y - 20, y + 12]) {
        assert.equal(collision.canStand(x, pathY), true);
        assert.equal(findInteraction({ x, y: pathY }, worldGeometry.zones, collision.canStand)?.id, 'mailbox');
        const result = collision.move({ x: x - 22, y: pathY }, 44, 0);
        assert.ok(Math.abs(result.x - (x + 22)) < 1e-8);
    }
});
