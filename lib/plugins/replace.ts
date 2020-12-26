import Compiler from '../core';
import {noop, parseExpression} from '../core/util';

type RuleType = 'Identifier' | 'MemberExpression'
type RuleTest = (node: any) => boolean;

/**
 * 清除构建成果插件
 */
export default function replace(options?: Record<string, string>) {
  if (!options) {
    return noop;
  }

  const compareNode = (a: any, b: any): boolean => {
    if (!a || !b) return false;
    if (a.type === 'Identifier') {
      return a.type === b.type && a.name === b.name;
    }
    if (a.type === 'MemberExpression') {
      return a.computed === b.computed
        && a.optional === b.optional
        && compareNode(a.object, b.object)
        && compareNode(a.property, b.property);
    }
    return false;
  };

  const rules = new Set<{
    type: RuleType
    test: RuleTest
    replaceNode: acorn.Node
  }>();
  Object.keys(options).forEach(key => {
    if (key.trim().length === 0) {
      throw new Error('The replaced keyword should be a non-empty string');
    }
    const keywordNode = parseExpression(key);
    if (keywordNode.type !== 'Identifier' && keywordNode.type !== 'MemberExpression') {
      throw new Error('The replaced keyword must be an Identifier or a MemberExpression');
    }

    rules.add({
      type: keywordNode.type,
      test: (node) => {
        return compareNode(node, keywordNode);
      },
      replaceNode: parseExpression(options[key])
    });
  });

  let nextId = 0;

  function ReplacePlugin(compiler: Compiler) {
    compiler.applyCustomVisitor({
      Identifier(node: any, state) {
        rules.forEach(rule => {
          if (rule.type === 'Identifier' && rule.test(node)) {
            console.log(node);
          }
        });
        console.log('Identifier', node);
      },
      MemberExpression(node: any, state) {
        rules.forEach(rule => {
          if (rule.type === 'MemberExpression' && rule.test(node)) {
            console.log(node);
            state[++nextId] = node;
          }
        });
        console.log('MemberExpression', node);
      },
    });
  }

  return ReplacePlugin;
}
