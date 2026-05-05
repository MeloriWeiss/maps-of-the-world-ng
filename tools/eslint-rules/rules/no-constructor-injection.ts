import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

// NOTE: The rule will be available in ESLint configs as "@nx/workspace-no-constructor-injection"
export const RULE_NAME = 'no-constructor-injection';

export const rule = ESLintUtils.RuleCreator(() => __filename)({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: `No constructor injection`,
    },
    schema: [],
    messages: { hasParams: 'Constructor must be empty — use inject()' },
  },
  create(context) {
    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (isConstructor(node) && node.value.params.length > 0) {
          context.report({ node, messageId: 'hasParams' });
        }
      },
    };
  },
});

function isConstructor(
  node: TSESTree.MethodDefinition,
): node is TSESTree.MethodDefinition & {
  key: TSESTree.Identifier;
} {
  return node.key.type === 'Identifier' && node.key.name === 'constructor';
}
