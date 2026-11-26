import { afterEach, expect, it, vi } from 'vitest';
import { createDiary, uid } from '../src/model';

afterEach(() => vi.unstubAllGlobals());
it('局域网 HTTP 没有 randomUUID 时仍生成有效独立 ID', () => {
  vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
  const first = uid(), second = uid();
  expect(first).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  expect(first).not.toBe(second);
  const diary = createDiary();
  expect(diary.id).not.toBe(diary.pages[0].id);
});
