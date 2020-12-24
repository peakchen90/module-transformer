import hashSum from 'hash-sum';
import * as path from 'path';
import fse from 'fs-extra';
import del from 'del';
import {Compiler} from './compiler';
import Module from './module';
import {getTempDir} from './util';

/**
 * 对外暴露使用的缓存接口
 */
export interface CacheInfo {
  hash: string
  deps: string[]
  content: string
}

/**
 * 缓存数据类
 */
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
    let str = `:${this.hash}`;
    str += `\n:${JSON.stringify(this.deps)}`;
    str += `\n\n${this.content}`;
    return str;
  }

  /**
   * 从文件中恢复缓存
   * @param filename
   */
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

  /**
   * 读取字符串恢复缓存
   * @param str
   */
  static restore(str: string): CacheData | null {
    try {
      let index1 = str.indexOf('\n');
      let index2 = str.indexOf('\n\n', index1 + 1);
      if (index1 === -1 || index2 === -1) {
        return null;
      }
      // 字段前带 `:`, 取值往后移一位
      const hash = str.slice(1, index1);
      const deps = JSON.parse(str.slice(index1 + 2, index2));
      const content = str.slice(index2 + 2);
      return new CacheData({hash, content, deps});
    } catch (e) {
      return null;
    }
  }
}

export default class Cache {
  compiler: Compiler;
  base: string;
  baseWithOptions: string;
  enable: boolean;
  cacheDir: string;
  caches: Map<string, CacheData | null>;

  constructor(compiler: Compiler) {
    this.compiler = compiler;
    this.caches = new Map();
    this.cacheDir = getTempDir('.transformer_cache');

    const {options} = compiler;
    if (options.cache && !fse.existsSync(this.cacheDir)) {
      fse.mkdirSync(this.cacheDir, {recursive: true});
    }

    this.enable = options.cache;
    this.base = 'MODULE_TRANSFORMER';
    this.baseWithOptions = JSON.stringify([
      options.context,
      options.output,
      options.exclude.map(String),
      options.alias
    ]);
  }

  /**
   * 创建缓存key
   * @param filename
   */
  createKey(filename: string) {
    return hashSum(this.base + filename);
  }

  /**
   * 设置缓存
   * @param config
   */
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

  /**
   * 清空缓存
   */
  clear() {
    this.caches.clear();
    del.sync(path.join(this.cacheDir, '*'), {force: true});
  }

  /**
   * 返回模块的缓存信息
   * @param mod
   */
  getModuleCache(mod: Module) {
    const filename = this.getModuleCacheFilename(mod);
    return this.getCacheInfo(filename, mod.content);
  }

  /**
   * 返回模块用于生成缓存的filename
   * @param mod
   */
  getModuleCacheFilename(mod: Module) {
    if (!mod.npmModule) {
      return this.baseWithOptions + (mod.entry ? mod.output : mod.filename);
    }
    return mod.filename;
  }

  /**
   * 返回缓存信息
   * @param filename
   * @param content
   */
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

  /**
   * 校验缓存
   * @param keyHash
   * @param contentHash
   */
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
