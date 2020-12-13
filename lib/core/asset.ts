import * as path from 'path';
import escodegen from 'escodegen';
import hashSum from 'hash-sum';
import {Compiler} from './compiler';
import Module from './module';
import {getUniqueName} from './util';

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
    this.resolveOutput();
  }

  /**
   * 转换文件生成内容
   */
  transform() {
    const {cache} = this.compiler;
    // 校验缓存，如果没有失效跳过转换，直接读取缓存内容
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

  /**
   * 解析资源输出信息
   * @private
   */
  private resolveOutput() {
    const {options} = this.compiler;

    // 获取输出目录的相对路径
    const getFilename = (_path: string): string => {
      return path.relative(options.output.path, _path);
    };

    // 入口模块使用配置的输出文件名
    if (this.module.entry) {
      this.path = this.module.output as string;
      this.filename = getFilename(this.path);
      return;
    }

    const {name, ext} = path.parse(this.module.filename);
    let outputPath = '';
    let filename = '';

    if (options.output.namedModule === 'hash') { // 使用文件路径 hash 值命名模块
      outputPath = path.join(
        options.output.moduleDir,
        `${hashSum(this.module.filename)}${ext}`
      );
    } else if (options.output.namedModule === 'named') { // 使用命名模块
      getUniqueName(this.module.shortName || name, (val) => {
        outputPath = path.join(options.output.moduleDir, `${val}${ext}`);
        filename = getFilename(outputPath);
        return !this.compiler.assets.has(filename);
      });
    } else { // 使用id命名
      outputPath = path.join(options.output.moduleDir, `${this.id}${ext}`);
    }

    this.path = outputPath;
    this.filename = getFilename(this.path);
  }

  /**
   * 替换模块id
   * @private
   */
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

  /**
   * 生成代码
   * @private
   */
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

      // 更新缓存
      const {cache} = this.compiler;
      if (cache.enable) {
        const deps: string[] = [];
        for (let {module} of this.module.dependencies.values()) {
          deps.push(module.filename);
        }
        let filename = this.module.filename;
        const sourceContent = this.module.content;
        const content = this.content;
        // 入口模块使用输出路径作为文件名生成缓存key
        if (this.module.entry) {
          filename = this.module.output as string;
        }
        cache.set({filename, sourceContent, deps, content});
      }
    }
  }
}
