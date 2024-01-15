import { expect, test } from 'vitest';
import { getAirac, nextAirac } from "./airac";

test('returns the current AIRAC cycle string', () => {
  const airac = getAirac(new Date("2024/10/15"));
  expect(airac).toBe('03_OCT_2024');
});

test('computes the next AIRAC cycle', () => {
  const airac = nextAirac(new Date("2023/11/30"));
  expect(airac).toEqual(new Date("2023/12/28"));
});
