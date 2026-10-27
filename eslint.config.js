import js from "@eslint/js";
import ts from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";
export default ts.config(
  { ignores: ["dist", "test-results", "playwright-report"] },
  js.configs.recommended,
  {
    files: ["mobile/**/*.js", "mobile/**/*.mjs", "mobile/**/*.cjs"],
    languageOptions: { globals: globals.node },
  },
  ...ts.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.jest },
    },
    plugins: { "react-hooks": hooks },
    rules: hooks.configs.recommended.rules,
  },
);
