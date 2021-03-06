# module-transformer
transform the node module to the dest path

[![Build Status](https://travis-ci.com/peakchen90/module-transformer.svg?branch=master)](https://travis-ci.com/peakchen90/module-transformer)

## example

### source file

**node_modules/lib/index.js**
```js
const main = require('./main');
main();
```

**node_modules/lib/main.js**
```js
module.exports = () => {
  console.log('main');
}
```

**index.js**
```js
require('lib');
console.log('other...')
```

### scripts
```js
const path = require('path');
const transformer = require('module-transformer');

transformer.transform({
  context: process.cwd(),
  input: [
    'index.js'
  ],
  output: {
    path: 'dist',
    moduleDir: '.modules',
    namedModule: 'id'
  },
  exclude: [],
  alias: {
    '@': path.join(__dirname, 'src')
  },
  cache: false,
  plugins: [
    transformer.plugins.emitFile()
  ],
  advanced: {
    parseOptions: {
      ecmaVersion: 2020
    }
  }
})
```

### transform code

#### TOC
```
├── dist
|  ├── .modules
|  |  ├── 2.js
|  |  └── 3.js
|  └── index.js
```

**dist/.modules/2.js**
```js
const main = require('./3.js');
main();
```

**dist/.modules/3.js**
```js
module.exports = () => {
  console.log('main');
}
```

**dist/index.js**
```js
require('./.modules/2.js');
console.log('other...')
```

## 流程

- 加载配置
- 加载插件
- 遍历解析入口
- 按规则递归解析 module，生成模块依赖关系图
- 根据依赖关系生成资源树
- 编译完成

## 插件
```js
function testPlugin(options) {
  return (compiler) => {
    compiler.hook('beforeCompile', async () => {
      console.log(compiler);
    })
    compiler.hook('done', async (stat) => {
      console.log(compiler);
    })
  }
}

// 配置
const options = {
  plugins: [
    testPlugin({
      // ...
    })
  ]
}
```

