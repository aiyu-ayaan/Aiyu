import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    plugins: {
      "@next/next": nextPlugin,
      "react": reactPlugin,
      "react-hooks": hooksPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "no-undef": "error",
      "no-useless-escape": "off",
      "no-unused-vars": "off",
    },
    settings: {
      react: {
        // Pin the React version instead of "detect". Detection calls the
        // deprecated `context.getFilename()`, which ESLint 10 removed — under
        // eslint@10 that path throws while loading the react rules ("… .getFilename
        // is not a function"), failing the whole lint. An explicit version skips
        // detection entirely and is faster; safe on eslint 9 too.
        version: "19.2",
      },
      next: {
        rootDir: "./",
      },
    },
  },
  {
    ignores: [".next/*", "node_modules/*", "dist/*", "public/*"],
  },
];
