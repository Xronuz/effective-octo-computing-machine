const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'import/no-unresolved': 'off',
      // O'zbek tilida apostrof/kesma belgilari keng qo'llaniladi; JSX da o'qishni qiyinlashtirmaydi.
      'react/no-unescaped-entities': 'off',
      // Data fetching hali useEffect da; keyinchalik TanStack Query ga o'tganda yoqiladi.
      'react-hooks/set-state-in-effect': 'off',
      // axios API dizayni default export ustidagi metodlarni qo'llab-quvvatlaydi.
      'import/no-named-as-default-member': 'off',
    },
  },
];
