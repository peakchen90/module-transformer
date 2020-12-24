import {transform} from '../lib';
import {ExpectedAssets, ExpectedModules, mId, validateAssets, validateModules} from './util';

describe('Exclude', () => {
  test('exclude', async () => {
    const input = mId('entry-1.js');
    const {modules, assets} = await transform({
      context: mId(),
      input: input,
      exclude: [
        /^[abc]/,
        './entry-2'
      ],
    });

    /* expect modules */
    const expectedModules: ExpectedModules = {
      [mId('entry-1.js')]: {
        id: 1,
        entry: true,
        ghost: false,
        output: mId('dist/entry-1.js'),
        filename: mId('entry-1.js'),
        dependencies: [
          mId('node_modules/d/index.js'),
        ],
        dependents: [],
        assetModule: false,
        npmModule: false,
      },
      [mId('node_modules/d/index.js')]: {
        id: 2,
        entry: false,
        ghost: false,
        output: undefined,
        filename: mId('node_modules/d/index.js'),
        dependencies: [],
        dependents: [
          mId('entry-1.js')
        ],
        assetModule: false,
        npmModule: true,
      }
    };

    /* expect assets */
    const expectedAssets: ExpectedAssets = {
      'entry-1.js': {
        id: 1,
        filename: 'entry-1.js',
        path: mId('dist/entry-1.js'),
        content: `
          const a = require('a');
          const b = require('b');
          const c = require('c');
          const d = require('./.modules/2.js');
          const {v: entry2} = require('./entry-2');
          module.exports = {
            a,
            b,
            c,
            d,
            entry2
          };
        `
      },
      '.modules/2.js': {
        id: 2,
        filename: '.modules/2.js',
        path: mId('dist/.modules/2.js'),
        content: `
          module.exports = {
            toString() {
              return 'd'
            }
          }
        `
      },
    };

    validateModules(expectedModules, modules);
    validateAssets(expectedAssets, assets);
  });
});
