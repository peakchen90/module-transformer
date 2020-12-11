import Ajv from 'ajv';
import AjvErrors from 'ajv-errors';
import {Module} from './module';
import {Hook, HookType, Options} from './types';
import Logger from './Logger';
import optionsSchema from './options-schema.json';
import _ from 'lodash';

const ajv = new Ajv({
  allErrors: true,
  jsonPointers: true
});
const validateOptions = AjvErrors(ajv).compile(optionsSchema);

export class Compiler {
  options: Required<Options>;
  modules: Map<string, Module>;
  assets: Record<string, Module>;
  hooks: Hook[];


  constructor(options: Options) {
    this.options = this.loadOptions(options);
    this.modules = new Map<string, Module>();
    this.assets = {};
    this.hooks = [];
    this.applyHook('init');

    this.loadPlugins();
    this.applyHook('loadedPlugins');
  }

  onHook(type: HookType, callback: Hook['callback']) {
    this.hooks.push({
      type,
      callback
    });
  }

  async run() {
    await this.applyHook('beforeCompile');
    await this.parse();
    await this.applyHook('done');
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
        output: 'modules',
        extensions: ['.js', '.json'],
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
          ecmaVersion: 'latest'
        }
      }
    };

    return _.merge(defaultOptions, options || {}) as Required<Options>;
  }

  private loadPlugins() {
    this.options.plugins?.forEach(plugin => {
      plugin(this);
    });
  }

  private parse() {
    this.applyHook('parseEntry');
  }
}
