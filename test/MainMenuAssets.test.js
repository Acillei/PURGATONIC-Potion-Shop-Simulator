import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const assetRoot = new URL('../public/assets/ui/main-menu/', import.meta.url);
const layout = JSON.parse(await readFile(new URL('layout.json', assetRoot), 'utf8'));

test('Main Menu v7 records the approved placement in the background reference frame', () => {
    assert.equal(layout.version, '7.0');
    assert.deepEqual(layout.referenceResolution, [1672, 940]);
    assert.deepEqual(layout.placement, {
        logo: { center: [535, 350], width: 600 },
        buttons: {
            play: { center: [1230, 416], size: [400, 100] },
            settings: { center: [1230, 530], size: [400, 100] },
            info: { center: [1230, 644], size: [400, 100] }
        }
    });
});

test('Main Menu v7 resolves unique RGBA PNGs for the background, logo, and all button states', async () => {
    assert.equal(layout.background, 'main_menu_background.png');
    assert.equal(layout.logo, 'main_menu_logo.png');
    assert.deepEqual(Object.keys(layout.buttons).sort(), ['info', 'play', 'settings']);

    const imageSizes = new Map([
        [layout.background, layout.referenceResolution],
        [layout.logo, [761, 468]]
    ]);
    for (const [button, { states, size }] of Object.entries(layout.buttons)) {
        assert.deepEqual(size, [512, 128], button);
        assert.deepEqual(Object.keys(states).sort(), ['hover', 'normal', 'pressed'], button);
        for (const [state, name] of Object.entries(states)) {
            assert.equal(name, `button_${button}_${state}.png`);
            assert.equal(imageSizes.has(name), false, name);
            imageSizes.set(name, size);
        }
    }

    assert.equal(imageSizes.size, 11);
    await Promise.all([...imageSizes].map(async ([name, size]) => {
        const png = await readFile(new URL(name, assetRoot));
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', name);
        assert.equal(png.toString('ascii', 12, 16), 'IHDR', name);
        assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], size, name);
        assert.equal(png[25], 6, name);
    }));
});
