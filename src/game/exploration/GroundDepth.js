export function groundPosition({ x, y }, offset) {
    return { x: x + offset.x, y: y + offset.y };
}

export function sortByGround(sprite, offset) {
    return sprite.setDepth(groundPosition(sprite, offset).y);
}
