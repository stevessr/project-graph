import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import pluginReact from "eslint-plugin-react";
import storybook from "eslint-plugin-storybook";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    settings: { react: { version: "19" } },
    languageOptions: { globals: globals.browser },
  },
  // Add Node.js environment for the MCP server
  {
    files: ["app/project-graph-cli-mcp-server/src/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  // https://github.com/eslint/eslint/discussions/18304
  {
    ignores: [
      "app/dist/**", // Ignore general app build output
      "app/project-graph-cli-mcp-server/build/**", // Ignore MCP server build output
      "app/src-tauri/*/*",
      "docs/src/.vitepress/dist/*/*",
      "docs/src/.vitepress/cache/*/*",
      "!.storybook",
      "docs/.source/index.ts", // Ignore auto-generated docs source file
    ],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  eslintConfigPrettier,
  eslintPluginPrettierRecommended,
  ...storybook.configs["flat/recommended"],
  // 2024/10/23 这里的rules不能写在上面，否则会被覆盖
  {
    rules: {
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
