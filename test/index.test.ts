import Compiler from '../lib';
import * as fs from 'fs';
import * as path from 'path';
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
      const _ = require('lodash')

      console.log(chalk.red.bold('abc !!!'))
      console.log(_.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]))
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
