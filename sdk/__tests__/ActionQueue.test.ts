// ─────────────────────────────────────────────────────────────────────────────
// ActionQueue.test.ts — Unit tests for persistent offline action queue
// ─────────────────────────────────────────────────────────────────────────────

import { ActionQueue } from '../queue/ActionQueue';

beforeEach(async () => {
  await ActionQueue.clear();
});

describe('ActionQueue.enqueue / getAll', () => {
  it('adds an action and retrieves it', async () => {
    await ActionQueue.enqueue('https://api.test.com/messages', 'POST', { text: 'Hello' });
    const all = await ActionQueue.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].method).toBe('POST');
    expect(all[0].status).toBe('pending');
    expect(all[0].body).toEqual({ text: 'Hello' });
  });

  it('preserves queue order (FIFO)', async () => {
    await ActionQueue.enqueue('https://api.test.com/a', 'POST', { order: 1 });
    await ActionQueue.enqueue('https://api.test.com/b', 'PUT',  { order: 2 });
    const all = await ActionQueue.getAll();
    expect(all[0].url).toContain('/a');
    expect(all[1].url).toContain('/b');
  });
});

describe('ActionQueue.dequeue', () => {
  it('removes a specific action by id', async () => {
    const a1 = await ActionQueue.enqueue('https://api.test.com/x', 'POST', {});
    const a2 = await ActionQueue.enqueue('https://api.test.com/y', 'DELETE', {});
    await ActionQueue.dequeue(a1.id);
    const all = await ActionQueue.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(a2.id);
  });
});

describe('ActionQueue.incrementRetry / markFailed', () => {
  it('increments retry counter', async () => {
    const a = await ActionQueue.enqueue('https://api.test.com/z', 'PATCH', {});
    const count = await ActionQueue.incrementRetry(a.id);
    expect(count).toBe(1);
    const all = await ActionQueue.getAll();
    expect(all[0].retries).toBe(1);
  });

  it('marks an action as failed', async () => {
    const a = await ActionQueue.enqueue('https://api.test.com/fail', 'POST', {});
    await ActionQueue.markFailed(a.id);
    const all = await ActionQueue.getAll();
    expect(all[0].status).toBe('failed');
  });
});

describe('ActionQueue.pendingCount', () => {
  it('counts only pending actions', async () => {
    const a = await ActionQueue.enqueue('https://api.test.com/p1', 'POST', {});
    await ActionQueue.enqueue('https://api.test.com/p2', 'POST', {});
    await ActionQueue.markFailed(a.id);
    expect(await ActionQueue.pendingCount()).toBe(1);
  });
});
