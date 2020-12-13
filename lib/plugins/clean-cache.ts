import Compiler from '../core';

export default function cleanCache() {
  function CleanCachePlugin(compiler: Compiler) {
    compiler.cache.clear();
  }

  return CleanCachePlugin;
}

