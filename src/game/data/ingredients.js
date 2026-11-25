const catalog = {
    herb_01: {
        name: 'Linh Lan Sương',
        description: 'Những chuông hoa trắng giữ giọt sương qua cả bình minh.',
        gatherArea: 'flower_garden',
        refiningMethod: 'dry',
        refinedId: 'herb_01_dried'
    },
    herb_02: {
        name: 'Hoa Lam Tinh',
        description: 'Cánh hoa lam lấp lánh như sao rơi bên lối vườn.',
        gatherArea: 'flower_garden',
        refiningMethod: 'extract',
        refinedId: 'herb_02_extract'
    },
    herb_03: {
        name: 'Oải Hương Mộng',
        description: 'Hương từ những nhánh tím gợi lại giấc mơ vừa quên.',
        gatherArea: 'flower_garden',
        refiningMethod: 'dry',
        refinedId: 'herb_03_dried'
    },
    herb_04: {
        name: 'Cúc Nhật Quang',
        description: 'Cụm hoa màu kem vẫn ửng sắc nắng sau khi trời tắt.',
        gatherArea: 'flower_garden',
        refiningMethod: 'dry',
        refinedId: 'herb_04_dried'
    },
    herb_05: {
        name: 'Nấm Sương Lam',
        description: 'Những mũ nấm xanh nhạt hiện ra lờ mờ trong sương.',
        gatherArea: 'mushroom_grove',
        refiningMethod: 'extract',
        refinedId: 'herb_05_extract'
    },
    herb_06: {
        name: 'Dương Xỉ Xoắn',
        description: 'Những chồi non cuộn lại như dấu ấn cổ dưới tán rừng.',
        gatherArea: 'herb_forest',
        refiningMethod: 'grind',
        refinedId: 'herb_06_powder'
    },
    herb_07: {
        name: 'Lá Lục Linh',
        description: 'Gân sáng trên phiến lá xanh hiện rõ dưới bóng cây.',
        gatherArea: 'herb_forest',
        refiningMethod: 'extract',
        refinedId: 'herb_07_extract'
    },
    herb_08: {
        name: 'Cỏ Kim Châu',
        description: 'Lá tròn ánh vàng như đọng những hạt sáng nhỏ.',
        gatherArea: 'herb_forest',
        refiningMethod: 'press',
        refinedId: 'herb_08_juice'
    },
    herb_09: {
        name: 'Quả Hồng Lộ',
        description: 'Chùm quả đỏ căng mọng, bóng như vừa ngấm sương hồng.',
        gatherArea: 'herb_forest',
        refiningMethod: 'press',
        refinedId: 'herb_09_juice'
    },
    herb_10: {
        name: 'Nấm Hỏa Đốm',
        description: 'Những đốm sáng trên mũ đỏ trông như tàn lửa.',
        gatherArea: 'mushroom_grove',
        refiningMethod: 'grind',
        refinedId: 'herb_10_powder'
    },
    herb_11: {
        name: 'Quả Tử Mộng',
        description: 'Quả tím xanh mang sắc trời ngay trước khi đêm xuống.',
        gatherArea: 'herb_forest',
        refiningMethod: 'press',
        refinedId: 'herb_11_juice'
    },
    herb_12: {
        name: 'Nấm Tinh Nguyệt',
        description: 'Mũ nấm lam ánh bạc, vương những hạt sáng như bụi sao.',
        gatherArea: 'mushroom_grove',
        refiningMethod: 'grind',
        refinedId: 'herb_12_powder'
    }
};

const refinedNames = {
    dry: name => `${name} Khô`,
    extract: name => `Chiết Xuất ${name}`,
    grind: name => `Bột ${name}`,
    press: name => `Nước Ép ${name}`
};

const spritePath = id => `/assets/sprites/${id}.png`;
const processedId = rawId => `${rawId}_processed`;

export const ingredients = Object.freeze(
    Object.entries(catalog).map(([id, { name, description, gatherArea, refiningMethod }]) =>
        Object.freeze({
            id,
            name,
            category: 'raw_ingredient',
            description,
            assetPath: spritePath(id),
            gatherArea,
            processingMethod: null,
            refiningMethod,
            designStatus: 'approved'
        })
    )
);

export const processedIngredients = Object.freeze(ingredients.map(({ id: rawIngredientId, name }) => {
    const id = processedId(rawIngredientId);
    return Object.freeze({
        id,
        rawIngredientId,
        name: `${name} đã sơ chế`,
        category: 'processed_ingredient',
        description: 'Dạng đã sơ chế của nguyên liệu gốc.',
        assetPath: spritePath(id),
        gatherArea: null,
        processingMethod: null,
        designStatus: 'provisional'
    });
}));

export const refinedIngredients = Object.freeze(
    Object.entries(catalog).map(([rawIngredientId, { refinedId: id, name, refiningMethod }]) =>
        Object.freeze({
            id,
            rawIngredientId,
            processedIngredientId: processedId(rawIngredientId),
            name: refinedNames[refiningMethod](name),
            category: 'refined_ingredient',
            description: `Dạng tinh chế từ ${name} đã sơ chế.`,
            assetPath: spritePath(id),
            gatherArea: null,
            processingMethod: null,
            refiningMethod,
            designStatus: 'approved'
        })
    )
);
