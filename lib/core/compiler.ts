import {validate} from 'schema-utils';
import _ from 'lodash';
import * as path from 'path';
import Module from './module';
import {Hook, HookType, Options, FinalizeOptions, FinalizeInput, PluginOption} from './types';
import Logger from './Logger';
import optionsSchema from './options.json';
import Asset from './asset';
import * as fs from 'fs';
import Cache from './cache';

export class Compiler {
  readonly modules: Map<string, Module>;
  readonly assets: Map<string, Asset>;
  readonly hooks: Hook[];
  options: FinalizeOptions;
  context: string;
  logger: Logger;
  cache: Cache;

  constructor(options: Options) {
    this.logger = new Logger('Compiler');
    this.modules = new Map();
    this.assets = new Map();
    this.hooks = [];

    this.options = this.loadOptions(options);
    this.context = this.options.context;
    this.cache = new Cache(this);
    this.loadPlugins();
    this.applyHook('init');
  }

  async run(): Promise<{
    modules: Map<string, Module>;
    assets: Map<string, Asset>;
  }> {
    try {
      await this.resolveEntries();
      await this.parseModules();
      await this.transformAssets();
      await this.applyHook('done');
      return {
        modules: this.modules,
        assets: this.assets,
      };
    } catch (err) {
      this.exit(err);
    }
  }

  onHook(type: HookType, callback: Hook['callback']) {
    this.hooks.push({
      type,
      callback
    });
  }

  resolvePath(...args: string[]): string {
    let [first, ...remaining] = args;
    if (!path.isAbsolute(first)) {
      first = path.join(this.context, first);
    }
    return path.join(first, ...remaining);
  }

  async applyHook(type: HookType, payload?: any): Promise<void> {
    for (const hook of this.hooks) {
      if (hook.type === type) {
        await hook.callback(this, payload);
      }
    }
  }

  mountPlugin(plugin: PluginOption) {
    plugin(this);
  }

  exit(err: any, code = 1): never {
    this.applyHook('error', err);
    this.logger.error(err);
    process.exit(code);
  }

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
          namedModule: false
        },
        include: [],
        exclude: [],
        alias: {},
        cache: true,
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
      opts.cache = false; // TODO 禁用缓存
      return opts;
    } catch (err) {
      this.exit(err);
    }
  }

  private getFinalizeInput(options: Options): FinalizeInput[] {
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

  private loadPlugins() {
    try {
      this.options.plugins.forEach(plugin => {
        this.mountPlugin(plugin);
      });
    } catch (err) {
      this.exit(err);
    }
  }

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

  private async parseModules() {
    await this.applyHook('beforeCompile');
    const entries = [...this.modules.values()];
    entries.forEach(mod => {
      mod.parse();
    });
    await this.applyHook('modules');
  }

  private async transformAssets() {
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
