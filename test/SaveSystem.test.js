import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameState } from '../src/game/state/GameState.js';
import { SAVE_KEY, SaveSystem } from '../src/game/state/SaveSystem.js';

function setup() {
    const slots = new Map();
    const storage = {
        getItem: key => slots.get(key) ?? null,
        setItem: (key, value) => slots.set(key, value)
    };
    const gameState = new GameState();
    const saveSystem = new SaveSystem(gameState, { getStorage: () => storage });
    return { gameState, saveSystem, storage };
}

test('TC-06: saves and restores every field while retaining the same Inventory instance', () => {
    const { gameState, saveSystem, storage } = setup();
    const inventory = gameState.inventory;
    const snapshot = gameState.getState();
    snapshot.player = {
        currentScene: 'WorkstationScene',
        position: { x: 1000, y: 830.5 },
        facing: 'left',
        worldReturn: { position: { x: 435, y: 1490 }, facing: 'up' },
        station: 'storage'
    };
    snapshot.inventory = { sample: 3, ['__proto__']: 2, empty: 0 };
    snapshot.economy.coins = 42;
    snapshot.progress.unlockedAreas.push('sample_area');

    assert.equal(gameState.replaceState(snapshot), true);
    assert.deepEqual(saveSystem.saveGame(), { ok: true });
    assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)), snapshot);
    assert.deepEqual(saveSystem.newGame(), { ok: true });
    assert.deepEqual(gameState.getState(), new GameState().getState());
    assert.deepEqual(saveSystem.loadGame(), { ok: true });
    assert.deepEqual(gameState.getState(), snapshot);
    assert.equal(gameState.inventory, inventory);
});

test('TC-07: broken JSON and missing saves leave the current state unchanged', () => {
    const { gameState, saveSystem, storage } = setup();
    gameState.inventory.addItem('sample', 2);
    const original = gameState.getState();

    assert.deepEqual(saveSystem.loadGame(), { ok: false, reason: 'missing_save' });
    storage.setItem(SAVE_KEY, '{"schemaVersion":');
    assert.deepEqual(saveSystem.loadGame(), { ok: false, reason: 'invalid_save' });
    assert.deepEqual(gameState.getState(), original);
    assert.equal(storage.getItem(SAVE_KEY), '{"schemaVersion":');
});

test('TC-09: unsupported schema versions leave both the game and save untouched', () => {
    const { gameState, saveSystem, storage } = setup();
    const original = gameState.getState();
    const futureSave = JSON.stringify({ ...original, schemaVersion: 2 });
    storage.setItem(SAVE_KEY, futureSave);

    assert.deepEqual(saveSystem.loadGame(), { ok: false, reason: 'unsupported_version' });
    assert.deepEqual(gameState.getState(), original);
    assert.equal(storage.getItem(SAVE_KEY), futureSave);
});

test('TC-10: invalid save fields fail without partially applying data', () => {
    const { gameState, saveSystem, storage } = setup();
    gameState.inventory.addItem('sample', 4);
    const original = gameState.getState();
    const invalidFields = [
        { inventory: { sample: -1 } },
        { inventory: { sample: 1.5 } },
        { inventory: { sample: Number.MAX_SAFE_INTEGER + 1 } },
        { inventory: { sample: '1' } },
        { inventory: { '': 1 } },
        { inventory: [] },
        { player: { ...original.player, currentScene: 'UnknownScene' } },
        { player: { ...original.player, facing: 'north' } },
        { player: { ...original.player, position: { x: '435', y: 1535 } } },
        { player: { ...original.player, worldReturn: {} } },
        { player: { ...original.player, currentScene: 'WorkstationScene', station: 'unknown' } },
        { economy: { coins: '4' } },
        { progress: { unlockedAreas: ['potion_shop', 4] } },
        { schemaVersion: '1' }
    ];

    for (const field of invalidFields) {
        const corruptSave = JSON.stringify({ ...original, ...field });
        storage.setItem(SAVE_KEY, corruptSave);
        assert.deepEqual(saveSystem.loadGame(), { ok: false, reason: 'invalid_save' }, corruptSave);
        assert.deepEqual(gameState.getState(), original);
        assert.equal(storage.getItem(SAVE_KEY), corruptSave);
    }
});

test('rejects saved coordinates outside the scene and World Map return bounds', () => {
    const { gameState, saveSystem, storage } = setup();
    gameState.inventory.addItem('sample', 4);
    const original = gameState.getState();
    const invalidPlayers = [
        { ...original.player, position: { x: 1000000, y: 1535 } },
        { currentScene: 'ShopInteriorScene', position: { x: 724, y: 1086 }, facing: 'up' },
        { currentScene: 'WorkstationScene', position: { x: 1448, y: 800 }, facing: 'up', station: 'storage' },
        {
            currentScene: 'WorkstationScene',
            position: { x: 1045, y: 827 },
            facing: 'left',
            station: 'storage',
            worldReturn: { position: { x: 435, y: 1920 }, facing: 'up' }
        }
    ];

    for (const player of invalidPlayers) {
        const invalidSave = JSON.stringify({ ...original, player, inventory: { sample: 99 } });
        storage.setItem(SAVE_KEY, invalidSave);
        assert.deepEqual(saveSystem.loadGame(), { ok: false, reason: 'invalid_save' }, invalidSave);
        assert.deepEqual(gameState.getState(), original);
        assert.equal(storage.getItem(SAVE_KEY), invalidSave);
    }
});

test('unavailable storage and failed writes leave state and existing saves intact', () => {
    const { gameState, saveSystem, storage } = setup();
    assert.deepEqual(saveSystem.saveGame(), { ok: true });
    const oldSave = storage.getItem(SAVE_KEY);
    gameState.inventory.addItem('sample', 1);
    const original = gameState.getState();
    const inaccessible = new SaveSystem(gameState, {
        getStorage() {
            throw new Error('Access denied');
        }
    });
    const readOnly = new SaveSystem(gameState, {
        getStorage: () => ({
            ...storage,
            setItem() {
                throw new Error('Quota exceeded');
            }
        })
    });

    const failure = { ok: false, reason: 'storage_error' };
    assert.deepEqual(inaccessible.saveGame(), failure);
    assert.deepEqual(inaccessible.loadGame(), failure);
    assert.deepEqual(readOnly.saveGame(), failure);
    assert.deepEqual(gameState.getState(), original);
    assert.equal(storage.getItem(SAVE_KEY), oldSave);
});
