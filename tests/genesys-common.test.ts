import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPagedResponse } from '../src/mcp-functions/genesys-common.ts';

test('getPagedResponse forwards parameters and collects successive pages', async () => {
  const calls: { state: string; pageSize: number; pageNumber: number }[] = [];
  const result = await getPagedResponse(
    async (params: { state: string; pageSize: number; pageNumber: number }) => {
      calls.push(params);
      return {
        entities:
          params.pageNumber === 1
            ? Array.from({ length: 100 }, (_, id) => ({ id }))
            : [{ id: 100 }],
      };
    },
    { state: 'active' },
  );
  assert.deepEqual(calls, [
    { state: 'active', pageSize: 100, pageNumber: 1 },
    { state: 'active', pageSize: 100, pageNumber: 2 },
  ]);
  assert.equal(result.length, 101);
  assert.deepEqual(result[100], { id: 100 });
});

test('getPagedResponse handles empty pages and rejects malformed responses', async () => {
  assert.deepEqual(await getPagedResponse(async () => ({ entities: [] }), {}), []);
  await assert.rejects(
    getPagedResponse(async () => ({}), {}),
    /missing its entities array/,
  );
});
