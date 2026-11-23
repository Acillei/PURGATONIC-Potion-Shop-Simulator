import { SCHEMA_VERSION } from './GameState.js';

export const SAVE_KEY = 'purgatonic:save';

export class SaveSystem {
    #gameState;
    #getStorage;
    #onRestore;

    constructor(gameState, { getStorage = () => globalThis.localStorage, onRestore } = {}) {
        this.#gameState = gameState;
        this.#getStorage = getStorage;
        this.#onRestore = onRestore;
    }

    saveGame() {
        try {
            const serialized = JSON.stringify(this.#gameState.getState());
            this.#getStorage().setItem(SAVE_KEY, serialized);
            return { ok: true };
        } catch {
            return { ok: false, reason: 'storage_error' };
        }
    }

    loadGame() {
        let serialized;
        try {
            serialized = this.#getStorage().getItem(SAVE_KEY);
        } catch {
            return { ok: false, reason: 'storage_error' };
        }
        if (serialized === null) return { ok: false, reason: 'missing_save' };

        let state;
        try {
            state = JSON.parse(serialized);
        } catch {
            return { ok: false, reason: 'invalid_save' };
        }

        const version = state?.schemaVersion;
        if (Number.isSafeInteger(version) && version > 0 && version !== SCHEMA_VERSION) {
            return { ok: false, reason: 'unsupported_version' };
        }
        if (!this.#gameState.replaceState(state)) {
            return { ok: false, reason: 'invalid_save' };
        }

        this.#onRestore?.();
        return { ok: true };
    }

    newGame() {
        this.#gameState.reset();
        this.#onRestore?.();
        return { ok: true };
    }
}
