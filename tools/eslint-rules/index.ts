import {
  RULE_NAME as noDirectFetchName,
  rule as noDirectFetch,
} from './rules/no-direct-fetch';
import {
  RULE_NAME as noConstructorInjectionName,
  rule as noConstructorInjection,
} from './rules/no-constructor-injection';
import {
  RULE_NAME as noHttpInComponentsName,
  rule as noHttpInComponents,
} from './rules/no-http-in-components';
/**
 * Import your custom workspace rules at the top of this file.
 *
 * For example:
 *
 * import { RULE_NAME as myCustomRuleName, rule as myCustomRule } from './rules/my-custom-rule';
 *
 * In order to quickly get started with writing rules you can use the
 * following generator command and provide your desired rule name:
 *
 * ```sh
 * npx nx g @nx/eslint:workspace-rule {{ NEW_RULE_NAME }}
 * ```
 */

module.exports = {
  /**
   * Apply the imported custom rules here.
   *
   * For example (using the example import above):
   *
   * rules: {
   *  [myCustomRuleName]: myCustomRule
   * }
   */
  rules: {
    [noHttpInComponentsName]: noHttpInComponents,
    [noConstructorInjectionName]: noConstructorInjection,
    [noDirectFetchName]: noDirectFetch,
  },
};
