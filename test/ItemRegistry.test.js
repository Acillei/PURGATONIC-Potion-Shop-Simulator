import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { test } from 'node:test';
import { ingredients, processedIngredients } from '../src/game/data/ingredients.js';
import { items, getItem } from '../src/game/data/itemRegistry.js';
import { potions } from '../src/game/data/potions.js';
import { GameState } from '../src/game/state/GameState.js';

const herbIds = Array.from({ length: 12 }, (_, index) =>
    `herb_${String(index + 1).padStart(2, '0')}`
);

test('TC-01: twelve raw ingredients have the required IDs and provisional metadata', () => {
    assert.deepEqual(ingredients.map(item => item.id).sort(), herbIds);
    for (const item of ingredients) {
        assert.equal(item.category, 'raw_ingredient', item.id);
        assert.ok(item.name.trim(), item.id);
        assert.ok(item.description.trim(), item.id);
        assert.equal(item.designStatus, 'provisional', item.id);
        assert.equal(item.gatherArea, null, item.id);
        assert.equal(item.processingMethod, null, item.id);
    }
});

test('TC-02: each raw ingredient has exactly one corresponding processed item', () => {
    const processedIds = herbIds.map(id => `${id}_processed`);
    assert.deepEqual(processedIngredients.map(item => item.id).sort(), processedIds);
    for (const item of processedIngredients) {
        assert.equal(item.category, 'processed_ingredient', item.id);
        assert.equal(item.id, `${item.rawIngredientId}_processed`);
        assert.equal(getItem(item.rawIngredientId)?.category, 'raw_ingredient', item.id);
        assert.ok(item.name.trim(), item.id);
        assert.ok(item.description.trim(), item.id);
        assert.equal(item.designStatus, 'provisional', item.id);
        assert.equal(item.assetPath, null, item.id);
        assert.equal(item.gatherArea, null, item.id);
        assert.equal(item.processingMethod, null, item.id);
    }
});

test('TC-03: all 27 item IDs are unique and retrievable', () => {
    assert.equal(items.length, 27);
    assert.equal(new Set(items.map(item => item.id)).size, items.length);
    for (const item of items) {
        assert.equal(getItem(item.id), item);
    }
    assert.equal(getItem('unknown_item'), null);
    assert.equal(getItem('__proto__'), null);
});

test('TC-04: each raw ingredient points to its existing PNG asset', () => {
    for (const { id, assetPath } of ingredients) {
        assert.equal(assetPath, `/assets/sprites/${id}.png`);
        assert.ok(statSync(new URL(`../public${assetPath}`, import.meta.url)).isFile(), assetPath);
    }
});

test('starter potions have provisional names and descriptions and no assigned sprites', () => {
    assert.deepEqual(potions.map(({ id, name }) => [id, name]), [
        ['potion_01', 'Thuốc Hồi Phục'],
        ['potion_02', 'Thuốc Tập Trung'],
        ['potion_03', 'Thuốc Sinh Lực']
    ]);
    for (const potion of potions) {
        assert.equal(potion.category, 'potion', potion.id);
        assert.equal(potion.assetPath, null, potion.id);
        assert.equal(potion.designStatus, 'provisional', potion.id);
        assert.ok(potion.description.trim(), potion.id);
    }
});

test('TC-09: the registry, source catalogs and item definitions are read-only', () => {
    for (const catalog of [items, ingredients, processedIngredients, potions]) {
        assert.ok(Object.isFrozen(catalog));
        for (const item of catalog) {
            assert.ok(Object.isFrozen(item), item.id);
        }
    }

    const ingredient = getItem('herb_01');
    const before = { ...ingredient };
    assert.throws(() => { ingredient.name = 'Different name'; }, TypeError);
    assert.throws(() => items.pop(), TypeError);
    assert.deepEqual(getItem('herb_01'), before);
});

test('TC-10: all new item IDs work with the current inventory and schema version', () => {
    const gameState = new GameState();
    for (const { id } of items) {
        assert.equal(gameState.inventory.addItem(id, 1), true, id);
        assert.equal(gameState.inventory.hasItem(id, 1), true, id);
    }
    const before = gameState.getState();
    assert.equal(before.schemaVersion, 1);
    assert.equal(Object.keys(before.inventory).length, items.length);
    for (const id of Object.keys(before.inventory)) assert.ok(getItem(id), id);
    assert.deepEqual(gameState.getState(), before);
});
