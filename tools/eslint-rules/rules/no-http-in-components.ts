import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

// NOTE: The rule will be available in ESLint configs as "@nx/workspace-no-http-in-components"
export const RULE_NAME = 'no-http-in-components';

export const rule = ESLintUtils.RuleCreator(() => __filename)({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'No HttpClient imports in components — use services',
    },
    schema: [],
    messages: {
      httpInComponent: 'Use services in components, not HttpClient',
    },
  },
  create(context) {
    if (!/component\.(ts|tsx)$/.test(context.filename)) return {};

    return {
      'ImportDeclaration[source.value="@angular/common/http"]'(
        node: TSESTree.ImportDeclaration,
      ) {
        context.report({
          node: node.specifiers?.[0] || node,
          messageId: 'httpInComponent',
        });
      },
    };
  },
});
