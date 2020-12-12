import Compiler from '../lib';
import emitFile from '../lib/plugins/emit-file';
import clean from '../lib/plugins/clean';

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


const compiler = new Compiler({
  context: 'test/dist',
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
      output: 'abc.js'
    },
  ],
  plugins: [
    emitFile(),
    clean()
  ]
});
compiler.run();
