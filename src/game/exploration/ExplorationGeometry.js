export const rect = (left, top, right, bottom) => ({ type: 'rect', left, top, right, bottom });
export const circle = (x, y, radius) => ({ type: 'ellipse', x, y, radiusX: radius, radiusY: radius });
export const ellipse = (x, y, radiusX, radiusY) => ({ type: 'ellipse', x, y, radiusX, radiusY });
export const polygon = (...pairs) => ({ type: 'polygon', points: pairs.map(([x, y]) => ({ x, y })) });
export const corridor = (points, radius) => ({ type: 'corridor', points, radius });

function distanceToSegment(x, y, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const along = ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1);
    const t = Math.max(0, Math.min(1, along));
    return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
}

export function distanceToPath(x, y, points) {
    let distance = Infinity;
    for (let i = 1; i < points.length; i++) {
        distance = Math.min(distance, distanceToSegment(x, y, points[i - 1], points[i]));
    }
    return distance;
}

function polygonContains(points, x, y) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[j];
        const b = points[i];
        if (distanceToSegment(x, y, a, b) < 1e-8) return true;
        if ((a.y > y) !== (b.y > y) && x < a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y)) {
            inside = !inside;
        }
    }
    return inside;
}

export function containsPoint(shape, x, y) {
    switch (shape.type) {
        case 'rect':
            return x >= shape.left && x <= shape.right && y >= shape.top && y <= shape.bottom;
        case 'ellipse':
            return ((x - shape.x) / shape.radiusX) ** 2 + ((y - shape.y) / shape.radiusY) ** 2 <= 1;
        case 'corridor':
            return distanceToPath(x, y, shape.points) <= shape.radius;
        case 'polygon':
            return polygonContains(shape.points, x, y);
        default:
            throw new TypeError('Unknown exploration shape: ' + shape.type);
    }
}

function boundsOf(shape) {
    if (shape.type === 'rect') return shape;
    if (shape.type === 'ellipse') {
        return rect(shape.x - shape.radiusX, shape.y - shape.radiusY,
            shape.x + shape.radiusX, shape.y + shape.radiusY);
    }
    const xs = shape.points.map(point => point.x);
    const ys = shape.points.map(point => point.y);
    const radius = shape.radius ?? 0;
    return rect(Math.min(...xs) - radius, Math.min(...ys) - radius,
        Math.max(...xs) + radius, Math.max(...ys) + radius);
}

function crossesBox(a, b, box) {
    let enter = 0;
    let exit = 1;
    for (const [start, end, min, max] of [
        [a.x, b.x, box.left, box.right], [a.y, b.y, box.top, box.bottom]
    ]) {
        if (start === end) {
            if (start < min || start > max) return false;
            continue;
        }
        const first = (min - start) / (end - start);
        const last = (max - start) / (end - start);
        enter = Math.max(enter, Math.min(first, last));
        exit = Math.min(exit, Math.max(first, last));
        if (enter > exit) return false;
    }
    return true;
}

function intersectsFoot(shape, x, y, radiusX, radiusY) {
    const left = x - radiusX;
    const right = x + radiusX;
    const top = y - radiusY;
    const bottom = y + radiusY;
    if (shape.type === 'rect') {
        return right > shape.left && left < shape.right && bottom > shape.top && top < shape.bottom;
    }
    if (shape.type === 'ellipse') {
        const dx = Math.max(Math.abs(x - shape.x) - radiusX, 0) / shape.radiusX;
        const dy = Math.max(Math.abs(y - shape.y) - radiusY, 0) / shape.radiusY;
        return dx * dx + dy * dy < 1;
    }
    const points = shape.points;
    if (polygonContains(points, x, y)) return true;
    const box = { left, top, right, bottom };
    return points.some((point, i) => crossesBox(point, points[(i + 1) % points.length], box));
}

const CELL_SIZE = 128;
const MAX_STEP = 3;

export function createCollision({ bounds, walkable, colliders, footprint }) {
    const { radiusX, radiusY } = footprint;
    const cells = new Map();
    for (const shape of colliders) {
        const area = boundsOf(shape);
        for (let row = Math.floor((area.top - radiusY) / CELL_SIZE);
            row <= Math.floor((area.bottom + radiusY) / CELL_SIZE); row++) {
            for (let column = Math.floor((area.left - radiusX) / CELL_SIZE);
                column <= Math.floor((area.right + radiusX) / CELL_SIZE); column++) {
                const key = column + ',' + row;
                if (!cells.has(key)) cells.set(key, []);
                cells.get(key).push(shape);
            }
        }
    }

    function canStand(x, y) {
        if (!containsPoint(bounds, x, y) || !walkable.some(shape => containsPoint(shape, x, y))) return false;
        const key = Math.floor(x / CELL_SIZE) + ',' + Math.floor(y / CELL_SIZE);
        return !cells.get(key)?.some(shape => intersectsFoot(shape, x, y, radiusX, radiusY));
    }

    let escape;
    return {
        canStand,
        move(position, dx, dy) {
            if (canStand(position.x, position.y)) {
                escape = undefined;
            } else if (escape === undefined) {
                escape = findNearbyFloor(position, canStand);
            }
            return moveFoot(position, dx, dy, canStand, escape);
        }
    };
}

function findNearbyFloor(position, canStand) {
    // An older save can begin inside a revised collider. Let movement lead out without teleporting.
    const step = 4;
    for (let distance = step; distance <= 96; distance += step) {
        let closest = null;
        let best = Infinity;
        for (let dy = -distance; dy <= distance; dy += step) {
            for (let dx = -distance; dx <= distance; dx += step) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== distance) continue;
                const cost = dx * dx + dy * dy;
                const x = position.x + dx;
                const y = position.y + dy;
                if (cost < best && canStand(x, y)) {
                    closest = { x, y };
                    best = cost;
                }
            }
        }
        if (closest) return closest;
    }
    return null;
}

export function moveFoot({ x, y }, dx, dy, canStand, escape) {
    const steps = Math.ceil(Math.hypot(dx, dy) / MAX_STEP);
    const stepX = dx / steps;
    const stepY = dy / steps;
    for (let i = 0; i < steps; i++) {
        const nextX = x + stepX;
        const nextY = y + stepY;
        const onFloor = !escape || canStand(x, y);
        const canStep = (toX, toY) => canStand(toX, toY) || (!onFloor &&
            Math.hypot(toX - escape.x, toY - escape.y) < Math.hypot(x - escape.x, y - escape.y));
        const alongX = stepX !== 0 && canStep(nextX, y);
        const alongY = stepY !== 0 && canStep(x, nextY);

        // Require an open approach to a diagonal destination, then slide along the free axis.
        if (stepX !== 0 && stepY !== 0 && (alongX || alongY) && canStep(nextX, nextY)) {
            x = nextX;
            y = nextY;
        } else if (alongX && (!alongY || Math.abs(stepX) >= Math.abs(stepY))) {
            x = nextX;
        } else if (alongY) {
            y = nextY;
        } else {
            break;
        }
    }
    return { x, y };
}

export function findInteraction({ x, y }, zones, canStand) {
    if (!canStand(x, y)) return null;
    return zones.find(zone => zone.regions.some(shape => containsPoint(shape, x, y))) ?? null;
}
