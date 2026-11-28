import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { mountGame } from '../src/game/mountGame.js';

function pendingImport() {
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
    });
    return { promise, resolve, reject };
}

test('React effect replay creates one game for the prepared entry and destroys it once on unmount', async () => {
    const parent = {};
    const entry = {};
    const requests = [];
    const creations = [];
    const destructions = [];
    const loadGame = async () => {
        requests.push('load');
        return {
            createGame(element, preparedEntry) {
                creations.push([element, preparedEntry]);
                return { destroy: removeCanvas => destructions.push(removeCanvas) };
            }
        };
    };
    const onError = error => assert.fail(error);

    const discardFirstEffect = mountGame(parent, entry, onError, loadGame);
    discardFirstEffect();
    const cleanup = mountGame(parent, entry, onError, loadGame);
    assert.deepEqual(requests, []);
    assert.deepEqual(creations, []);
    await setImmediate();
    assert.deepEqual(requests, ['load']);
    assert.deepEqual(creations, [[parent, entry]]);
    assert.deepEqual(destructions, []);

    cleanup();
    cleanup();
    assert.deepEqual(destructions, [true]);
});

test('unmount while the gameplay module is loading prevents a late Phaser instance', async () => {
    const { promise, resolve } = pendingImport();
    const cleanup = mountGame({}, {}, error => assert.fail(error), () => promise);
    await setImmediate();
    cleanup();
    resolve({ createGame: () => assert.fail('A canceled mount must not create Phaser') });
    await setImmediate();
});

test('a gameplay import failure is reported only while the view is mounted', async () => {
    const error = new Error('Module unavailable');
    const errors = [];
    const onError = failure => errors.push(failure);
    const report = mountGame({}, {}, onError, () => Promise.reject(error));
    await setImmediate();
    assert.deepEqual(errors, [error]);
    report();

    const { promise, reject } = pendingImport();
    const canceled = mountGame({}, {}, onError, () => promise);
    await setImmediate();
    canceled();
    reject(error);
    await setImmediate();
    assert.deepEqual(errors, [error]);
});
