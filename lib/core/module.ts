import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import * as path from 'path';
import * as fs from 'fs';
import codeFrame from '@babel/code-frame';
import builtinModules from 'builtin-modules';
import {Compiler} from './compiler';
import {FinalizeOptions} from './types';
import Asset from './asset';

interface ModuleOptions {
  entry?: boolean
  ghost?: boolean
  output?: string
  content?: string
  asAsset?: string
  filename: string
}

type Replacer = (val: string) => void;

let nextId = 0;

export default class Module {
  readonly id: number;
  readonly compiler: Compiler;
  readonly options: FinalizeOptions;
  readonly filename: string;
  readonly content: string;
  entry: boolean;
  context: string;
  dependencies: Set<{
    module: Module
    replacer: Replacer
  }>;
  dependents: Set<Module>;
  assetModule: boolean;
  ast?: acorn.Node;
  output?: string;
  asset?: Asset;

  constructor(compiler: Compiler, opts: ModuleOptions) {
    this.id = ++nextId;
    this.compiler = compiler;
    this.options = compiler.options;
    this.entry = opts.entry ?? false;
    this.output = opts.output;
    this.filename = opts.filename;
    this.dependencies = new Set();
    this.dependents = new Set();
    this.assetModule = !/\.m?js$/i.test(this.filename);

    if (opts.ghost) {
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
      replacer
    });
    mod.dependents.add(this);
  }

  parse() {
    try {
      this.ast = acorn.parse(
        this.content,
        this.options.advanced.parseOptions
      );
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

  private findDeps() {
    acornWalk.simple(this.ast as acorn.Node, {
      CallExpression: (node: any) => {
        if (
          node.callee.type === 'Identifier'
          && node.callee.name === 'require'
          && node.arguments[0]?.type === 'Literal'
        ) {
          this.handleDepModule(node.arguments[0].value, (val: string) => {
            node.arguments[0].value = val;
            node.arguments[0].raw = val;
          });
        }
      },
      ImportExpression: (node: any) => {
        this.handleDepModule(node.source.value, (val: string) => {
          node.source.value = val;
          node.source.raw = val;
        });
      },
      ImportDeclaration: (node: any) => {
        this.handleDepModule(node.source.value, (val: string) => {
          node.source.value = val;
          node.source.raw = val;
        });
      },
      ExportAllDeclaration: (node: any) => {
        this.handleDepModule(node.source.value, (val: string) => {
          node.source.value = val;
          node.source.raw = val;
        });
      },
      ExportNamedDeclaration: (node: any) => {
        this.handleDepModule(node.source.value, (val: string) => {
          node.source.value = val;
          node.source.raw = val;
        });
      }
    });
  }

  private checkModuleIdValid(moduleId: string): boolean {
    if (!this.entry) { // 非入口文件解析每个依赖的模块
      return true;
    }

    let valid: boolean;
    if (/^[^.]/.test(moduleId)) {
      valid = true;
    } else {
      valid = !!(this.options.include.some(item => {
        if (item instanceof RegExp) return item.test(moduleId);
        return item === moduleId;
      }));
    }
    if (!valid) return false;

    valid = !(this.options.exclude.some(item => {
      if (item instanceof RegExp) return item.test(moduleId);
      return item === moduleId;
    }));
    return valid;
  }

  private handleDepModule(moduleId: string, replacer: Replacer) {
    if (this.checkModuleIdValid(moduleId)) {
      if (builtinModules.includes(moduleId)) return;
      const filename = require.resolve(moduleId, {
        paths: [this.context]
      });

      const modules = this.compiler.modules;
      let mod = modules.get(filename);
      if (!mod) {
        mod = new Module(this.compiler, {filename});
        if (!mod.assetModule) {
          mod.parse();
        }
      }
      this.addDep(mod, replacer);
    }
  }
}
