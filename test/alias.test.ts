import {mId} from './util';
import {plugins, transform} from 'module-transformer';

describe('Alias', () => {
  test('alias', async () => {
    const input = mId('entry-alias.js');
    await transform({
      context: mId(),
      input: input,
      alias: {
        'aliasB': 'b'
      },
      plugins: [
        plugins.clean(),
        plugins.emitFile()
      ]
    });

    const res = require(mId('dist/entry-alias.js'));
    expect(res.b.toString()).toBe('b-2');
    expect(res.b2.toString()).toBe('b-2');
  });
});
