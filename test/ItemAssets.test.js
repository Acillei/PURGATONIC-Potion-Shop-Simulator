import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { items } from '../src/game/data/itemRegistry.js';

const spriteSizes = {
    raw_ingredient: 64,
    processed_ingredient: 128,
    refined_ingredient: 128,
    potion: 1254
};

test('TC-04: Vite serves the original RGBA PNG for every registered item', async () => {
    const vite = await createServer({
        root: fileURLToPath(new URL('../', import.meta.url)),
        logLevel: 'silent',
        server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
        optimizeDeps: { noDiscovery: true }
    });

    try {
        await vite.listen();
        const { port } = vite.httpServer.address();
        await Promise.all(items.map(async ({ id, assetPath, category }) => {
            assert.equal(assetPath, `/assets/sprites/${id}.png`);
            const file = await readFile(new URL(`../public${assetPath}`, import.meta.url));
            assert.equal(file.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', id);
            assert.equal(file.toString('ascii', 12, 16), 'IHDR', id);
            assert.equal(file.readUInt32BE(16), spriteSizes[category], id);
            assert.equal(file.readUInt32BE(20), spriteSizes[category], id);
            assert.equal(file[25], 6, id);

            const response = await fetch(`http://127.0.0.1:${port}${assetPath}`);
            assert.equal(response.status, 200, id);
            assert.equal(response.headers.get('content-type'), 'image/png', id);
            assert.deepEqual(Buffer.from(await response.arrayBuffer()), file, id);
        }));
    } finally {
        await vite.close();
    }
});
