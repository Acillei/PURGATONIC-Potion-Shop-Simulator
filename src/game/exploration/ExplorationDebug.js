function drawShape(graphics, shape, color, alpha) {
    graphics.fillStyle(color, alpha);
    graphics.lineStyle(2, color, 0.85);
    switch (shape.type) {
        case 'rect': {
            const { left, top, right, bottom } = shape;
            graphics.fillRect(left, top, right - left, bottom - top);
            graphics.strokeRect(left, top, right - left, bottom - top);
            break;
        }
        case 'ellipse':
            graphics.fillEllipse(shape.x, shape.y, 2 * shape.radiusX, 2 * shape.radiusY);
            graphics.strokeEllipse(shape.x, shape.y, 2 * shape.radiusX, 2 * shape.radiusY);
            break;
        case 'polygon':
            graphics.fillPoints(shape.points, true);
            graphics.strokePoints(shape.points, true);
            break;
        case 'corridor':
            graphics.lineStyle(2 * shape.radius, color, alpha);
            graphics.strokePoints(shape.points);
            for (const { x, y } of shape.points) graphics.fillCircle(x, y, shape.radius);
            break;
    }
}

export function createExplorationDebug(scene, uiCamera, geometry) {
    const regions = scene.add.graphics().setDepth(89).setVisible(false);
    const foot = scene.add.graphics().setDepth(90).setVisible(false);
    const legend = scene.add.text(12, 0, 'F2    Xanh lá: sàn    Đỏ: collider    Xanh lam: tương tác    Vàng: chân', {
        fontSize: '14px',
        backgroundColor: '#31243d',
        color: '#fff0dc',
        padding: { x: 8, y: 5 }
    }).setOrigin(0, 1).setDepth(120).setVisible(false);
    uiCamera.ignore([regions, foot]);
    scene.cameras.main.ignore(legend);
    let drawn = false;

    scene.input.keyboard.addKey('F2').on('down', () => {
        const visible = !scene.registry.get('explorationDebug');
        scene.registry.set('explorationDebug', visible);
        show(visible);
    });

    function show(visible) {
        if (visible && !drawn) {
            drawShape(regions, geometry.bounds, 0x4fe282, 0);
            for (const shape of geometry.walkable) drawShape(regions, shape, 0x4fe282, 0.14);
            for (const shape of geometry.colliders) drawShape(regions, shape, 0xff5555, 0.3);
            for (const zone of geometry.zones) {
                for (const shape of zone.regions) drawShape(regions, shape, 0x53d1ff, 0.18);
            }
            drawn = true;
        }
        regions.setVisible(visible);
        foot.setVisible(visible);
        legend.setVisible(visible);
    }

    show(Boolean(scene.registry.get('explorationDebug')));
    return {
        resize(height) {
            legend.y = height - 12;
        },
        update({ x, y }) {
            if (!foot.visible) return;
            const { radiusX, radiusY } = geometry.footprint;
            foot.clear().lineStyle(2, 0xffec75)
                .strokeRect(x - radiusX, y - radiusY, 2 * radiusX, 2 * radiusY)
                .fillStyle(0xffec75).fillCircle(x, y, 3);
        }
    };
}
