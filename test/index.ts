const transformer = require('../lib');
const path = require('path');
const { performance } = require('perf_hooks');

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
    namedModule: 'hash',
  },
  cache: true,
  include: [

  ],
  exclude: [

  ],
  plugins: [
    transformer.plugins.clean(),
    transformer.plugins.emitFile(),
  ],
  advanced: {
    parseOptions: {
      locations: true
    }
  }
}).then(() => {
  console.log('cost:', ((performance.now() - mark) / 1000).toFixed(3));
});
