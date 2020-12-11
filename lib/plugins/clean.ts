import fse from 'fs-extra';
import Compiler from '../core';

export default function clean() {
  return (compiler: Compiler) => {
    compiler.onHook('init', () => {
      const outputDir = compiler.options.module.outputDir;
      fse.removeSync(outputDir);
    });
  };
}
