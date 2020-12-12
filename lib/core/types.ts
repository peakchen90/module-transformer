import acorn from 'acorn';
import {Compiler} from './compiler';

export type InputOption = {
  filename?: string
  content?: string
  output?: string
} | string

export type PluginOption = (compiler: Compiler) => void

export interface Options {
  context?: string
  input: InputOption | InputOption[]
  output?: {
    path?: string,
    moduleDir?: string
  }
  include?: (RegExp | string)[]
  exclude?: (RegExp | string)[]
  alias?: Record<string, string>
  cache?: boolean
  plugins?: PluginOption[]
  advanced?: {
    parseOptions?: acorn.Options
  }
}

export interface FinalizeInput {
  filename: string
  content: string
  output: string
}

export type RequiredOptions = Required<Options>

export type FinalizeOptions =
  Omit<RequiredOptions, 'input' | 'output' | 'advanced'>
  & { input: FinalizeInput[] }
  & { output: Required<RequiredOptions['output']> }
  & { advanced: Required<RequiredOptions['advanced']> }

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
