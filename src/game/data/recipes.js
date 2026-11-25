const amount = (itemId, quantity) => Object.freeze({ itemId, quantity });

export const recipes = Object.freeze([
    Object.freeze({
        id: 'recipe_01',
        name: 'Công thức Thuốc Hồi Phục',
        difficulty: 'easy',
        ingredients: Object.freeze([
            amount('herb_01_dried', 2),
            amount('herb_02_extract', 1)
        ]),
        result: amount('potion_01', 1),
        unlockedByDefault: true,
        designStatus: 'experimental'
    }),
    Object.freeze({
        id: 'recipe_02',
        name: 'Công thức Thuốc Tập Trung',
        difficulty: 'medium',
        ingredients: Object.freeze([
            amount('herb_03_dried', 1),
            amount('herb_05_extract', 1),
            amount('herb_07_extract', 1)
        ]),
        result: amount('potion_02', 1),
        unlockedByDefault: true,
        designStatus: 'experimental'
    }),
    Object.freeze({
        id: 'recipe_03',
        name: 'Công thức Thuốc Sinh Lực',
        difficulty: 'medium',
        ingredients: Object.freeze([
            amount('herb_04_dried', 1),
            amount('herb_08_juice', 1),
            amount('herb_11_juice', 1)
        ]),
        result: amount('potion_03', 1),
        unlockedByDefault: true,
        designStatus: 'experimental'
    })
]);

export function getRecipe(id) {
    return recipes.find(recipe => recipe.id === id) ?? null;
}
