```js
const path = require('path');
const transformer = require('module-transformer');

const moduleA = `
  const a = require("path/a");
  console.log(a);
`

const moduleB = `
  const a = require("path/a");
  const b = require("path/b");
  const util = require("@/util");
  const lib = require("lib");
  console.log(a, b);
`

transformer.transform({
  context: process.cwd(), // 模块解析的上下文路径
  input: [
    './public/xxx/a.js',
    {
      filename: './build/public/xxx/b.js',
      content: '/* content */'
    }
  ],
  cache: true, // 开发模式启用
  module: {
    outputDir: './build/public/modules',  // 转换模块的输出目录
    extensions: ['.js', '.json'],
    include: [ // 包含解析模块的规则
      /^[^.]/,
      /^lib/,
      '@/util'
    ],
    exclude: [ // 排除解析模块的规则
      /^lib\/common/,
      '@/shared'
    ],
    alias: { // 解析模块id的别名映射
      '@': path.join(__dirname, 'src')
    }
  },
  plugins: [], // 插件
}).then(stat => {
  stat.modules = {
    '/User/abc/src/a.js': {
      id: 1,
      dependencies: [
        '/User/abc/src/b.js'
      ],
      dependents: []
    },
    '/User/abc/src/b.js': {
      id: 2,
      dependencies: [],
      dependents: [
        '/User/abc/src/a.js'
      ]
    }
  }
  stat.assets = {
    'build/public/modules/1.js': {
      id: 1,
      path: '/User/abc/modules/1.js',
      content: '/* content */',
    },
    'build/public/modules/2.js': {
      id: 2,
      path: '/User/abc/modules/2.js',
      content: '/* content */',
    },
    'build/public/modules/3.js': {
      id: 3,
      path: '/User/abc/modules/3.js',
      content: '/* content */',
    },
    'build/public/modules/4.js': {
      id: 4,
      path: '/User/abc/modules/4.js',
      content: '/* content */',
    },
  }

  const code = `
      /* transform moduleB code */
      const a = require("./modules/1.js");
      const b = require("./modules/2.js");
      const util = require("./modules/3.js");
      const lib = require("./modules/4.js");
      console.log(a, b);
    `;
})
```

## 设计

- 加载配置
- 加载插件
- 遍历解析入口
- 按规则递归解析 module，生成模块依赖关系图
- 根据依赖关系图替换 匹配到规则的模块id，并生成资源树
- 编译完成

## 插件
```js
function plugin(api, options) {
  api.hook('beforeCompile', async (compiler) => {
    console.log(compiler);
  })
  api.hook('done', async (compiler) => {
    console.log(compiler);
  })
}
```
