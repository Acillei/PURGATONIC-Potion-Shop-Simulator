function isItemId(id) {
    return typeof id === 'string' && id.length > 0;
}

function isPositiveQuantity(quantity) {
    return Number.isSafeInteger(quantity) && quantity > 0;
}

export class InventorySystem {
    #items = new Map();

    addItem(id, quantity) {
        if (!isItemId(id) || !isPositiveQuantity(quantity)) return false;

        const total = this.getQuantity(id) + quantity;
        if (!Number.isSafeInteger(total)) return false;

        this.#items.set(id, total);
        return true;
    }

    removeItem(id, quantity) {
        if (!this.hasItem(id, quantity)) return false;

        const remaining = this.getQuantity(id) - quantity;
        if (remaining === 0) {
            this.#items.delete(id);
        } else {
            this.#items.set(id, remaining);
        }
        return true;
    }

    hasItem(id, quantity) {
        return isItemId(id) && isPositiveQuantity(quantity) && this.getQuantity(id) >= quantity;
    }

    getQuantity(id) {
        return this.#items.get(id) ?? 0;
    }

    getAllItems() {
        return Object.fromEntries(this.#items);
    }

    clear() {
        this.#items.clear();
    }

    replaceItems(items) {
        if (items === null || typeof items !== 'object') return false;

        const prototype = Object.getPrototypeOf(items);
        if (prototype !== Object.prototype && prototype !== null) return false;

        const entries = Object.entries(items);
        if (entries.some(([id, quantity]) =>
            !isItemId(id) || !Number.isSafeInteger(quantity) || quantity < 0
        )) return false;

        this.#items = new Map(entries);
        return true;
    }
}
