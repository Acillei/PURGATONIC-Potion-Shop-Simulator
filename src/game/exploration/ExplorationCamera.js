export function viewportZoom(width, height, bounds, requested, targetView) {
    const preferred = targetView
        ? Math.max(width / targetView.width, height / targetView.height)
        : requested;
    return Math.max(preferred, width / bounds.width, height / bounds.height);
}

export function observeGameContainer(game, container, Observer = globalThis.ResizeObserver) {
    if (!Observer || !container) return;
    const observer = new Observer(() => {
        const { clientWidth, clientHeight } = container;
        const { width, height } = game.scale.gameSize;
        if (clientWidth > 0 && clientHeight > 0 && (clientWidth !== width || clientHeight !== height)) {
            game.scale.setParentSize(clientWidth, clientHeight);
        }
    });
    observer.observe(container);
    game.events.once('destroy', () => observer.disconnect());
}

export function createExplorationCamera(scene, target, {
    bounds, deadzone, offsetY = 0, zoom = 1, targetView, zoomLimits
}) {
    const world = scene.cameras.main;
    const ui = scene.cameras.add();
    world.setBounds(0, 0, bounds.width, bounds.height);
    world.startFollow(target, true, 0.18, 0.18, 0, offsetY);

    let requestedZoom = zoom;
    let onLayout;
    function updateZoom(width, height, x, y) {
        world.setZoom(viewportZoom(width, height, bounds, requestedZoom, targetView));
        world.setDeadzone(world.displayWidth * deadzone.x, world.displayHeight * deadzone.y);
        world.centerOn(x, y);
    }

    function resize({ width, height }) {
        if (width <= 0 || height <= 0) return;
        const { x, y } = world.midPoint;
        world.setSize(width, height);
        updateZoom(width, height, x, y);
        ui.setSize(width, height);
        onLayout(width, height);
    }

    return {
        world,
        ui,
        start(layout) {
            onLayout = layout;
            // The first scene can boot after the canvas has been centered by the page layout.
            scene.scale.updateBounds();
            resize(scene.scale.gameSize);
            scene.scale.on('resize', resize);
            scene.events.once('shutdown', () => scene.scale.off('resize', resize));
        },
        adjustZoom(amount) {
            const current = world.zoom;
            requestedZoom = Math.max(zoomLimits.min, Math.min(zoomLimits.max,
                Math.round((current + amount) * 100) / 100));
            const { width, height } = scene.scale.gameSize;
            const { x, y } = world.midPoint;
            updateZoom(width, height, x, y);
            return world.zoom;
        }
    };
}
