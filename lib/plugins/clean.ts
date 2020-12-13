import del from 'del';
import Compiler from '../core';

/**
 * 清除构建成果插件
 */
export default function clean() {
  function CleanPlugin(compiler: Compiler) {
    compiler.onHook('init', () => {
      const outputDir = compiler.options.output.path;
      del.sync(outputDir, {force: true});
    });
  }

  return CleanPlugin;
}
