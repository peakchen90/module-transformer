import * as path from 'path';
import escodegen from 'escodegen';
import {Compiler} from './compiler';
import Module from './module';

export default class Asset {
  readonly id: number;
  readonly compiler: Compiler;
  readonly module: Module;
  filename: string;
  path: string;
  content: string;

  constructor(compiler: Compiler, mod: Module) {
    this.id = mod.id;
    this.compiler = compiler;
    this.module = mod;
    this.filename = '';
    this.path = '';
    this.content = '';
    mod.asset = this;
    this.resolveOutputPath();
  }

  transform() {
    const {cache} = this.compiler;
    if (cache.enable) {
      const cacheInfo = cache.getModuleCache(this.module);
      if (cacheInfo) {
        this.content = cacheInfo.content;
        return;
      }
    }

    this.replaceModuleId();
    this.generateAssetContent();
  }

  private replaceModuleId() {
    this.module.dependencies.forEach(dep => {
      let newModuleId = path.relative(
        path.dirname(this.path),
        dep.module.asset?.path as string
      );
      if (!newModuleId.startsWith('..')) {
        newModuleId = `./${newModuleId}`;
      }
      if (dep.replacer) {
        dep.replacer(newModuleId);
      }
    });
  }

  private generateAssetContent() {
    if (this.module.assetModule) {
      this.content = this.module.content;
    } else {
      this.content = escodegen.generate(this.module.ast, {
        comment: true,
        format: {
          indent: {style: '  ', adjustMultilineComment: true}
        }
      });

      const {cache} = this.compiler;
      if (cache.enable) {
        const deps: string[] = [];
        for (let {module} of this.module.dependencies.values()) {
          deps.push(module.filename);
        }
        let filename = this.module.filename;
        const sourceContent = this.module.content;
        const content = this.content;
        if (this.module.entry) {
          filename = this.module.output as string;
        }
        cache.set({filename, sourceContent, deps, content});
      }
    }
  }

  private resolveOutputPath() {
    const {options} = this.compiler;
    if (this.module.entry) {
      this.path = this.module.output as string;
    } else {
      const {name, ext} = path.parse(this.module.filename);
      let filename: string;
      if (options.output.namedModule) {
        filename = `${name}_${this.id}${ext}`;
      } else {
        filename = `${this.id}${ext}`;
      }
      this.path = path.join(options.output.moduleDir, filename);
    }
    this.filename = path.relative(options.output.path, this.path);
  }
}
