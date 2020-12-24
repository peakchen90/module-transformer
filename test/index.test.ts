import {plugins, transform} from '../lib';
import {ExpectedAssets, ExpectedModules, mId, validateAssets, validateModules} from './util';

describe('transformer', () => {
  test('transform', async () => {
    const input = mId('entry-1.js');
    const {assets, modules} = await transform({
      context: mId(),
      input: [
        input,
        {
          content: 'require("d")',
          output: 'foo/bar.js'
        }
      ],
      output: {
        moduleDir: '.npm',
      },
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
          mId('node_modules/a/index.js'),
          mId('node_modules/b/index.js'),
          mId('node_modules/c/index.js'),
          mId('node_modules/d/index.js'),
          mId('entry-2.js'),
        ],
        dependents: [],
        assetModule: false,
        npmModule: false,
      },
      'ghost://entry/1.js': {
        id: 2,
        entry: true,
        ghost: true,
        output: mId('dist/foo/bar.js'),
        filename: 'ghost://entry/1.js',
        dependencies: [
          mId('node_modules/d/index.js'),
        ],
        dependents: [],
        assetModule: false,
        npmModule: false,
      },
      [mId('node_modules/a/index.js')]: {
        id: 3,
        entry: false,
        ghost: false,
        output: undefined,
        filename: mId('node_modules/a/index.js'),
        dependencies: [
          mId('node_modules/a/1.json')
        ],
        dependents: [
          mId('entry-1.js')
        ],
        assetModule: false,
        npmModule: true,
      },
      [mId('node_modules/a/1.json')]: {
        id: 4,
        entry: false,
        ghost: false,
        output: undefined,
        filename: mId('node_modules/a/1.json'),
        dependencies: [],
        dependents: [
          mId('node_modules/a/index.js')
        ],
        assetModule: true,
        npmModule: true,
      },
      [mId('node_modules/b/index.js')]: {
        id: 5,
        entry: false,
        ghost: false,
        output: undefined,
        filename: mId('node_modules/b/index.js'),
        dependencies: [
          mId('node_modules/b/1.js'),
        ],
        dependents: [
          mId('entry-1.js'),
          mId('node_modules/c/index.js')
        ],
        assetModule: false,
        npmModule: true,
      },
      [mId('node_modules/b/1.js')]: {
        id: 6,
        entry: false,
        ghost: false,
        output: undefined,
        filename: mId('node_modules/b/1.js'),
        dependencies: [
          mId('node_modules/b/2.js')
        ],
        dependents: [
          mId('node_modules/b/index.js')
        ],
        assetModule: false,
        npmModule: true,
      },
      [mId('node_modules/b/2.js')]: {
        id: 7,
        entry: false,
        ghost: false,
        output: undefined,
        filename: mId('node_modules/b/2.js'),
        dependencies: [],
        dependents: [
          mId('node_modules/b/1.js'),
          mId('entry-2.js')
        ],
        assetModule: false,
        npmModule: true,
      },
      [mId('node_modules/c/index.js')]: {
        id: 8,
        entry: false,
        ghost: false,
        output: undefined,
        filename: mId('node_modules/c/index.js'),
        dependencies: [
          mId('node_modules/b/index.js'),
          mId('node_modules/d/index.js')
        ],
        dependents: [
          mId('entry-1.js')
        ],
        assetModule: false,
        npmModule: true,
      },
      [mId('node_modules/d/index.js')]: {
        id: 9,
        entry: false,
        ghost: false,
        output: undefined,
        filename: mId('node_modules/d/index.js'),
        dependencies: [],
        dependents: [
          mId('entry-1.js'),
          mId('node_modules/c/index.js'),
          'ghost://entry/1.js'
        ],
        assetModule: false,
        npmModule: true,
      },
      [mId('entry-2.js')]: {
        id: 10,
        entry: false,
        ghost: false,
        output: undefined,
        filename: mId('entry-2.js'),
        dependencies: [
          mId('node_modules/b/2.js')
        ],
        dependents: [
          mId('entry-1.js')
        ],
        assetModule: false,
        npmModule: false,
      }
    };


    /* expect assets */
    const expectedAssets: ExpectedAssets = {
      'entry-1.js': {
        id: 1,
        filename: 'entry-1.js',
        path: mId('dist/entry-1.js'),
        content: `
          const a = require('./.npm/3.js');
          const b = require('./.npm/5.js');
          const c = require('./.npm/8.js');
          const d = require('./.npm/9.js');
          const {v: entry2} = require('./.npm/10.js');
          module.exports = {
            a,
            b,
            c,
            d,
            entry2
          };
        `
      },
      'foo/bar.js': {
        id: 2,
        filename: 'foo/bar.js',
        path: mId('dist/foo/bar.js'),
        content: `
          require('../.npm/9.js')
        `
      },
      '.npm/3.js': {
        id: 3,
        filename: '.npm/3.js',
        path: mId('dist/.npm/3.js'),
        content: `
          module.exports = {
            toString() {
              return require('./4.json').v
            }
          }
        `
      },
      '.npm/4.json': {
        id: 4,
        filename: '.npm/4.json',
        path: mId('dist/.npm/4.json'),
        content: `
          {
            "v": "a-1"
          }
        `
      },
      '.npm/5.js': {
        id: 5,
        filename: '.npm/5.js',
        path: mId('dist/.npm/5.js'),
        content: `
          module.exports = {
            toString() {
              return require('./6.js')
            }
          }
        `
      },
      '.npm/6.js': {
        id: 6,
        filename: '.npm/6.js',
        path: mId('dist/.npm/6.js'),
        content: `
          module.exports = require('./7.js')
        `
      },
      '.npm/7.js': {
        id: 7,
        filename: '.npm/7.js',
        path: mId('dist/.npm/7.js'),
        content: `
          module.exports = 'b-2'
        `
      },
      '.npm/8.js': {
        id: 8,
        filename: '.npm/8.js',
        path: mId('dist/.npm/8.js'),
        content: `
          const b = require('./5.js')
          const d = require('./9.js')
          module.exports = {
            toString() {
              return 'c'
            },
            printB() {
              return b.toString()
            },
            printD() {
              return d.toString()
            }
          }
        `
      },
      '.npm/9.js': {
        id: 9,
        filename: '.npm/9.js',
        path: mId('dist/.npm/9.js'),
        content: `
          module.exports = {
            toString() {
              return 'd'
            }
          }
        `
      },
      '.npm/10.js': {
        id: 10,
        filename: '.npm/10.js',
        path: mId('dist/.npm/10.js'),
        content: `
          const b2 = require('./7.js');
          module.exports = {
            v: 'entry-2',
            b2,
          }
        `
      },
    };

    validateModules(expectedModules, modules);
    validateAssets(expectedAssets, assets);
  });

  test('evaluate', async () => {
    const input = mId('entry-1.js');
    await transform({
      context: mId(),
      input: input,
      plugins: [
        plugins.clean(),
        plugins.emitFile()
      ]
    });

    const res = require(mId('dist/entry-1.js'));
    expect(res.a.toString()).toBe('a-1');
    expect(res.b.toString()).toBe('b-2');
    expect(res.c.toString()).toBe('c');
    expect(res.c.printB()).toBe('b-2');
    expect(res.c.printD().toString()).toBe('d');
    expect(res.d.toString()).toBe('d');
    expect(res.entry2).toBe('entry-2');
  });
});
