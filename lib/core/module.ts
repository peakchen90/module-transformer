import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import * as path from 'path';
import * as fs from 'fs';
import codeFrame from '@babel/code-frame';
import builtinModules from 'builtin-modules';
import chalk from 'chalk';
import {Compiler} from './compiler';
import Asset from './asset';
import {CacheInfo} from './cache';

interface ModuleOptions {
  entry?: boolean
  ghost?: boolean
  output?: string
  content?: string
  asAsset?: string
  filename: string
}

type Replacer = (val: string) => void;

interface Dependency {
  module: Module
  cache: boolean
  replacer?: Replacer
  cacheInfo?: CacheInfo
}

let nextId = 0;

export default class Module {
  readonly id: number;
  readonly compiler: Compiler;
  readonly filename: string;
  readonly content: string;
  readonly entry: boolean;
  readonly ghost: boolean;
  readonly context: string;
  readonly dependencies: Set<Dependency>;
  readonly dependents: Set<Module>;
  readonly assetModule: boolean;
  ast?: acorn.Node;
  output?: string;
  asset?: Asset;

  constructor(compiler: Compiler, opts: ModuleOptions) {
    this.id = ++nextId;
    this.compiler = compiler;
    this.entry = opts.entry ?? false;
    this.ghost = opts.ghost ?? false;
    this.output = opts.output;
    this.filename = opts.filename;
    this.dependencies = new Set();
    this.dependents = new Set();
    this.assetModule = !/\.m?js$/i.test(this.filename);

    if (this.ghost) {
      this.context = compiler.context;
      this.content = opts.content as string;
    } else {
      this.context = path.dirname(this.filename);
      this.content = fs.readFileSync(this.filename).toString();
    }

    const modules = this.compiler.modules;
    if (!modules.get(this.filename)) {
      modules.set(this.filename, this);
    }
  }

  addDep(mod: Module, replacer: Replacer) {
    this.dependencies.add({
      module: mod,
      cache: false,
      replacer
    });
    mod.dependents.add(this);
  }

  addCacheDep(mod: Module, cacheInfo?: CacheInfo) {
    this.dependencies.add({
      module: mod,
      cache: true,
      cacheInfo
    });
    mod.dependents.add(this);
  }

  parse() {
    const {options, cache} = this.compiler;
    if (cache.enable) {
      const cacheInfo = cache.getCacheInfo(this.filename, this.content);
      if (cacheInfo) {
        this.handleCacheDeps(cacheInfo.deps);
        return;
      }
    }

    try {
      this.ast = acorn.parse(this.content, options.advanced.parseOptions);
    } catch (err) {
      this.compiler.logger.error(`${err.message}, at ${this.filename}`);
      console.log(
        codeFrame(this.content, err.loc.line, err.loc.column, {
          highlightCode: true
        })
      );
      this.compiler.exit(err);
    }
    this.findDeps();
  }

  private handleCacheDeps(deps: CacheInfo['deps']) {
    const {cache, modules} = this.compiler;
    deps.forEach(filename => {
      const cacheInfo = cache.getCacheInfo(filename);
      let mod = modules.get(filename);
      if (!mod) {
        mod = new Module(this.compiler, {filename});
        if (!cacheInfo && !mod.assetModule) mod.parse();
      }
      this.addCacheDep(mod, cacheInfo ?? undefined);
    });
  }

  private findDeps() {
    acornWalk.simple(this.ast as acorn.Node, {
      CallExpression: (node: any) => {
        if (
          node.callee.type === 'Identifier'
          && node.callee.name === 'require'
          && node.arguments[0]?.type === 'Literal'
          && typeof node.arguments[0]?.value === 'string'
        ) {
          this.handleDepModule(
            node.arguments[0].value,
            (val: string) => {
              node.arguments[0].value = val;
              node.arguments[0].raw = val;
            },
            node.arguments[0].loc?.start
          );
        }
      },
      ImportExpression: (node: any) => {
        if (
          node.source.type === 'Literal'
          && typeof node.source.value === 'string'
        ) {
          this.handleDepModule(
            node.source.value,
            (val: string) => {
              node.source.value = val;
              node.source.raw = val;
            },
            node.source.loc?.start
          );
        }
      },
      ImportDeclaration: (node: any) => {
        this.handleDepModule(
          node.source.value,
          (val: string) => {
            node.source.value = val;
            node.source.raw = val;
          },
          node.source.loc?.start
        );
      },
      ExportAllDeclaration: (node: any) => {
        this.handleDepModule(
          node.source.value,
          (val: string) => {
            node.source.value = val;
            node.source.raw = val;
          },
          node.source.loc?.start
        );
      },
      ExportNamedDeclaration: (node: any) => {
        this.handleDepModule(
          node.source.value,
          (val: string) => {
            node.source.value = val;
            node.source.raw = val;
          },
          node.source.loc?.start
        );
      }
    });
  }

  private handleDepModule(moduleId: string, replacer: Replacer, loc?: { line: string; column: string }) {
    if (this.checkModuleIdValid(moduleId) && !builtinModules.includes(moduleId)) {
      moduleId = this.compiler.options.alias[moduleId] ?? moduleId;

      let filename: string;
      try {
        filename = require.resolve(moduleId, {paths: [this.context]});
      } catch (err) {
        const location = loc ? ` (${loc.line}:${loc.column})` : '';
        this.compiler.logger.error(`Cannot find module '${moduleId}' at ${chalk.underline(this.filename + location)}`);
        this.compiler.exit(err.stack);
      }

      const modules = this.compiler.modules;
      let mod = modules.get(filename);
      if (!mod) {
        mod = new Module(this.compiler, {filename});
        if (!mod.assetModule) mod.parse();
      }
      this.addDep(mod, replacer);
    }
  }

  private checkModuleIdValid(moduleId: string): boolean {
    const {options} = this.compiler;
    if (!this.entry) { // 非入口文件解析每个依赖的模块
      return true;
    }

    let valid: boolean;
    if (/^[^.]/.test(moduleId)) {
      valid = true;
    } else {
      valid = !!(options.include.some(item => {
        if (item instanceof RegExp) return item.test(moduleId);
        return item === moduleId;
      }));
    }
    if (!valid) return false;

    valid = !(options.exclude.some(item => {
      if (item instanceof RegExp) return item.test(moduleId);
      return item === moduleId;
    }));
    return valid;
  }
}
