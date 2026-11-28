import { GameState } from './GameState.js';
import { SaveSystem } from './SaveSystem.js';

export const ONBOARDING_KEY = 'purgatonic:onboarding';

const checkpointSteps = new Set(['character_creator', 'intro_story', 'shop_name']);

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readProfile(profile) {
    if (!isRecord(profile) || typeof profile.witchName !== 'string' || typeof profile.shopName !== 'string') {
        return null;
    }
    const witchName = profile.witchName.trim();
    const shopName = profile.shopName.trim();
    return witchName && shopName ? Object.freeze({ witchName, shopName }) : null;
}

function readOnboarding(serialized) {
    if (serialized === null) return { status: 'missing_metadata' };

    let record;
    try {
        record = JSON.parse(serialized);
    } catch {
        return { status: 'invalid_metadata' };
    }
    if (!isRecord(record) || record.version !== 1) return { status: 'invalid_metadata' };

    if (checkpointSteps.has(record.step)) {
        return { status: 'onboarding_in_progress', step: record.step };
    }
    if (record.step === 'complete') {
        const profile = readProfile(record.profile);
        if (profile) return { status: 'onboarding_complete', profile };
    }
    return { status: 'invalid_metadata' };
}

const entryError = reason => ({ status: 'entry_error', reason });

export function prepareEntry(getStorage = () => globalThis.localStorage) {
    let storage;
    let serialized;
    try {
        storage = getStorage();
        serialized = storage.getItem(ONBOARDING_KEY);
    } catch {
        return entryError('storage_error');
    }

    const onboarding = readOnboarding(serialized);
    if (onboarding.status === 'invalid_metadata') return entryError('invalid_metadata');

    const gameState = new GameState();
    const courtyardPlayer = gameState.getPlayer();
    const load = new SaveSystem(gameState, { getStorage: () => storage }).loadGame();

    if (!load.ok && load.reason !== 'missing_save') return entryError(load.reason);
    if (onboarding.status === 'onboarding_in_progress') return onboarding;

    if (onboarding.status === 'onboarding_complete') {
        if (!load.ok) return entryError('missing_save');
        gameState.setPlayer(courtyardPlayer);
        return { ...onboarding, gameState };
    }

    return load.ok
        ? { status: 'legacy_save', gameState }
        : { status: 'new_player', step: 'character_creator' };
}
