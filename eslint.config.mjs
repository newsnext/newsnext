import antfu from "@antfu/eslint-config"

export default antfu(
  {
    react: false,
    lessOpinionated: true,
    markdown: false,
    stylistic: {
      quotes: "double",
    },
    ignores: ["packages/ui/src/**", "public/**", "bun.lock", "**/routeTree.gen.ts", "**/.wxt/**"],
    rules: {
      "node/prefer-global/process": "off",
      "style/eol-last": "off",
      "antfu/curly": "error",
      "curly": "off",
      "style/brace-style": ["error", "1tbs"],
      "no-console": "off",
      "antfu/no-top-level-await": "off",
      "unused-imports/no-unused-vars": "warn",
      "no-control-regex": "off",
    },
  },
)
