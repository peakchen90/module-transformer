const commonjs = require('@rollup/plugin-commonjs');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const { default: babel } = require('@rollup/plugin-babel');
const replace = require('@rollup/plugin-replace');
const json = require('@rollup/plugin-json');
const { terser } = require('rollup-plugin-terser');
const babelConfig = require('./babel.config');

const __DEV__ = !!process.env.ROLLUP_WATCH;
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];

function generateConfig(
  {
    input,
    filename,
    format = 'umd',
    min = false,
  }
) {
  return {
    input,
    output: [
      {
        file: filename,
        format,
        sourcemap: true,
        exports: 'named'
      },
    ],
    watch: {
      include: 'src/**',
      exclude: 'node_modules/**'
    },
    plugins: [
      json(),
      commonjs(),
      babel({
        ...babelConfig,
        babelHelpers: 'runtime',
        extensions
      }),
      nodeResolve({
        extensions
      }),
      replace({
        __VERSION__: `"${require('./package.json').version}"`
      }),
      min && terser({
        output: {
          comments: false
        }
      }),
    ].filter(Boolean)
  };
}

module.exports = [
  generateConfig({
    input: 'src/index.ts',
    filename: 'dist/index.js',
    format: 'cjs'
  }),
];
