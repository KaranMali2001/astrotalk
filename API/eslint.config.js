// // eslint.config.js
// import js from '@eslint/js';
// import tsPlugin from '@typescript-eslint/eslint-plugin';
// import tsParser from '@typescript-eslint/parser';
// import prettier from 'eslint-plugin-prettier';

// export default [
//   {
//     ignores: ['dist/**', 'node_modules/**', 'esbuild.config.js'],
//   },
//   js.configs.recommended,
//   {
//     files: ['src/**/*.{ts,js}'],
//     languageOptions: {
//       parser: tsParser,
//       ecmaVersion: 'latest',
//       sourceType: 'module',
//       globals: {
//         node: true,
//         fetch: 'readonly',
//         process: 'readonly',
//         console: 'readonly',
//         require: 'readonly',
//         module: 'readonly',
//         __dirname: 'readonly',
//       },
//     },
//     plugins: {
//       prettier,
//       '@typescript-eslint': tsPlugin,
//     },
//     rules: {
//       'prettier/prettier': 'error',
//       'no-unused-vars': 'off',
//       '@typescript-eslint/no-unused-vars': 'off',
//       'no-undef': 'off',
//       'padding-line-between-statements': [
//         'error',
//         { blankLine: 'always', prev: 'const', next: 'return' },
//         { blankLine: 'always', prev: '*', next: 'block-like' },
//       ],
//     },
//   },
//   {
//     files: ['src/**/*.d.ts'],
//     rules: {
//       'no-unused-vars': 'off',
//       '@typescript-eslint/no-unused-vars': 'off',
//       'no-undef': 'off',
//     },
//   },
// ];
