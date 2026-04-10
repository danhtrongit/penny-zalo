import test from 'node:test';
import assert from 'node:assert/strict';

import { RequestBusyGuard } from './requestBusyGuard.js';

test('RequestBusyGuard rejects overlapping work for the same key and releases after completion', async () => {
  const guard = new RequestBusyGuard<string>();
  let releaseFirstTask!: () => void;

  const firstTask = guard.run(
    'chat-1',
    async () => 'busy',
    async () =>
      await new Promise<string>((resolve) => {
        releaseFirstTask = () => resolve('first');
      }),
  );

  const secondTask = await guard.run(
    'chat-1',
    async () => 'busy',
    async () => 'second',
  );

  assert.equal(secondTask, 'busy');

  releaseFirstTask();
  assert.equal(await firstTask, 'first');

  const thirdTask = await guard.run(
    'chat-1',
    async () => 'busy',
    async () => 'third',
  );

  assert.equal(thirdTask, 'third');
});

test('RequestBusyGuard allows different keys to run independently', async () => {
  const guard = new RequestBusyGuard<string>();
  let releaseFirstTask!: () => void;
  const calls: string[] = [];

  const firstTask = guard.run(
    'chat-1',
    async () => 'busy',
    async () =>
      await new Promise<string>((resolve) => {
        calls.push('chat-1:start');
        releaseFirstTask = () => {
          calls.push('chat-1:end');
          resolve('first');
        };
      }),
  );

  const secondTask = await guard.run(
    'chat-2',
    async () => 'busy',
    async () => {
      calls.push('chat-2:run');
      return 'second';
    },
  );

  assert.equal(secondTask, 'second');
  releaseFirstTask();
  assert.equal(await firstTask, 'first');
  assert.deepEqual(calls, ['chat-1:start', 'chat-2:run', 'chat-1:end']);
});
