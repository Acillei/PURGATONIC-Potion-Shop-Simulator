import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameState } from '../src/game/state/GameState.js';

test('default state matches the actual World Map spawn and serializes to JSON', () => {
    const gameState = new GameState();
    assert.deepEqual(JSON.parse(JSON.stringify(gameState.getState())), {
        schemaVersion: 1,
        player: { currentScene: 'WorldMapScene', position: { x: 435, y: 1535 }, facing: 'down' },
        inventory: {},
        economy: { coins: 0 },
        progress: { unlockedAreas: ['potion_shop'] }
    });
});

test('TC-05: scene transitions preserve inventory, shop pose, and World Map pose', () => {
    const gameState = new GameState();
    const inventory = gameState.inventory;
    inventory.addItem('sample', 3);
    const worldPosition = { x: 435.5, y: 1490 };
    const shopSpawn = { position: { x: 724, y: 967 }, facing: 'up' };
    const shopPosition = { x: 1000, y: 830 };

    gameState.updatePlayerPose('WorldMapScene', worldPosition, 'right');
    assert.deepEqual(gameState.enterScene('ShopInteriorScene', shopSpawn), {
        currentScene: 'ShopInteriorScene',
        ...shopSpawn,
        worldReturn: { position: worldPosition, facing: 'right' }
    });

    gameState.updatePlayerPose('ShopInteriorScene', shopPosition, 'left');
    const station = gameState.enterScene('WorkstationScene', shopSpawn, 'storage');
    assert.deepEqual(station.position, shopPosition);
    assert.equal(station.facing, 'left');
    assert.equal(station.station, 'storage');
    assert.equal(gameState.updatePlayerPose('ShopInteriorScene', shopSpawn.position, 'up'), false);
    assert.equal(gameState.inventory, inventory);
    assert.equal(inventory.getQuantity('sample'), 3);

    const shop = gameState.enterScene('ShopInteriorScene', shopSpawn);
    assert.deepEqual(shop.position, shopPosition);
    assert.equal(shop.facing, 'left');

    assert.deepEqual(gameState.enterScene('WorldMapScene'), {
        currentScene: 'WorldMapScene',
        position: worldPosition,
        facing: 'right'
    });
    assert.deepEqual(inventory.getAllItems(), { sample: 3 });
});

test('reading or replacing a snapshot never hands out mutable state', () => {
    const gameState = new GameState();
    const snapshot = gameState.getState();
    snapshot.player.position.x = 500;
    snapshot.inventory.sample = 5;
    snapshot.economy.coins = 10;
    snapshot.progress.unlockedAreas.push('sample_area');

    assert.equal(gameState.getPlayer().position.x, 435);
    assert.equal(gameState.replaceState(snapshot), true);
    const expected = gameState.getState();
    snapshot.player.position.x = 600;
    snapshot.inventory.sample = 7;
    snapshot.economy.coins = 20;
    snapshot.progress.unlockedAreas.length = 0;
    assert.deepEqual(gameState.getState(), expected);
});
