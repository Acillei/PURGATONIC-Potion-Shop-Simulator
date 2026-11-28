import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ONBOARDING_KEY, prepareEntry } from '../src/game/state/EntryFlow.js';
import { SAVE_KEY } from '../src/game/state/SaveSystem.js';

const legacySave = {
    schemaVersion: 1,
    player: {
        currentScene: 'WorkstationScene',
        position: { x: 1000, y: 830.5 },
        facing: 'left',
        worldReturn: { position: { x: 411, y: 1500 }, facing: 'up' },
        station: 'storage'
    },
    inventory: { herb_01_processed: 2, potion_01: 1 },
    economy: { coins: 42 },
    progress: { unlockedAreas: ['potion_shop', 'herb_forest'] }
};
const completed = { version: 1, step: 'complete', profile: { witchName: 'Sương', shopName: 'Tiệm Sao' } };

function entryFrom(entries) {
    const slots = new Map(entries);
    const reads = [];
    const storage = {
        getItem(key) {
            reads.push(key);
            return slots.get(key) ?? null;
        },
        setItem() { assert.fail('Preparing entry must not write storage'); },
        removeItem() { assert.fail('Preparing entry must not delete storage'); }
    };
    return { result: prepareEntry(() => storage), reads, slots };
}

test('empty storage sends a new player to Character Creator with no playable session', () => {
    const { result, reads } = entryFrom([]);
    assert.deepEqual(result, { status: 'new_player', step: 'character_creator' });
    assert.deepEqual(reads, [ONBOARDING_KEY, SAVE_KEY]);
});

test('each valid checkpoint resumes onboarding without a generated profile or playable session', () => {
    for (const step of ['character_creator', 'intro_story', 'shop_name']) {
        const { result } = entryFrom([[ONBOARDING_KEY, JSON.stringify({ version: 1, step })]]);
        assert.deepEqual(result, { status: 'onboarding_in_progress', step });
    }
});

test('a valid schema v1 legacy save preserves the whole snapshot and is loaded only once', () => {
    const blob = JSON.stringify(legacySave);
    const { result, reads, slots } = entryFrom([[SAVE_KEY, blob]]);
    assert.equal(result.status, 'legacy_save');
    assert.equal(result.profile, undefined);
    assert.deepEqual(result.gameState.getState(), legacySave);
    assert.deepEqual(reads, [ONBOARDING_KEY, SAVE_KEY]);
    assert.equal(slots.get(SAVE_KEY), blob);
});

test('completed onboarding uses the courtyard pose in memory and preserves all saved progression', () => {
    const blob = JSON.stringify(legacySave);
    const metadata = JSON.stringify(completed);
    const { result, reads, slots } = entryFrom([[ONBOARDING_KEY, metadata], [SAVE_KEY, blob]]);
    assert.equal(result.status, 'onboarding_complete');
    assert.deepEqual(result.profile, completed.profile);
    assert.ok(Object.isFrozen(result.profile));
    assert.deepEqual(result.gameState.getState(), {
        ...legacySave,
        player: { currentScene: 'WorldMapScene', position: { x: 435, y: 1535 }, facing: 'down' }
    });
    assert.deepEqual(reads, [ONBOARDING_KEY, SAVE_KEY]);
    assert.equal(slots.get(SAVE_KEY), blob);
    assert.equal(slots.get(ONBOARDING_KEY), metadata);
});

test('completion metadata alone does not create a game when the save is missing', () => {
    const { result } = entryFrom([[ONBOARDING_KEY, JSON.stringify(completed)]]);
    assert.deepEqual(result, { status: 'entry_error', reason: 'missing_save' });
});

test('invalid metadata cannot start gameplay even with a valid save', () => {
    const invalid = [
        '', '{', 'null', '{}', '[]',
        JSON.stringify({ ...completed, version: 2 }),
        JSON.stringify({ ...completed, step: 'unknown' }),
        JSON.stringify({ ...completed, profile: null }),
        JSON.stringify({ ...completed, profile: { witchName: ' ', shopName: 'Tiệm Sao' } }),
        JSON.stringify({ ...completed, profile: { witchName: 'Sương', shopName: 123 } })
    ];
    const save = JSON.stringify(legacySave);
    for (const metadata of invalid) {
        const { result, slots } = entryFrom([[ONBOARDING_KEY, metadata], [SAVE_KEY, save]]);
        assert.deepEqual(result, { status: 'entry_error', reason: 'invalid_metadata' });
        assert.equal(slots.get(SAVE_KEY), save);
        assert.equal(slots.get(ONBOARDING_KEY), metadata);
    }
});

test('malformed and unsupported saves are surfaced with or without a complete profile', () => {
    const invalid = [
        ['{', 'invalid_save'],
        [JSON.stringify({ ...legacySave, inventory: { herb_01: -1 } }), 'invalid_save'],
        [JSON.stringify({ ...legacySave, schemaVersion: 2 }), 'unsupported_version']
    ];
    for (const [save, reason] of invalid) {
        assert.deepEqual(entryFrom([[SAVE_KEY, save]]).result, { status: 'entry_error', reason });
        const metadata = JSON.stringify(completed);
        const { result, slots } = entryFrom([[SAVE_KEY, save], [ONBOARDING_KEY, metadata]]);
        assert.deepEqual(result, { status: 'entry_error', reason });
        assert.equal(slots.get(SAVE_KEY), save);
    }
});

test('storage access failures do not start a new game', () => {
    const storageError = () => { throw new Error('Access denied'); };
    const failed = { status: 'entry_error', reason: 'storage_error' };
    assert.deepEqual(prepareEntry(storageError), failed);
    assert.deepEqual(prepareEntry(() => ({ getItem: storageError })), failed);
    assert.deepEqual(prepareEntry(() => ({ getItem: key => key === ONBOARDING_KEY ? null : storageError() })), failed);
});
