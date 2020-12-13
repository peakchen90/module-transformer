import hashSum from 'hash-sum';
import * as path from 'path';
import fse from 'fs-extra';
import os from 'os';
import {Compiler} from './compiler';
import Asset from './asset';

export interface CacheInfo {
  hash: string
  deps: string[]
  content: string
}

export class CacheData {
  info: CacheInfo;

  constructor(info: CacheInfo) {
    this.info = info;
  }

  get hash() {
    return this.info.hash;
  }

  get deps() {
    return this.info.deps;
  }

  get content() {
    return this.info.content;
  }

  toString(): string {
    let str = this.info.hash;
    str += `\n${JSON.stringify(this.info.deps)}`;
    str += `\n\n${this.info.content}`;
    return str;
  }

  static restoreFromFile(filename: string): CacheData | null {
    try {
      if (fse.existsSync(filename)) {
        const str = fse.readFileSync(filename).toString();
        return CacheData.restore(str);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static restore(str: string): CacheData | null {
    try {
      let index1 = str.indexOf('\n');
      let index2 = str.indexOf('\n\n', index1 + 1);
      if (index1 === -1 || index2 === -1) {
        return null;
      }
      const hash = str.slice(0, index1);
      const deps = JSON.parse(str.slice(index1 + 1, index2));
      const content = str.slice(index2 + 2);
      return new CacheData({hash, content, deps});
    } catch (e) {
      return null;
    }
  }
}

export default class Cache {
  compiler: Compiler
  base: string
  enable: boolean
  cacheDir: string;
  caches: Map<string, CacheData | null>

  constructor(compiler: Compiler) {
    this.compiler = compiler;
    this.caches = new Map();
    this.cacheDir = path.join(os.tmpdir(), '.module_transformer_cache');

    const {context, output, cache} = compiler.options;
    if (cache && !fse.existsSync(this.cacheDir)) {
      fse.mkdirSync(this.cacheDir, {recursive: true});
    }

    this.enable = cache;
    this.base = `
      ${context}
      ${output.path}
      ${output.moduleDir}
      ${output.namedModule}
    `;
  }

  createKey(filename: string) {
    return hashSum(this.base + filename);
  }

  set(filename: string, asset: Asset) {
    const key = this.createKey(filename);
    const deps: CacheInfo['deps'] = [];
    for (let {module} of asset.module.dependencies.values()) {
      deps.push(module.filename);
    }

    const cache = new CacheData({
      deps,
      hash: hashSum(asset.module.content),
      content: asset.content
    });
    this.caches.set(key, cache);
    fse.writeFileSync(
      path.join(this.cacheDir, key),
      cache.toString()
    );
  }

  clear() {
    this.caches.clear();
    fse.removeSync(path.join(this.cacheDir, '*'));
  }

  getCacheInfo(filename: string, content?: string): CacheInfo | null {
    try {
      const key = this.createKey(filename);
      if (content == null) {
        content = fse.readFileSync(filename).toString();
      }
      if (!this.validate(key, hashSum(content))) {
        return null;
      }
      const cache = this.caches.get(key);
      return cache ? cache.info : null;
    } catch (e) {
      return null;
    }
  }

  validate(keyHash: string, contentHash: string): boolean {
    let cache = this.caches.get(keyHash);
    if (!cache) {
      const cacheFile = path.join(this.cacheDir, keyHash);
      cache = CacheData.restoreFromFile(cacheFile);
      this.caches.set(keyHash, cache);
    }
    return !!(cache && cache.hash === contentHash);
  }
}
