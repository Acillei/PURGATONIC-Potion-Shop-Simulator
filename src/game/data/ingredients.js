const spriteDescriptions = {
    herb_01: 'Lá xanh với cụm trắng hình chuông rủ xuống.',
    herb_02: 'Lá xanh với cụm cánh nhọn màu xanh nhạt.',
    herb_03: 'Bụi lá dài với nhánh màu tím mọc hướng lên.',
    herb_04: 'Lá xanh với các cụm hoa nhỏ màu kem.',
    herb_05: 'Bụi lá xanh với các cụm tròn màu xanh nhạt trên cuống.',
    herb_06: 'Các chồi xanh cuộn xoắn ở đầu.',
    herb_07: 'Cụm lá bản rộng với gân lá sáng.',
    herb_08: 'Cụm lá tròn xanh vàng có các đốm sáng.',
    herb_09: 'Cụm quả đỏ tròn giữa các lá xanh.',
    herb_10: 'Cụm hình nấm có mũ đỏ với đốm sáng.',
    herb_11: 'Cụm quả tròn màu tím xanh giữa các lá xanh.',
    herb_12: 'Cặp hình nấm mũ xanh có các đốm sáng xung quanh.'
};

export const ingredients = Object.freeze(Object.entries(spriteDescriptions).map(([id, description]) =>
    Object.freeze({
        id,
        name: `Nguyên liệu ${id.slice(-2)}`,
        category: 'raw_ingredient',
        description,
        assetPath: `/assets/sprites/${id}.png`,
        gatherArea: null,
        processingMethod: null,
        designStatus: 'provisional'
    })
));

export const processedIngredients = Object.freeze(ingredients.map(ingredient => Object.freeze({
    id: `${ingredient.id}_processed`,
    rawIngredientId: ingredient.id,
    name: `${ingredient.name} đã sơ chế`,
    category: 'processed_ingredient',
    description: 'Dạng đã sơ chế của nguyên liệu gốc.',
    assetPath: null,
    gatherArea: null,
    processingMethod: null,
    designStatus: 'provisional'
})));
