import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InventorySystem } from '../src/game/state/InventorySystem.js';

test('TC-01: adds three items and reports the available quantity', () => {
    const inventory = new InventorySystem();
    assert.equal(inventory.getQuantity('sample'), 0);
    assert.equal(inventory.addItem('sample', 3), true);
    assert.equal(inventory.getQuantity('sample'), 3);
    assert.equal(inventory.hasItem('sample', 3), true);
    assert.equal(inventory.hasItem('sample', 4), false);
});

test('TC-02: removes two of three items', () => {
    const inventory = new InventorySystem();
    inventory.addItem('sample', 3);

    assert.equal(inventory.removeItem('sample', 2), true);
    assert.equal(inventory.getQuantity('sample'), 1);
});

test('TC-03: rejects removing more than the available quantity', () => {
    const inventory = new InventorySystem();
    inventory.addItem('sample', 3);

    assert.equal(inventory.removeItem('sample', 5), false);
    assert.equal(inventory.removeItem('other', 1), false);
    assert.deepEqual(inventory.getAllItems(), { sample: 3 });
});

test('TC-04: rejects invalid IDs, invalid quantities, and overflow', () => {
    const inventory = new InventorySystem();
    const max = Number.MAX_SAFE_INTEGER;
    assert.equal(inventory.addItem('sample', max), true);
    assert.equal(inventory.addItem('sample', 1), false);

    for (const operation of ['addItem', 'removeItem', 'hasItem']) {
        for (const id of ['', 1, null, {}]) {
            assert.equal(inventory[operation](id, 1), false);
        }
        for (const quantity of [0, -1, 0.5, NaN, Infinity, max + 1, '1', undefined]) {
            assert.equal(inventory[operation]('sample', quantity), false);
        }
    }
    assert.deepEqual(inventory.getAllItems(), { sample: max });
});

test('TC-08: successive mutations keep independent and accurate counts', () => {
    const inventory = new InventorySystem();
    assert.equal(inventory.addItem('sample', 5), true);
    assert.equal(inventory.removeItem('sample', 3), true);
    assert.equal(inventory.addItem('other', 2), true);
    assert.equal(inventory.removeItem('sample', 3), false);
    assert.equal(inventory.addItem('sample', 1), true);
    assert.equal(inventory.removeItem('sample', 3), true);
    assert.equal(inventory.removeItem('sample', 1), false);
    assert.deepEqual(inventory.getAllItems(), { other: 2 });

    inventory.clear();
    assert.deepEqual(inventory.getAllItems(), {});
});

test('item snapshots are detached and object property names are valid IDs', () => {
    const inventory = new InventorySystem();
    assert.equal(inventory.getQuantity('constructor'), 0);
    assert.equal(inventory.addItem('__proto__', 2), true);
    assert.equal(inventory.addItem('constructor', 3), true);

    const items = inventory.getAllItems();
    assert.equal(Object.hasOwn(items, '__proto__'), true);
    assert.equal(Object.getPrototypeOf(items), Object.prototype);
    items.__proto__ = 4;
    delete items.constructor;

    assert.equal(inventory.getQuantity('__proto__'), 2);
    assert.equal(inventory.getQuantity('constructor'), 3);
});
