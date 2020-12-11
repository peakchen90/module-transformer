import acorn from 'acorn';
import {Compiler} from './compiler';

export interface CompilerInput {
  path?: string
  content?: string
  output: string
}

export type CompilerPlugin = (...args: any[]) => (compiler: Compiler) => void

export interface Options {
  context?: string
  input: CompilerInput | CompilerInput[]
  module?: {
    output?: string
    extensions?: string[]
    include?: (RegExp | string)[]
    exclude?: (RegExp | string)[]
    alias?: Record<string, string>
  }
  cache?: boolean
  plugins?: CompilerPlugin[]
  advanced?: {
    parseOptions?: acorn.Options
  }
}

export type HookType =
  | 'init'
  | 'loadedPlugins'
  | 'beforeCompile'
  | 'parseEntry'
  | 'modules'
  | 'assets'
  | 'done'
  | 'fail'

export interface Hook {
  type: HookType
  callback: (compiler: Compiler, payload?: any) => any
}
