import {transform, plugins} from '../lib';

// test('test', () => {
//   const compiler = new Compiler({
//     input: {
//       content: `
//
//       `,
//       output: ''
//     }
//   });
//   compiler.run();
// });

transform({
  context: '',
  input: [
    {
      content: `
      const chalk = require('chalk')
      const abc = require('./abc')

      console.log(chalk.green.bold('hello world!!!'))
      `,
      output: 'main.js'
    },
    {
      content: `
      const chalk = require('chalk')
      console.log(chalk.red.bold('====> ABC <===='))
      `,
      output: 'abc.js',
    },
  ],
  include: [],
  exclude: [],
  alias: {},
  plugins: [
    plugins.emitFile(),
    plugins.clean(),
  ],
  advanced: {}
});
