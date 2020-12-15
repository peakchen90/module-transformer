import transformer from '../lib/index';
import path from 'path';
import {performance} from 'perf_hooks';

const mark = performance.now();

transformer.transform({
  context: path.join(__dirname),
  input: [
    {
      filename: 'fixtures/test1.js',
      output: 'index.js'
    }
  ],
  output: {
    moduleDir: 'npm',
    namedModule: 'named',
  },
  cache: false,
  exclude: [],
  alias: {
    'aaa': 'chalk'
  },
  plugins: [
    transformer.plugins.clean(),
    transformer.plugins.emitFile(),
  ],
  advanced: {
    parseOptions: {
      ecmaVersion: 2020
    }
  }
}).then(() => {
  console.log('cost:', ((performance.now() - mark) / 1000).toFixed(3));
});
