import { defineEslintConfig } from 'repoctl/tooling'

export default await defineEslintConfig({
  // Type declaration tests intentionally import the built package entrypoints
  // from `dist`; they are compiled by `tsd`, rather than linted as runtime
  // source files. Keeping them out of ESLint avoids `no-import-dist` false
  // positives while the package lint task still covers implementation code.
  ignores: ['**/fixtures/**', '**/test-d/**', '**/benchmarks/**'],
})
