import {Compiler} from 'module-transformer';
import {getFixturesPath, readFile} from '../util';
import * as path from 'path';

const entryContent = readFile(getFixturesPath('entry-1.js'));

describe('Options', () => {
  test('default options', () => {
    const entryPath = getFixturesPath('entry-1.js');
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
});
