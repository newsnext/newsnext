import antfu from "@antfu/eslint-config"
import eslintReact from "@eslint-react/eslint-plugin"
import reactHooks from "eslint-plugin-react-hooks"

export default antfu(
  {
    react: true,
    lessOpinionated: true,
    markdown: false,
    stylistic: {
      quotes: "double",
    },
    ignores: [
      "public/**",
      "packages/extension-connection/src/generated/**",
      "packages/registry/registry.json",
      "packages/registry/loaders.ts",
    ],
    rules: {
      "antfu/curly": "error",
      "curly": "off",
      "style/brace-style": ["error", "1tbs"],
      "unused-imports/no-unused-vars": "warn",
    },
  },
  {
    name: "newsnext/command-line-scripts",
    files: [
      "packages/registry/build.ts",
      "packages/ui/scripts/**/*.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },
  reactHooks.configs.flat["recommended-latest"],
  eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"],
  {
    name: "newsnext/react-compiler-adoption",
    rules: {
      "react/refs": "warn",
    },
  },
  {
    name: "newsnext/esm-top-level-await",
    files: [
      "**/*.{test,spec}.{ts,tsx}",
      "packages/registry/build.ts",
    ],
    rules: {
      "antfu/no-top-level-await": "off",
    },
  },
  {
    name: "newsnext/react-refresh-boundaries",
    files: [
      "apps/extension/src/components/card/card-back/fields.tsx",
      "apps/extension/src/entrypoints/**/*.{ts,tsx}",
      "apps/extension/src/pages/**/*.{ts,tsx}",
      "packages/ui/src/components/**/*.{ts,tsx}",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
)
