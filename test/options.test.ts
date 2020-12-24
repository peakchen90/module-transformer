import {Compiler} from 'module-transformer';
import {mId, readFile} from './util';
import * as path from 'path';

describe('Options', () => {
  test('default options', () => {
    const entryPath = mId('entry-1.js');
    const cwd = process.cwd();
    const compiler = new Compiler({
      input: entryPath
    });

    expect(compiler.options).toEqual({
      context: cwd,
      input: [
        {
          filename: entryPath,
          output: path.join(cwd, 'dist', path.relative(cwd, entryPath)),
          content: readFile(entryPath),
        }
      ],
      output: {
        path: path.join(cwd, 'dist'),
        moduleDir: path.join(cwd, 'dist/.modules'),
        namedModule: 'id'
      },
      alias: {},
      cache: false,
      exclude: [],
      plugins: [],
      advanced: {
        parseOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
        }
      }
    });
  });

  test('ghost entry', () => {
    const compiler = new Compiler({
      input: [
        {
          content: readFile(mId('entry-1.js')),
          output: 'a/b.js'
        }
      ]
    });
    expect(compiler.options.input[0]).toEqual({
      filename: 'ghost://entry/1.js',
      output: path.join(process.cwd(), 'dist/a/b.js'),
      content: readFile(mId('entry-1.js')),
    });
  });
});
