/** A light TSX tokeniser for the detail page's Code tab: keywords, strings, comments and tags. */
export type CodeToken = {
  text: string;
  kind?: 'keyword' | 'string' | 'comment' | 'component' | 'tag';
};

const KEYWORDS = new Set([
  'import',
  'from',
  'export',
  'default',
  'function',
  'return',
  'const',
  'let',
  'var',
  'if',
  'else',
  'type',
  'interface',
  'extends',
  'async',
  'await',
  'new',
  'as',
  'true',
  'false',
  'null',
  'undefined',
]);

const PATTERN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(<\/?)([A-Za-z][\w.]*)|\b([A-Za-z_]\w*)\b/g;

export function highlightLine(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let last = 0;
  const push = (text: string, kind?: CodeToken['kind']) => {
    if (!text) return;
    const previous = tokens[tokens.length - 1];
    if (!kind && previous && !previous.kind) previous.text += text;
    else tokens.push(kind ? { text, kind } : { text });
  };
  for (const match of line.matchAll(PATTERN)) {
    const index = match.index ?? 0;
    push(line.slice(last, index));
    const [whole, comment, string, bracket, tag, word] = match;
    if (comment) push(comment, 'comment');
    else if (string) push(string, 'string');
    else if (bracket && tag) {
      push(bracket);
      push(tag, /^[A-Z]/.test(tag) ? 'component' : 'tag');
    } else if (word && KEYWORDS.has(word)) push(word, 'keyword');
    else push(whole);
    last = index + whole.length;
  }
  push(line.slice(last));
  return tokens;
}
