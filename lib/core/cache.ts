import hashSum from 'hash-sum';
import * as path from 'path';
import fse from 'fs-extra';
import del from 'del';
import {Compiler} from './compiler';
import Module from './module';
import {getTempDir} from './util';

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
    let str = this.hash;
    str += `\n${JSON.stringify(this.deps)}`;
    str += `\n\n${this.content}`;
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
    this.cacheDir = getTempDir('.module_transformer_cache');

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

  set(config: {
    filename: string;
    sourceContent: string
    deps: string[]
    content: string
  }) {
    const key = this.createKey(config.filename);
    const cache = new CacheData({
      hash: hashSum(config.sourceContent),
      content: config.content,
      deps: config.deps
    });
    this.caches.set(key, cache);
    fse.writeFile(path.join(this.cacheDir, key), cache.toString()).catch(() => {
    });
  }

  clear() {
    this.caches.clear();
    del.sync(path.join(this.cacheDir, '*'), {force: true});
  }

  getModuleCache(mod: Module) {
    let filename = mod.filename;
    if (mod.entry) {
      filename = mod.output as string;
    }
    return this.getCacheInfo(filename, mod.content);
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
