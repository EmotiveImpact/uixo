import { expect, it } from 'vitest';
import { highlightLine } from './highlight-code';

it('marks keywords, strings, components and tags without losing text', () => {
  const line = 'import { X } from "@/x" // note';
  const tokens = highlightLine(line);
  expect(tokens.map((token) => token.text).join('')).toBe(line);
  expect(tokens.find((token) => token.text === 'import')?.kind).toBe('keyword');
  expect(tokens.find((token) => token.text === '"@/x"')?.kind).toBe('string');
  expect(tokens.find((token) => token.text === '// note')?.kind).toBe('comment');
  const jsx = highlightLine('<Button><span>Hi</span></Button>');
  expect(jsx.filter((token) => token.kind === 'component').map((token) => token.text)).toEqual([
    'Button',
    'Button',
  ]);
  expect(jsx.filter((token) => token.kind === 'tag')).toHaveLength(2);
});
