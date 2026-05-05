import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

// NOTE: The rule will be available in ESLint configs as "@nx/workspace-no-direct-fetch"
export const RULE_NAME = 'no-direct-fetch';

export const rule = ESLintUtils.RuleCreator(() => __filename)({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'No native fetch — use HttpClient',
    },
    schema: [],
    messages: { noFetch: 'No fetch() — use HttpClient' },
  },
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
          context.report({ node, messageId: 'noFetch' });
        }
      },
    };
  },
});
