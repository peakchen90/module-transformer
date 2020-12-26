import {Compiler} from './compiler';
import acorn from 'acorn';

/**
 * 入口选项
 */
export type InputOption = Partial<FinalizeInput[0]> | string

/**
 * 最终的入口选项
 */
export type FinalizeInput = Array<{
  filename: string
  content: string
  output: string
}>

/**
 * 插件函数签名
 */
export type PluginType = (compiler: Compiler) => void

/**
 * 拦截请求函数签名
 */
export type InterceptType = (filename: string, moduleId: string) => string | false

/**
 * 编译器选项
 */
export interface Options {
  /**
   * 编译器上下文路径
   */
  context?: string
  /**
   * 入口配置
   */
  input: InputOption | InputOption[]
  /**
   * 输出配置
   */
  output?: {
    path?: string, // 输出目录
    moduleDir?: string // 解析模块输出的目录
    namedModule?: 'id' | 'hash' | 'named' // 模块命名方式（默认: "id"）
  }
  /**
   * 需要排除编译的模块
   */
  exclude?: (RegExp | string)[]
  /**
   * 配置入口模块别名
   */
  alias?: Record<string, string>
  /**
   * 是否启用缓存，开启缓存时 namedModule 只能设置为 "hash" 模式
   */
  cache?: boolean
  /**
   * 配置插件
   */
  plugins?: PluginType[]
  /**
   * 高级选项
   */
  advanced?: {
    parseOptions?: Partial<acorn.Options> // acorn 解析选项
  }
}

type RequiredOptions = Required<Options>

/**
 * 最终的编译器选项
 */
export type FinalizeOptions =
  Pick<RequiredOptions, 'context' | 'alias' | 'cache' | 'plugins'> &
  { input: FinalizeInput } &
  { exclude: RegExp[] } &
  { output: Required<RequiredOptions['output']> } &
  { advanced: { parseOptions: acorn.Options } }

/**
 * Hook 类型
 */
export type HookType =
  | 'init'
  | 'entry'
  | 'beforeCompile'
  | 'modules'
  | 'assets'
  | 'done'
  | 'error'
  | 'log'
  | 'visitor'

export interface Hook {
  type: HookType
  callback: (compiler: Compiler, payload?: any) => any
}
