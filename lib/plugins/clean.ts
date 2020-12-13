import del from 'del';
import Compiler from '../core';

export default function clean() {
  function CleanPlugin(compiler: Compiler) {
    compiler.onHook('init', () => {
      const outputDir = compiler.options.output.path;
      del.sync(outputDir, {force: true});
    });
  }

  return CleanPlugin;
}
