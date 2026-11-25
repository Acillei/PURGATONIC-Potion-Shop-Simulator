import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getItem } from '../src/game/data/itemRegistry.js';
import { potions } from '../src/game/data/potions.js';
import { recipes, getRecipe } from '../src/game/data/recipes.js';
import { GameState } from '../src/game/state/GameState.js';

const isPositiveSafeInteger = value => Number.isSafeInteger(value) && value > 0;

test('TC-05: recipes refer only to registered processed ingredient IDs', () => {
    for (const recipe of recipes) {
        for (const input of recipe.ingredients) {
            assert.match(input.itemId, /_processed$/);
            assert.equal(getItem(input.itemId)?.category, 'processed_ingredient', recipe.id);
        }
    }
});

test('TC-06: each recipe uses at least two distinct ingredients with positive safe quantities', () => {
    for (const { id, ingredients } of recipes) {
        assert.ok(ingredients.length >= 2, id);
        assert.equal(new Set(ingredients.map(input => input.itemId)).size, ingredients.length, id);
        for (const input of ingredients) assert.ok(isPositiveSafeInteger(input.quantity), id);
    }
});

test('TC-07: the three starter recipes match the approved experimental inputs and difficulty', () => {
    const shape = (id, difficulty, inputs, resultId) => ({
        id,
        difficulty,
        inputs: inputs.map(([itemId, quantity]) => ({ itemId, quantity })),
        result: { itemId: resultId, quantity: 1 },
        unlockedByDefault: true,
        designStatus: 'experimental'
    });
    assert.deepEqual(
        recipes.map(({ id, difficulty, ingredients, result, unlockedByDefault, designStatus }) =>
            ({ id, difficulty, inputs: ingredients, result, unlockedByDefault, designStatus })),
        [
            shape('recipe_01', 'easy', [['herb_01_processed', 2], ['herb_02_processed', 1]], 'potion_01'),
            shape('recipe_02', 'medium', [
                ['herb_03_processed', 1], ['herb_05_processed', 1], ['herb_07_processed', 1]
            ], 'potion_02'),
            shape('recipe_03', 'medium', [
                ['herb_04_processed', 1], ['herb_08_processed', 1], ['herb_11_processed', 1]
            ], 'potion_03')
        ]
    );
    for (const recipe of recipes) {
        assert.ok(recipe.name.trim(), recipe.id);
        assert.equal(getRecipe(recipe.id), recipe);
    }
    assert.equal(getRecipe('unknown_recipe'), null);
});

test('TC-08: outputs are valid potions, with safe quantities and no path back to recipe inputs', () => {
    const outputIds = recipes.map(recipe => recipe.result.itemId);
    assert.deepEqual(outputIds.sort(), potions.map(potion => potion.id).sort());
    for (const recipe of recipes) {
        assert.equal(getItem(recipe.result.itemId)?.category, 'potion', recipe.id);
        assert.ok(isPositiveSafeInteger(recipe.result.quantity), recipe.id);
        for (const input of recipe.ingredients) {
            assert.ok(!outputIds.includes(input.itemId), recipe.id);
        }
    }
});

test('TC-09: recipe lookups cannot mutate nested inputs or results', () => {
    assert.ok(Object.isFrozen(recipes));
    for (const recipe of recipes) {
        assert.ok(Object.isFrozen(recipe) && Object.isFrozen(recipe.ingredients));
        assert.ok(recipe.ingredients.every(Object.isFrozen));
        assert.ok(Object.isFrozen(recipe.result));
    }

    const recipe = getRecipe('recipe_01');
    assert.throws(() => { recipe.ingredients[0].quantity = 99; }, TypeError);
    assert.throws(() => { recipe.result.itemId = 'potion_03'; }, TypeError);
    assert.equal(getRecipe('recipe_01').ingredients[0].quantity, 2);
    assert.equal(getRecipe('recipe_01').result.itemId, 'potion_01');
});

test('looking up a recipe with sufficient inputs neither consumes ingredients nor awards a potion', () => {
    const gameState = new GameState();
    const { inventory } = gameState;
    inventory.addItem('herb_01_processed', 2);
    inventory.addItem('herb_02_processed', 1);
    const before = gameState.getState();

    const recipe = getRecipe('recipe_01');
    assert.ok(recipe.ingredients.every(({ itemId, quantity }) =>
        getItem(itemId) && inventory.hasItem(itemId, quantity)));
    assert.ok(getItem(recipe.result.itemId));
    assert.equal(inventory.getQuantity(recipe.result.itemId), 0);
    assert.deepEqual(gameState.getState(), before);
});
