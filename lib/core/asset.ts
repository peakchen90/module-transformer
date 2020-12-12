import {Compiler} from './compiler';
import escodegen from 'escodegen';
import {FinalizeOptions} from './types';
import Module from './module';
import * as path from 'path';

export default class Asset {
  readonly id: number;
  readonly compiler: Compiler;
  readonly options: FinalizeOptions;
  readonly module: Module;
  readonly context: string;

  filename: string;
  path: string;
  content: string;

  constructor(compiler: Compiler, mod: Module) {
    this.id = mod.id;
    this.compiler = compiler;
    this.options = compiler.options;
    this.context = compiler.context;
    this.module = mod;
    this.filename = '';
    this.path = '';
    this.content = '';
    mod.asset = this;
    this.resolveOutputPath();
  }

  transform() {
    this.transformAST();
    this.transformCode();
  }

  private transformAST() {
    this.module.dependencies.forEach(dep => {
      let newModuleId = path.relative(
        path.dirname(this.path),
        dep.module.asset?.path as string
      );
      if (!path.isAbsolute(newModuleId)) {
        newModuleId = `./${newModuleId}`;
      }
      dep.replacer(newModuleId);
    });
  }

  private transformCode() {
    this.content = escodegen.generate(this.module.ast);
  }

  private resolveOutputPath() {
    if (this.module.entry) {
      this.path = this.module.output as string;
    } else {
      this.path = path.join(
        this.options.output.moduleDir,
        `${this.id}${path.extname(this.module.filename)}`
      );
    }
    this.filename = path.relative(this.context, this.path);
  }
}
