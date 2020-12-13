import path from 'path';
import fse from 'fs-extra';
import Compiler from '../core';

/**
 * 根据资源信息生成文件
 */
export default function emitFile() {
  function EmitFilePlugin(compiler: Compiler) {
    compiler.onHook('done', async () => {
      const tasks: Promise<any>[] = [];
      compiler.assets.forEach(asset => {
        const dirname = path.dirname(asset.path);
        if (!fse.existsSync(dirname)) {
          fse.mkdirSync(dirname, {recursive: true});
        }
        tasks.push(
          fse.writeFile(asset.path, asset.content)
        );
      });
      await Promise.all(tasks);
    });
  }

  return EmitFilePlugin;
}
