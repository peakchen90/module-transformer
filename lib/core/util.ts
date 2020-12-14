import codeFrame from '@babel/code-frame';
import * as path from 'path';
import * as os from 'os';
import fse from 'fs-extra';

/**
 * 根据位置返回行、列信息
 * @param source
 * @param pos
 */
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

/**
 * 打印代码并标记位置
 * @param source
 * @param lineOrPos
 * @param column
 */
export function printCodeFrame(source: string, lineOrPos: number, column?: number) {
  let line = lineOrPos;
  if (column == null) {
    const loc = getLineColumn(source, lineOrPos);
    line = loc.line;
    column = loc.column;
  }
  console.log(
    codeFrame(source, line, column, {highlightCode: true})
  );
}

/**
 * 获取一个临时目录
 * @param name
 * @param context
 */
export function getTempDir(name: string, context: string = process.cwd()): string {
  let root = path.join(context, 'node_modules');
  if (fse.existsSync(root)) {
    return path.join(root, name);
  }
  const parent = path.join(context, '..');
  if (parent === context) {
    return path.join(os.tmpdir(), name);
  }
  return getTempDir(name, parent);
}

/**
 * 返回唯一名字，如果重复在后面加数字
 * @param name
 * @param checkValid
 */
export function getUniqueName(name: string, checkValid: (val: string) => boolean): string {
  let index = 0;
  let baseName = name;
  while (!checkValid(name)) {
    name = `${baseName}_${++index}`;
  }
  return name;
}

const NPM_MODULE_REGEXP = /\/node_modules\//;

/**
 * 判断是 npm 模块
 * @param filename
 */
export function isNpmModule(filename: string): boolean {
  return NPM_MODULE_REGEXP.test(filename);
}

/**
 * 返回 npm 模块名称
 * @param filename
 */
export function getNpmModuleName(filename: string): string | null {
  const arr = filename.split('/');
  let name: string | null = null;
  let maybe = '';
  for (let i = arr.length - 1; i >= 0; i--) {
    const item = arr[i];
    if (item === 'node_modules') {
      name = maybe;
      break;
    } else {
      maybe = item;
    }
  }

  return name || null;
}
