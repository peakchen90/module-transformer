import Compiler from './core';
import {Options} from './core/types';
import pkg from '../package.json';
import emitFile from './plugins/emit-file';
import clean from './plugins/clean';
import cleanCache from './plugins/clean-cache';

const version = pkg.version;

function transform(options: Options) {
  return new Compiler(options).run();
}

const plugins = {
  emitFile,
  clean,
  cleanCache
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
