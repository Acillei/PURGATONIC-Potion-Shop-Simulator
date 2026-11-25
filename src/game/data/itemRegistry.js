import { ingredients, processedIngredients, refinedIngredients } from './ingredients.js';
import { potions } from './potions.js';

export const items = Object.freeze([...ingredients, ...processedIngredients, ...refinedIngredients, ...potions]);

const itemsById = new Map();
for (const item of items) {
    if (itemsById.has(item.id)) throw new Error(`Duplicate item ID: ${item.id}`);
    itemsById.set(item.id, item);
}

export function getItem(id) {
    return itemsById.get(id) ?? null;
}
