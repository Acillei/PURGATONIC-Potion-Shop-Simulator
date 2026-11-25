import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ingredients, processedIngredients, refinedIngredients } from '../src/game/data/ingredients.js';
import { items, getItem } from '../src/game/data/itemRegistry.js';
import { potions } from '../src/game/data/potions.js';
import { GameState } from '../src/game/state/GameState.js';
import { SAVE_KEY, SaveSystem } from '../src/game/state/SaveSystem.js';

const approvedCatalog = [
    ['herb_01', 'Linh Lan Sương', 'flower_garden', 'dry', 'herb_01_dried'],
    ['herb_02', 'Hoa Lam Tinh', 'flower_garden', 'extract', 'herb_02_extract'],
    ['herb_03', 'Oải Hương Mộng', 'flower_garden', 'dry', 'herb_03_dried'],
    ['herb_04', 'Cúc Nhật Quang', 'flower_garden', 'dry', 'herb_04_dried'],
    ['herb_05', 'Nấm Sương Lam', 'mushroom_grove', 'extract', 'herb_05_extract'],
    ['herb_06', 'Dương Xỉ Xoắn', 'herb_forest', 'grind', 'herb_06_powder'],
    ['herb_07', 'Lá Lục Linh', 'herb_forest', 'extract', 'herb_07_extract'],
    ['herb_08', 'Cỏ Kim Châu', 'herb_forest', 'press', 'herb_08_juice'],
    ['herb_09', 'Quả Hồng Lộ', 'herb_forest', 'press', 'herb_09_juice'],
    ['herb_10', 'Nấm Hỏa Đốm', 'mushroom_grove', 'grind', 'herb_10_powder'],
    ['herb_11', 'Quả Tử Mộng', 'herb_forest', 'press', 'herb_11_juice'],
    ['herb_12', 'Nấm Tinh Nguyệt', 'mushroom_grove', 'grind', 'herb_12_powder']
];
const herbIds = approvedCatalog.map(([id]) => id);

test('TC-01: the twelve raw ingredients match the approved catalog', () => {
    const actual = ingredients.map(({ id, name, gatherArea, refiningMethod }) =>
        [id, name, gatherArea, refiningMethod]);
    assert.deepEqual(actual.sort(), approvedCatalog.map(row => row.slice(0, 4)));
    for (const item of ingredients) {
        assert.equal(item.category, 'raw_ingredient', item.id);
        assert.ok(item.description.trim(), item.id);
        assert.equal(item.designStatus, 'approved', item.id);
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
        assert.equal(item.gatherArea, null, item.id);
        assert.equal(item.processingMethod, null, item.id);
    }
});

test('each refined item links to the correct raw and processed definitions', () => {
    assert.deepEqual(
        refinedIngredients.map(item => item.id).sort(),
        approvedCatalog.map(([, , , , refinedId]) => refinedId)
    );
    for (const [rawId, , , refiningMethod, refinedId] of approvedCatalog) {
        const refined = getItem(refinedId);
        assert.equal(refined.category, 'refined_ingredient', refinedId);
        assert.equal(refined.rawIngredientId, rawId, refinedId);
        assert.equal(refined.processedIngredientId, `${rawId}_processed`, refinedId);
        assert.equal(getItem(refined.processedIngredientId).rawIngredientId, rawId, refinedId);
        assert.equal(refined.refiningMethod, refiningMethod, refinedId);
        assert.equal(refined.processingMethod, null, refinedId);
        assert.ok(refined.name.trim(), refinedId);
        assert.ok(refined.description.trim(), refinedId);
    }
});

test('TC-03: all 39 item IDs are unique and retrievable', () => {
    assert.equal(items.length, 39);
    assert.equal(new Set(items.map(item => item.id)).size, items.length);
    for (const item of items) {
        assert.equal(getItem(item.id), item);
    }
    assert.equal(getItem('unknown_item'), null);
    assert.equal(getItem('__proto__'), null);
});

test('starter potions keep their IDs and provisional names and descriptions', () => {
    assert.deepEqual(potions.map(({ id, name }) => [id, name]), [
        ['potion_01', 'Thuốc Hồi Phục'],
        ['potion_02', 'Thuốc Tập Trung'],
        ['potion_03', 'Thuốc Sinh Lực']
    ]);
    for (const potion of potions) {
        assert.equal(potion.category, 'potion', potion.id);
        assert.equal(potion.designStatus, 'provisional', potion.id);
        assert.ok(potion.description.trim(), potion.id);
    }
});

test('TC-09: the registry, source catalogs and item definitions are read-only', () => {
    for (const catalog of [items, ingredients, processedIngredients, refinedIngredients, potions]) {
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

test('a schema v1 save restores legacy item IDs and quantities without refinement', () => {
    const legacySave = {
        schemaVersion: 1,
        player: { currentScene: 'WorldMapScene', position: { x: 435, y: 1535 }, facing: 'down' },
        inventory: { herb_01: 4, herb_01_processed: 2, herb_11_processed: 3, potion_01: 1, legacy_item: 1 },
        economy: { coins: 8 },
        progress: { unlockedAreas: ['potion_shop'] }
    };
    const original = JSON.stringify(legacySave);
    const slots = new Map([[SAVE_KEY, original]]);
    const storage = {
        getItem: key => slots.get(key) ?? null,
        setItem: (key, value) => slots.set(key, value)
    };
    const gameState = new GameState();
    const saveSystem = new SaveSystem(gameState, { getStorage: () => storage });

    assert.deepEqual(saveSystem.loadGame(), { ok: true });
    assert.deepEqual(gameState.getState(), legacySave);
    assert.equal(slots.get(SAVE_KEY), original);
    assert.equal(getItem('herb_01_processed').category, 'processed_ingredient');
    assert.equal(getItem('herb_11_processed').category, 'processed_ingredient');
    assert.deepEqual(saveSystem.saveGame(), { ok: true });
    assert.deepEqual(JSON.parse(slots.get(SAVE_KEY)), legacySave);
});
