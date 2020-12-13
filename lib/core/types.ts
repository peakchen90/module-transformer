import acorn from 'acorn';
import {Compiler} from './compiler';

/**
 * 入口选项
 */
export type InputOption = {
  filename?: string
  content?: string
  output?: string
} | string

/**
 * 插件函数签名
 */
export type PluginOption = (compiler: Compiler) => void

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
   * 包含编译的模块（默认: 非相对路径模块）
   */
  include?: (RegExp | string)[]
  /**
   * 需要排除编译的模块
   */
  exclude?: (RegExp | string)[]
  /**
   * 模块别名
   */
  alias?: Record<string, string>
  /**
   * 是否启用缓存（默认开启），开启缓存时 namedModule 只能设置为 "hash" 模式
   */
  cache?: boolean
  /**
   * 配置插件
   */
  plugins?: PluginOption[]
  /**
   * 高级选项
   */
  advanced?: {
    parseOptions?: acorn.Options // acorn 解析选项
  }
}

/**
 * 最终的入口信息
 */
export interface FinalizeInput {
  filename: string
  content: string
  output: string
}

export type RequiredOptions = Required<Options>

/**
 * 最终的编译器选项
 */
export type FinalizeOptions =
  Omit<RequiredOptions, 'input' | 'output' | 'advanced'>
  & { input: FinalizeInput[] }
  & { output: Required<RequiredOptions['output']> }
  & { advanced: Required<RequiredOptions['advanced']> }

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

export interface Hook {
  type: HookType
  callback: (compiler: Compiler, payload?: any) => any
}
