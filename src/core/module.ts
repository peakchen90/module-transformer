import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import * as fs from 'fs';
import builtinModules from 'builtin-modules';
import {Compiler} from './compiler';
import {RequiredOptions} from './types';
import * as path from 'path';
import Asset from './asset';

let nextId = 0;

type Replacer = (val: string) => void;

export default class Module {
  readonly id: number;
  readonly compiler: Compiler;
  readonly options: RequiredOptions;
  filename: string;
  content: string;
  entry: boolean;
  ghost: boolean;
  context: string;
  dependencies: Set<{
    module: Module
    replacer: Replacer
  }>;
  dependents: Set<Module>;
  ast?: acorn.Node;
  output?: string;
  asset?: Asset;

  constructor(compiler: Compiler, entry = false, content = '') {
    this.id = ++nextId;
    this.filename = '';
    this.content = content;
    this.entry = entry;
    this.ghost = !!content;
    this.dependencies = new Set();
    this.dependents = new Set();
    this.compiler = compiler;
    this.options = compiler.options;
    this.context = compiler.context;
  }

  addDep(mod: Module, replacer: Replacer) {
    this.dependencies.add({
      module: mod,
      replacer
    });
    mod.dependents.add(this);
  }

  parse(filename?: string) {
    if (this.ghost || !filename) {
      this.filename = `ghost://@${this.id}`;
    } else {
      this.filename = this.compiler.resolvePath(filename);
    }
    if (!this.ghost) {
      this.content = fs.readFileSync(this.filename).toString();
      this.context = path.dirname(this.filename);
    }
    const modules = this.compiler.modules;
    if (!modules.get(this.filename)) {
      modules.set(this.filename, this);
    }

    this.ast = acorn.parse(
      this.content,
      this.options.advanced?.parseOptions || {
        ecmaVersion: 'latest'
      }
    );
    this.findDeps();
  }

  toString() {
    return this.content;
  }

  private resolveModulePath(moduleId: string): string {
    return require.resolve(moduleId, {
      paths: [this.context]
    });
  }

  private resolveDep(modulePath: string, replacer: Replacer) {
    const modules = this.compiler.modules;
    let mod = modules.get(modulePath);
    if (!mod) {
      mod = new Module(this.compiler);
      if (/\.m?js/i.test(modulePath)) {
        mod.parse(modulePath);
      }
    }
    this.addDep(mod, replacer);
  }

  private checkModuleIdValid(moduleId: string): boolean {
    if (!this.entry) {
      return true;
    }

    let valid: boolean;
    if (/^[^.]/.test(moduleId)) {
      valid = true;
    } else {
      valid = !!(this.options.module.include?.some(item => {
        if (item instanceof RegExp) return item.test(moduleId);
        return item === moduleId;
      }));
    }
    if (!valid) return false;

    valid = !(this.options.module.exclude?.some(item => {
      if (item instanceof RegExp) return item.test(moduleId);
      return item === moduleId;
    }));
    return valid;
  }

  private findDeps() {
    const resolveModule = (moduleId: string, replacer: Replacer) => {
      if (this.checkModuleIdValid(moduleId)) {
        if (builtinModules.includes(moduleId)) {
          return;
        }
        const modulePath = this.resolveModulePath(moduleId);
        this.resolveDep(modulePath, replacer);
      }
    };

    acornWalk.simple(this.ast as acorn.Node, {
      CallExpression: (node: any) => {
        if (
          node.callee.type === 'Identifier'
          && node.callee.name === 'require'
          && node.arguments[0]?.type === 'Literal'
        ) {
          resolveModule(node.arguments[0].value, (val: string) => {
            node.arguments[0].value = val;
            node.arguments[0].raw = val;
          });
        }
      },
      ImportDeclaration(node: any) {
        resolveModule(node.source.value, (val: string) => {
          node.source.value = val;
          node.source.raw = val;
        });
      },
      ExportAllDeclaration(node: any) {
        resolveModule(node.source.value, (val: string) => {
          node.source.value = val;
          node.source.raw = val;
        });
      },
      ExportNamedDeclaration(node: any) {
        resolveModule(node.source.value, (val: string) => {
          node.source.value = val;
          node.source.raw = val;
        });
      }
    });
  }
}
