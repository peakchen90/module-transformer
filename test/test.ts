import {mId} from './util';
import {plugins, transform} from '../lib';

transform({
  input: {
    content: `
    if (process.env.NODE_ENV === "development") {
      require('react.dev.js')
    } else {
      require('react.prod.js')
    }
    `,
    output: 'main.js'
  },
  alias: {},
  plugins: [
    plugins.replace({
      'process.env': '"development"'
    })
  ]
});
