import hashSum from 'hash-sum';
import * as path from 'path';
import fse from 'fs-extra';
import os from 'os';
import {Compiler} from './compiler';
import Asset from './asset';

export type CacheData = {
  depsInfo: Array<{ p: string, k: string }>
  content: string
} | null

export default class Cache {
  compiler: Compiler
  base: string
  cacheDir: string;
  caches: Map<string, CacheData>

  constructor(compiler: Compiler) {
    this.compiler = compiler;
    this.caches = new Map();
    this.cacheDir = path.join(os.tmpdir(), '.module_transformer_cache');

    const {context, output, cache} = compiler.options;
    if (cache && !fse.existsSync(this.cacheDir)) {
      fse.mkdirSync(this.cacheDir, {recursive: true});
    }
    this.base = `
      ${context}
      ${output.path}
      ${output.moduleDir}
      ${output.namedModule}
    `;
  }

  createCacheName(filename: string, content: string) {
    return `${hashSum(this.base + filename)}__${hashSum(content)}`;
  }

  set(filename: string, asset: Asset) {
    const key = this.createCacheName(filename, asset.module.content);
    const deps = [...asset.module.dependencies.values()].map(item => item.module);
    const depsInfo = deps.map(item => {
      const p = item.filename;
      const k = this.createCacheName(p, item.content);
      return {p, k};
    });
    this.caches.set(key, {
      depsInfo,
      content: asset.content,
    });
    fse.writeFileSync(
      path.join(this.cacheDir, key),
      `${JSON.stringify(depsInfo)}\n\n${asset.content}`
    );
  }

  clear() {
    this.caches.clear();
    fse.removeSync(path.join(this.cacheDir, '*'));
  }

  getCache(filename: string, content: string): CacheData {
    const key = this.createCacheName(filename, content);
    let cache = this.caches.get(key);
    if (cache) {
      return cache;
    }
    const cacheFile = path.join(this.cacheDir, key);
    if (fse.existsSync(cacheFile)) {
      cache = this.readCacheFile(
        fse.readFileSync(cacheFile).toString()
      );
      this.caches.set(key, cache);
      return cache;
    }
    return null;
  }

  readCacheFile(str: string): CacheData {
    const index = str.indexOf('\n\n');
    try {
      const depsInfo = JSON.parse(str.slice(0, index));
      const content = str.slice(index + 2);
      return {depsInfo, content};
    } catch (e) {
    }
    return null;
  }

  // finalize() {
  //   for (let key of this.caches.keys()) {
  //     const cache = this.caches.get(key);
  //     if (cache != null) {
  //       fse.writeFileSync(path.join(this.cacheDir, key), cache);
  //     }
  //   }
  // }
}
