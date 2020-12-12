import fse from 'fs-extra';
import Compiler from '../core';

export default function clean() {
  function CleanPlugin(compiler: Compiler) {
    compiler.onHook('init', () => {
      const outputDir = compiler.options.output.path;
      fse.removeSync(outputDir);
    });
  }

  return CleanPlugin;
}
