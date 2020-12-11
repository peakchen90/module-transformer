import acorn from 'acorn';
import acornWalk from 'acorn-walk';
import * as fs from 'fs';
import {Compiler} from './compiler';
import {Options} from './types';
import * as path from 'path';

let nextId = 0;

type Replacer = (val: string) => void;

export class Module {
  readonly id: number;
  readonly compiler: Compiler;
  readonly options: Required<Options>;
  filename: string;
  dirname: string;
  content: string;
  dependencies: Module[];
  dependents: Array<{
    module: Module
    replacer: Replacer
  }>;

  constructor(compiler: Compiler) {
    this.id = ++nextId;
    this.filename = '';
    this.dirname = '';
    this.content = '';
    this.dependencies = [];
    this.dependents = [];
    this.compiler = compiler;
    this.options = compiler.options;
  }

  addDep(mod: Module, replacer: Replacer) {
    this.dependencies.push(mod);
    mod.dependents.push({
      module: this,
      replacer
    });
  }

  parse(filename: string, content?: string): acorn.Node {
    if (!path.isAbsolute(filename)) {
      filename = path.join(this.options.context, filename);
    }
    this.filename = filename;
    this.content = content || fs.readFileSync(filename).toString();
    const modules = this.compiler.modules;
    if (!modules.get(filename)) {
      modules.set(filename, this);
    }

    return acorn.parse(this.content, this.options.advanced?.parseOptions || {
      ecmaVersion: 'latest'
    });
  }

  private resolveModulePath(moduleId: string): string {
    return require.resolve(moduleId, {
      paths: [this.options.context]
    });
  }

  private resolveDep(moduleId: string, replacer: Replacer) {
    const modules = this.compiler.modules;
    let mod = modules.get(moduleId);
    if (!mod) {
      mod = new Module(this.compiler);
      mod.parse(moduleId);
    }
    this.addDep(mod, replacer);
  }

  private findDeps(ast: acorn.Node) {
    const resolveModule = (moduleId: string, replacer: Replacer) => {
      if (/^[^.]/.test(moduleId)) return;
      let valid = this.options.module.include?.some(item => {
        if (item instanceof RegExp) return item.test(moduleId);
        return item === moduleId;
      });
      if (!valid) return;

      valid = !(this.options.module.exclude?.some(item => {
        if (item instanceof RegExp) return item.test(moduleId);
        return item === moduleId;
      }));
      if (!valid) return;

      const modulePath = this.resolveModulePath(moduleId);
      this.resolveDep(modulePath, replacer);
    };

    acornWalk.simple(ast, {
      CallExpression: (node: any) => {
        if (
          node.callee.type === 'Identifier'
          && node.arguments[0]?.type === 'Literal'
        ) {
          resolveModule(node.arguments[0].value, (val: string) => {
            node.arguments[0].value = val;
          });
        }
      },
      ImportDeclaration(node: any) {
        resolveModule(node.source.value, (val: string) => {
          node.source.value = val;
        });
      },
      ExportAllDeclaration(node: any) {
        resolveModule(node.source.value, (val: string) => {
          node.source.value = val;
        });
      },
      ExportNamedDeclaration(node: any) {
        resolveModule(node.source.value, (val: string) => {
          node.source.value = val;
        });
      }
    });
  }
}
