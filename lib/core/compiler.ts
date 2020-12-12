import Ajv from 'ajv';
import AjvErrors from 'ajv-errors';
import _ from 'lodash';
import Module from './module';
import {Hook, HookType, Options, RequiredOptions} from './types';
import Logger from './Logger';
import optionsSchema from './options-schema.json';
import Asset from './asset';
import * as path from 'path';

const ajv = new Ajv({
  allErrors: true,
  jsonPointers: true
});
const validateOptions = AjvErrors(ajv).compile(optionsSchema);

export class Compiler {
  context: string;
  options: RequiredOptions;
  modules: Map<string, Module>;
  assets: Map<string, Asset>;
  hooks: Hook[];

  constructor(options: Options) {
    this.options = this.loadOptions(options);
    this.context = this.options.context;
    this.modules = new Map();
    this.assets = new Map();
    this.hooks = [];
    this.loadPlugins();
    this.applyHook('init');
  }

  onHook(type: HookType, callback: Hook['callback']) {
    this.hooks.push({
      type,
      callback
    });
  }

  async run() {
    await this.applyHook('beforeCompile');
    this.parse();
    await this.applyHook('modules');
    this.transformAssets();
    await this.applyHook('assets');
    await this.applyHook('done');
  }

  resolvePath(_path: string): string {
    if (!path.isAbsolute(_path)) {
      _path = path.join(this.context, _path);
    }
    return _path;
  }

  private async applyHook(type: HookType, payload?: any): Promise<void> {
    for (const hook of this.hooks) {
      if (hook.type === type) {
        await hook.callback(this, payload);
      }
    }
  }

  private loadOptions(options: Options) {
    // TODO 临时取消校验
    // if (!validateOptions(options)) {
    //   validateOptions.errors?.forEach(val => {
    //     if (val.message) {
    //       Logger.error(val.message);
    //     }
    //   });
    //   process.exit(1);
    // }

    const defaultOptions: Partial<Options> = {
      context: process.cwd(),
      module: {
        outputDir: 'modules',
        include: [
          /^[^.]/
        ],
        exclude: [],
        alias: {}
      },
      cache: true,
      plugins: [],
      advanced: {
        parseOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          locations: true
        }
      }
    };

    const opts = _.merge(defaultOptions, options || {}) as RequiredOptions;
    if (!Array.isArray(opts.input)) {
      opts.input = [opts.input];
    }
    if (!path.isAbsolute(opts.context)) {
      opts.context = path.join(process.cwd(), opts.context);
    }
    this.context = opts.context;
    opts.module.outputDir = this.resolvePath(opts.module.outputDir);
    return opts;
  }

  private loadPlugins() {
    this.options.plugins?.forEach(plugin => {
      plugin(this);
    });
  }

  private parse() {
    this.options.input.forEach(item => {
      const mod = new Module(this, true, item.content);
      mod.output = item.output;
      mod.parse();
    });
  }

  private transformAssets() {
    this.modules.forEach((mod) => {
      const asset = new Asset(this, mod);
      this.assets.set(asset.filename, asset);
    });

    this.assets.forEach((asset) => {
      asset.transform();
    });
  }
}