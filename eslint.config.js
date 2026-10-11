// ESLint for Delivery Racer (src/delivery) and the scripts that check it. The site's own React code is not
// covered yet: it needs the JSX parser options and the React plugin first.
//   npm run lint
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', '.claude/**', '.wrangler/**'] },
  {
    files: ['src/delivery/**/*.js'],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } },
  },
  {
    files: ['scripts/**/*.mjs'],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
];
