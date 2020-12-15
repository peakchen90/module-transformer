import * as path from 'path';
import * as fs from 'fs';

/**
 * 返回 fixtures 指定目录
 * @param agrs
 */
export function getFixturesPath(...agrs: string[]): string {
  return path.join(__dirname, 'fixtures', ...agrs);
}

/**
 * 同步读取文件内容
 * @param filename
 */
export function readFile(filename: string): string {
  return fs.readFileSync(filename).toString();
}
