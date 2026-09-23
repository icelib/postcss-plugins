import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['./src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    target: 'node16',
    deps: { neverBundle: ['postcss-plugin-shared', 'postcss-rule-unit-converter'] },
    failOnWarn: false,
  },
  {
    entry: {
      'index.require': './src/index-require.cts',
    },
    format: ['cjs'],
    dts: true,
    clean: false,
    target: 'node16',
    deps: { neverBundle: ['postcss-plugin-shared', 'postcss-rule-unit-converter'] },
    failOnWarn: false,
  },
])
