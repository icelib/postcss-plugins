import { defineEslintConfig } from 'repoctl/tooling'

export default await defineEslintConfig({
  ignores: ['**/fixtures/**'],
})
