import {validate} from 'schema-utils';
import * as path from 'path';
import * as fs from 'fs';
import _ from 'lodash';
import {Hook, HookType, Options, FinalizeOptions, FinalizeInput, PluginType} from './types';
import Module from './module';
import Logger from './logger';
import optionsSchema from './options.json';
import Asset from './asset';
import Cache from './cache';
import {createModulePrefixRegexp} from './util';

export class Compiler {
  readonly modules: Map<string, Module>;
  readonly assets: Map<string, Asset>;
  readonly hooks: Hook[];
  options: FinalizeOptions;
  context: string;
  logger: Logger;
  cache: Cache;
  private readonly _aliasRules: Array<{ test: RegExp, value: string }>;

  constructor(options: Options) {
    this.logger = new Logger('Compiler');
    this.modules = new Map();
    this.assets = new Map();
    this.hooks = [];

    this.options = this.loadOptions(options);
    this._aliasRules = this.getAliasRules(this.options.alias);
    this.context = this.options.context;
    this.cache = new Cache(this);
    this.loadPlugins();
    this.applyHook('init');
  }

  /**
   * 开始编译
   */
  async run(): Promise<{
    modules: Map<string, Module>;
    assets: Map<string, Asset>;
  }> {
    try {
      await this.resolveEntries();
      await this.parseModules();
      await this.generateAssets();
      await this.applyHook('done');
      return {
        modules: this.modules,
        assets: this.assets,
      };
    } catch (err) {
      this.exit(err);
    }
  }

  /**
   * 注册钩子回调
   * @param type
   * @param callback
   */
  onHook(type: HookType, callback: Hook['callback']) {
    this.hooks.push({
      type,
      callback
    });
  }

  /**
   * 根据context返回绝对路径
   * @param args
   */
  resolvePath(...args: string[]): string {
    let [first, ...remaining] = args;
    if (!path.isAbsolute(first)) {
      first = path.join(this.context, first);
    }
    return path.join(first, ...remaining);
  }

  /**
   * 触发调用一种类型钩子
   * @param type
   * @param payload
   */
  async applyHook(type: HookType, payload?: any): Promise<void> {
    for (const hook of this.hooks) {
      if (hook.type === type) {
        await hook.callback(this, payload);
      }
    }
  }

  /**
   * 挂载插件
   * @param plugin
   */
  usePlugin(plugin: PluginType) {
    plugin(this);
  }

  /**
   * 退出进程
   * @param err
   * @param code
   */
  exit(err: any, code = 1): never {
    this.applyHook('error', err);
    this.logger.error(err);
    process.exit(code);
  }

  /**
   * 解析别名的值
   * @param source
   */
  resolveAlias(source: string): string {
    for (let i = this._aliasRules.length - 1; i >= 0 ; i--) {
      const rule = this._aliasRules[i];
      const match = source.match(rule.test);
      if (match) {
        return rule.value + (match[1] || '');
      }
    }
    return source;
  }

  /**
   * 加载编译器选项
   * @param options
   * @private
   */
  private loadOptions(options: Options) {
    try {
      validate(
        optionsSchema as any,
        options,
        {name: 'ModuleTransformer'}
      );

      const defaultOptions: Partial<Options> = {
        context: process.cwd(),
        output: {
          moduleDir: '.modules',
          namedModule: 'id'
        },
        exclude: [],
        alias: {},
        cache: false,
        plugins: [],
        advanced: {
          parseOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            locations: false,
          }
        }
      };

      const opts = _.merge(defaultOptions, options || {}) as FinalizeOptions;
      if (!path.isAbsolute(opts.context)) {
        opts.context = path.join(process.cwd(), opts.context);
      }
      this.context = opts.context;
      opts.output.path = this.resolvePath(opts.output.path ?? 'dist');
      if (!path.isAbsolute(opts.output.moduleDir)) {
        opts.output.moduleDir = path.join(opts.output.path, opts.output.moduleDir);
      }
      opts.input = this.getFinalizeInput(opts);
      // 开启缓存时使用路径hash值命名
      if (opts.cache) {
        if (opts.output.namedModule !== 'hash') {
          opts.output.namedModule = 'hash';
          this.logger.warn('When the `options.cache` is enabled, `options.output.namedModule` can only be "hash"');
        }
      }
      opts.exclude = opts.exclude.map((item: any) => {
        if (!(item instanceof RegExp)) {
          return createModulePrefixRegexp(item);
        }
        return item;
      });
      return opts;
    } catch (err) {
      this.exit(err);
    }
  }

  /**
   * 返回最终的入口信息
   * @param options
   * @private
   */
  private getFinalizeInput(options: Options): FinalizeInput {
    let input = options.input;
    const outputRoot = options.output?.path as string;
    if (!Array.isArray(input)) {
      input = [input];
    }

    let nextId = 0;
    return input.map(item => {
      let filename = '', content = '', output = '';
      if (typeof item === 'string') {
        filename = this.resolvePath(item);
        content = fs.readFileSync(filename).toString();
        if (path.isAbsolute(item)) {
          output = path.relative(this.context, item);
        } else {
          output = item;
        }
      } else if (item.filename) {
        filename = this.resolvePath(item.filename);
        content = fs.readFileSync(filename).toString();
        output = item.output ?? item.filename;
      } else {
        filename = `ghost://entry/${++nextId}.js`;
        content = item.content as string;
        output = item.output as string;
      }
      if (!path.isAbsolute(output)) {
        output = path.join(outputRoot, output);
      }
      return {filename, content, output};
    });
  }

  /**
   * 返回别名规则
   * @param alias
   * @private
   */
  private getAliasRules(alias: FinalizeOptions['alias']) {
    return Object.keys(alias).map(key => {
      return {
        test: createModulePrefixRegexp(key),
        value: alias[key]
      };
    });
  }

  /**
   * 加载配置的插件
   * @private
   */
  private loadPlugins() {
    try {
      this.options.plugins.forEach(plugin => {
        this.usePlugin(plugin);
      });
    } catch (err) {
      this.exit(err);
    }
  }

  /**
   * 解析入口
   * @private
   */
  private async resolveEntries() {
    this.options.input.forEach((item) =>
      new Module(this, {
        entry: true,
        ghost: /^ghost:\/\//.test(item.filename),
        output: item.output,
        content: item.content,
        filename: item.filename,
      })
    );
    await this.applyHook('entry');
  }

  /**
   * 解析模块
   * @private
   */
  private async parseModules() {
    await this.applyHook('beforeCompile');
    const entries = [...this.modules.values()];
    entries.forEach(mod => {
      if (!mod.ast) {
        mod.parse();
      }
    });
    await this.applyHook('modules');
  }

  /**
   * 生产资源文件信息
   * @private
   */
  private async generateAssets() {
    this.modules.forEach((mod) => {
      const asset = new Asset(this, mod);
      this.assets.set(asset.filename, asset);
    });
    this.assets.forEach((asset) => {
      asset.transform();
    });
    await this.applyHook('assets');
  }
}
