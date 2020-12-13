import codeFrame from '@babel/code-frame';

export function getLineColumn(source: string, pos: number): { line: number; column: number } {
  let line = 1, column = 0;
  for (let i = 0; i <= pos; i++) {
    const char = source.codePointAt(i);
    if (char === 10) {
      line += 1;
      column = 0;
    } else {
      column += 1;
    }
  }
  return {line, column};
}

export function printCodeFrame(source: string, lineOrPos: number, column?: number) {
  let line = lineOrPos;
  if (!column) {
    const loc = getLineColumn(source, lineOrPos);
    line = loc.line;
    column = loc.column;
  }
  console.log(
    codeFrame(source, line, column, {highlightCode: true})
  );
}
