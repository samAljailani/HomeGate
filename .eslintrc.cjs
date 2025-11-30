// .eslintrc.cjs (Node + TS + Airbnb)
module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
  rules: {
    // tweak to taste
    'no-console': 'off',
    'class-methods-use-this': 'off',
  },
   ignorePatterns: [
    'node_modules',
    'dist',
    'tsconfig.json',
    'tsconfig.*.json',
  ]
};
