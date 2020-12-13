import Compiler from '../core';

/**
 * 清除缓存插件
 */
export default function cleanCache() {
  function CleanCachePlugin(compiler: Compiler) {
    compiler.cache.clear();
  }

  return CleanCachePlugin;
}

