import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { createExplorationCamera, observeGameContainer, viewportZoom } from '../src/game/exploration/ExplorationCamera.js';

test('shop camera keeps its composition and covers desktop, laptop and landscape viewports', () => {
    const bounds = { width: 1448, height: 1086 };
    const target = { width: 1320, height: 800 };
    for (const [width, height] of [[1920, 1080], [1366, 768], [844, 390], [843, 391]]) {
        const zoom = viewportZoom(width, height, bounds, 1, target);
        assert.equal(zoom, Math.max(width / 1320, height / 800));
        assert.ok(width / zoom <= bounds.width && height / zoom <= bounds.height);
    }
});

test('independent World Map zoom stays within the world at wide fullscreen sizes', () => {
    const bounds = { width: 2560, height: 1920 };
    assert.equal(viewportZoom(1366, 768, bounds, 0.75), 0.75);
    assert.equal(viewportZoom(3200, 1800, bounds, 0.75), 1.25);
    assert.equal(viewportZoom(844, 390, bounds, 1.7), 1.7);
});

test('container resize updates Phaser when the browser changes the layout and disconnects on destroy', () => {
    const container = { clientWidth: 1366, clientHeight: 768 };
    const game = {
        events: new EventEmitter(),
        scale: {
            gameSize: { width: 1366, height: 768 },
            setParentSize(width, height) { this.gameSize = { width, height }; }
        }
    };
    let notify;
    let disconnected = false;
    class Observer {
        constructor(callback) { notify = callback; }
        observe(target) { assert.equal(target, container); }
        disconnect() { disconnected = true; }
    }
    observeGameContainer(game, container, Observer);
    Object.assign(container, { clientWidth: 844, clientHeight: 390 });
    notify();
    assert.deepEqual(game.scale.gameSize, { width: 844, height: 390 });
    game.events.emit('destroy');
    assert.equal(disconnected, true);
});

test('camera resize preserves center, updates the HUD, and unregisters on shutdown', () => {
    const world = {
        midPoint: { x: 570, y: 730 },
        setBounds(...bounds) { this.bounds = bounds; },
        startFollow(...args) { this.follow = args; },
        setSize(width, height) { this.width = width; this.height = height; },
        setZoom(zoom) { this.zoom = zoom; },
        get displayWidth() { return this.width / this.zoom; },
        get displayHeight() { return this.height / this.zoom; },
        setDeadzone(x, y) { this.deadzone = { x, y }; this.midPoint = { x: 0, y: 0 }; },
        centerOn(x, y) { this.midPoint = { x, y }; }
    };
    const ui = { setSize(width, height) { this.size = { width, height }; } };
    const scale = new EventEmitter();
    scale.gameSize = { width: 1366, height: 768 };
    let boundsUpdates = 0;
    scale.updateBounds = () => { boundsUpdates++; };
    const scene = { cameras: { main: world, add: () => ui }, scale, events: new EventEmitter() };
    const target = { x: 575, y: 740 };
    const camera = createExplorationCamera(scene, target, {
        bounds: { width: 2560, height: 1920 }, deadzone: { x: 0.43, y: 0.38 },
        zoomLimits: { min: 0.75, max: 1.7 }
    });
    const layouts = [];
    camera.start((width, height) => layouts.push([width, height]));
    assert.equal(boundsUpdates, 1);
    assert.deepEqual(world.follow, [target, true, 0.18, 0.18, 0, 0]);
    assert.deepEqual(world.bounds, [0, 0, 2560, 1920]);
    assert.equal(camera.adjustZoom(0.15), 1.15);
    scale.gameSize = { width: 844, height: 390 };
    scale.emit('resize', scale.gameSize);
    assert.equal(world.zoom, 1.15);
    assert.deepEqual(world.midPoint, { x: 570, y: 730 });
    assert.deepEqual(ui.size, scale.gameSize);
    assert.deepEqual(layouts, [[1366, 768], [844, 390]]);
    scene.events.emit('shutdown');
    assert.equal(scale.listenerCount('resize'), 0);
});
