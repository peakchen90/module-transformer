import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import * as path from 'path';
import * as fs from 'fs';
import builtinModules from 'builtin-modules';
import chalk from 'chalk';
import {Compiler} from './compiler';
import Asset from './asset';
import {CacheInfo} from './cache';
import {isNpmModule, isRelativeModule, printCodeFrame} from './util';

/**
 * 模块构造函数选项
 */
interface ModuleOptions {
  entry?: boolean
  ghost?: boolean
  output?: string
  content?: string
  asAsset?: string
  filename: string
}

/**
 * 替换 moduleId 方法签名
 */
type Replacer = (val: string) => void;

/**
 * 依赖信息
 */
interface Dependency {
  module: Module
  cache: boolean
  sourceId?: string
  replacer?: Replacer
}

// 模块id
let nextId = 0;

/**
 * 模块
 */
export default class Module {
  readonly id: number; // 模块id
  readonly compiler: Compiler; // compiler实例
  readonly entry: boolean; // 是否入口模块
  readonly ghost: boolean; // 是否ghost入口模块（入口只配置了 content 就是一个虚拟的 ghost 模块）
  readonly filename: string; // 模块路径
  readonly content: string; // 模块文件内容
  readonly output?: string; // 输出路径（仅入口模块有）
  readonly context: string; // 解析模块内的依赖需要根据的路径
  readonly dependencies: Set<Dependency>; // 所有的依赖信息
  readonly dependents: Set<Module>; // 被依赖的模块
  readonly assetModule: boolean; // 是否是作为一个资源模块（非 JS 文件）
  readonly npmModule: boolean; // 是否是一个包含在一个 npm 模块里
  ast?: acorn.Node; // AST 对象
  asset?: Asset; // 绑定资源文件实例（后期生成资源文件时绑定）
  cacheInfo?: CacheInfo | null; // 模块缓存信息
  shortName?: string; // 短名称（用户命名模块）
  rootName?: string; // 根名称（一般是npm包名）
  private _resolveCacheDeps?: boolean; // 是否解析过缓存依赖（解决循环引用）

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
      this.npmModule = false;
    } else {
      this.context = path.dirname(this.filename);
      this.content = fs.readFileSync(this.filename).toString();
      this.npmModule = isNpmModule(this.filename);
    }

    const modules = this.compiler.modules;
    if (!modules.get(this.filename)) {
      modules.set(this.filename, this);
    }
  }

  /**
   * 解析模块
   */
  parse() {
    const {options, cache} = this.compiler;
    // 验证缓存
    if (cache.enable) {
      this.cacheInfo = this.cacheInfo || cache.getModuleCache(this);
      if (this.cacheInfo) {
        this.handleCacheDeps(this, this.cacheInfo.deps);
        return;
      }
    }

    try {
      this.ast = acorn.parse(this.content, options.advanced.parseOptions);
    } catch (err) {
      this.compiler.logger.error(`${err.message}, at ${chalk.underline(this.filename)}`);
      printCodeFrame(this.content, err.loc.line, err.loc.column);
      this.compiler.exit(err);
    }
    this.findDeps();
  }

  /**
   * 添加一个模块作为依赖
   * @param mod
   * @param opts
   */
  addDep(mod: Module, opts: {
    cache: boolean,
    sourceId?: string,
    replacer?: Replacer
  }) {
    this.dependencies.add({
      module: mod,
      cache: opts.cache,
      sourceId: opts.sourceId,
      replacer: opts.replacer
    });
    mod.dependents.add(this);

    // 使用命名模块
    if (
      this.compiler.options.output.namedModule === 'named'
      && opts.sourceId
      && !mod.shortName
    ) {
      let name = path.parse(opts.sourceId).name;
      if (isRelativeModule(opts.sourceId)) {
        name = this.rootName ? `${this.rootName}_${name}` : name;
      } else {
        const arr = opts.sourceId.split('/').filter(Boolean);
        name = arr[0] || name;
        if (arr.length >= 2) {
          name += `_${arr[arr.length - 1]}`;
          name = path.parse(name).name;
        }
        name = mod.rootName = name;
      }
      mod.shortName = name;
      if (!mod.rootName) {
        mod.rootName = this.rootName;
      }
    }
  }

  /**
   * 递归处理缓存模块的依赖
   * @param parent
   * @param deps
   * @private
   */
  private handleCacheDeps(parent: Module, deps: CacheInfo['deps']) {
    const {cache, modules} = this.compiler;
    parent._resolveCacheDeps = true;
    deps.forEach(filename => {
      const cacheInfo = cache.getCacheInfo(filename);
      let mod = modules.get(filename);
      if (!mod) {
        mod = new Module(this.compiler, {filename});
        if (!cacheInfo && !mod.assetModule) {
          mod.parse();
        }
      }
      if (!mod._resolveCacheDeps && cacheInfo && cacheInfo.deps.length > 0) {
        this.handleCacheDeps(mod, cacheInfo.deps);
      }
      parent.addDep(mod, {cache: true});
    });
  }

  /**
   * 查找模块的依赖
   * @private
   */
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

  /**
   * 处理依赖模块
   * @param moduleId
   * @param replacer
   * @param loc
   * @private
   */
  private handleDepModule(moduleId: string, replacer: Replacer, loc?: { line: string; column: string }) {
    const sourceId = moduleId;
    if (this.checkModuleIdValid(sourceId)) {
      if (!this.npmModule) {
        moduleId = this.compiler.resolveAlias(moduleId);
      }

      let filename: string;
      try {
        filename = require.resolve(moduleId, {paths: [this.context]});
      } catch (err) {
        const location = loc ? ` (${loc.line}:${loc.column})` : '';
        this.compiler.logger.error(
          `Cannot find module '${moduleId}' at ${chalk.underline(this.filename + location)}`
        );
        this.compiler.exit(err.stack.split('\n').slice(1).join('\n'));
      }

      const modules = this.compiler.modules;
      let mod = modules.get(filename);
      if (!mod) {
        mod = new Module(this.compiler, {filename});
      }
      this.addDep(mod, {cache: false, sourceId, replacer});
      if (!mod.ast && !mod.assetModule) {
        mod.parse();
      }
    }
  }

  /**
   * 校验 moduleId 是否有效
   * @param moduleId
   * @private
   */
  private checkModuleIdValid(moduleId: string): boolean {
    const {options} = this.compiler;
    if (builtinModules.includes(moduleId)) {
      return false;
    }
    if (this.npmModule) {
      return true;
    }
    if (this.ghost && isRelativeModule(moduleId)) {
      return false;
    }

    // 应用 exclude 配置
    return !(options.exclude.some(item => item.test(moduleId)));
  }
}
