import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  {
    // React Compiler advisories added in eslint-config-next 16. The game loop and the
    // client-only "mounted" guards predate them; new code should still satisfy them.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  { ignores: ['.next/**', 'out/**', 'node_modules/**', '.orim-data/**', 'next-env.d.ts'] },
];

export default config;
