import acorn from 'acorn';
import {Compiler} from './compiler';

export interface CompilerInput {
  path?: string
  content?: string
  output: string
}

export type CompilerPlugin = (compiler: Compiler) => void

export interface Options {
  context?: string
  input: CompilerInput | CompilerInput[]
  module?: {
    outputDir?: string
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

export type RequiredOptions =
  Required<Options>
  & { input: CompilerInput[] }
  & { module: Required<Options['module']> }
  & { advanced: Required<Options['advanced']> }

export type HookType =
  | 'init'
  | 'beforeCompile'
  | 'modules'
  | 'assets'
  | 'done'
  | 'fail'

export interface Hook {
  type: HookType
  callback: (compiler: Compiler, payload?: any) => any
}
