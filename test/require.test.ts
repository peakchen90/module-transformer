import {transform} from 'module-transformer';
import {ExpectedAssets, mId, validateAssets} from './util';

describe('transformer', () => {
  test('require module', async () => {
    const input = mId('entry-import.js');
    const {assets} = await transform({
      context: mId(),
      input: input,
      output: {
        moduleDir: '.npm',
      },
    });

    /* expect assets */
    const expectAssets: ExpectedAssets = {
      'entry-import.js': {
        id: 1,
        filename: 'entry-import.js',
        path: mId('dist/entry-import.js'),
        content: `
          import * as a1 from './.npm/2.js';
          import {a2} from './.npm/2.js';
          import a3 from './.npm/2.js';
          export {b1} from './.npm/2.js';
          export * from './.npm/2.js';
          import('./.npm/2.js');
          require('./.npm/2.js');
          import(filename);
          require(filename);
        `
      },
      '.npm/2.js': {
        id: 2,
        filename: '.npm/2.js',
        path: mId('dist/.npm/2.js'),
        content: `
          module.exports = {
            toString() {
              return 'd'
            }
          }
        `
      },
    };

    validateAssets(expectAssets, assets);
  });
});
