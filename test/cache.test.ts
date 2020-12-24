import {mId} from './util';
import {plugins, transform} from '../lib';
import del from 'del';
import * as path from 'path';

describe('Cache', () => {
  beforeEach(() => {
    del.sync(path.join(__dirname, '../node_modules/.transformer_cache'));
  });

  test('evaluate', async () => {
    async function validate() {
      const input = mId('entry-1.js');
      const {assets} = await transform({
        context: mId(),
        input: input,
        output: {
          namedModule: 'hash'
        },
        cache: true,
        plugins: [
          plugins.clean(),
          plugins.emitFile()
        ]
      });

      // 清除 require 缓存
      assets.forEach(asset => {
        delete require.cache[asset.path];
      });

      const res = require(mId('dist/entry-1.js'));
      expect(res.a.toString()).toBe('a-1');
      expect(res.b.toString()).toBe('b-2');
      expect(res.c.toString()).toBe('c');
      expect(res.c.printB()).toBe('b-2');
      expect(res.c.printD().toString()).toBe('d');
      expect(res.d.toString()).toBe('d');
      expect(res.entry2).toBe('entry-2');
    }

    await validate();
    await validate();
    await validate();
  });
});
