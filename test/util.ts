import * as path from 'path';
import * as fs from 'fs';
import * as prettier from 'prettier';
import {Compiler} from '../lib';

/**
 * 返回 fixtures 指定目录的模块id路径
 * @param id
 */
export function mId(id = ''): string {
  return path.join(__dirname, 'fixtures', id);
}

/**
 * 同步读取文件内容
 * @param filename
 */
export function readFile(filename: string): string {
  return fs.readFileSync(filename).toString();
}

/**
 * 比较代码是否一致
 * @param a
 * @param b
 * @param isJSON
 */
export function compareCode(a: string, b: string, isJSON = false): boolean {
  if (isJSON) {
    return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
  }
  return prettier.format(a, {parser: 'babel'}) === prettier.format(b, {parser: 'babel'});
}

export type ExpectedModules = Record<string, {
  id: number
  entry: boolean
  ghost: boolean
  output?: string
  filename: string
  dependencies: string[]
  dependents: string[]
  assetModule: boolean
  npmModule: boolean
}>

/**
 * 校验 modules
 * @param expected
 * @param result
 */
export function validateModules(expected: ExpectedModules, result: Compiler['modules']) {
  const moduleIds = Object.keys(expected);
  expect(result.size).toBe(moduleIds.length);
  moduleIds.forEach(id => {
    const mod = result.get(id);
    if (!mod) throw new Error('Module 不存在');
    const expectedModule = expected[id];
    expect(expectedModule.id).toBe(mod.id);
    expect(expectedModule.entry).toBe(mod.entry);
    expect(expectedModule.ghost).toBe(mod.ghost);
    expect(expectedModule.output).toBe(mod.output);
    expect(expectedModule.filename).toBe(mod.filename);
    expect(expectedModule.assetModule).toBe(mod.assetModule);
    expect(expectedModule.npmModule).toBe(mod.npmModule);
    expect(expectedModule.dependencies.length).toBe(mod.dependencies.size);
    expect(expectedModule.dependents.length).toBe(mod.dependents.size);
    expectedModule.dependencies.forEach(v => {
      const valid = [...mod.dependencies].some(item => item.module === result.get(v));
      expect(valid).toBeTruthy();
    });
    expectedModule.dependents.forEach(v => {
      expect([...mod.dependents].some(i => i.filename === v)).toBeTruthy();
    });
  });
}

export type ExpectedAssets = Record<string, {
  id: number,
  filename: string,
  path: string,
  content: string
}>

/**
 * 校验 assets
 * @param expected
 * @param result
 */
export function validateAssets(expected: ExpectedAssets, result: Compiler['assets']) {
  const assetIds = Object.keys(expected);
  expect(result.size).toBe(assetIds.length);

  assetIds.forEach(id => {
    const asset = result.get(id);
    if (!asset) throw new Error('Asset 不存在');
    const expectedAsset = expected[id];
    expect(expectedAsset.id).toBe(asset.id);
    expect(expectedAsset.filename).toBe(asset.filename);
    expect(expectedAsset.path).toBe(asset.path);
    expect(
      compareCode(expectedAsset.content, asset.content, /\.json$/i.test(asset.filename))
    ).toBeTruthy();
  });
}
