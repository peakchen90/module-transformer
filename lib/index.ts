import Compiler from './core';
import {Options} from './core/types';
import pkg from '../package.json';
import emitFile from './plugins/emit-file';
import clean from './plugins/clean';
import cleanCache from './plugins/clean-cache';
import replace from './plugins/replace';

/**
 * 版本
 */
const version = pkg.version;

/**
 * 编译转换
 * @param options
 */
function transform(options: Options) {
  return new Compiler(options).run();
}

/**
 * 插件
 */
const plugins = {
  emitFile,
  clean,
  cleanCache,
  replace
};

const transformer = {
  Compiler,
  transform,
  plugins,
  version
};

export default transformer;
export {
  Compiler,
  transform,
  plugins,
  version
};
