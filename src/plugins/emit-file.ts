import path from 'path';
import fse from 'fs-extra';
import Compiler from '../core';

export default function emitFile() {
  return (compiler: Compiler) => {
    compiler.onHook('done', () => {
      compiler.assets.forEach(asset => {
        const dirname = path.dirname(asset.path);
        if (!fse.existsSync(dirname)) {
          fse.mkdirSync(dirname, {recursive: true});
        }
        fse.writeFileSync(asset.path, asset.content);
      });
    });
  };
}
