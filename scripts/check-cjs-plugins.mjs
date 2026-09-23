import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rootRequire = createRequire(import.meta.url)
const packageNames = [
  'postcss-plugin-shared',
  'postcss-pxtrans',
  'postcss-rem-to-responsive-pixel',
  'postcss-rem-to-viewport',
  'postcss-rule-unit-converter',
  'postcss-units-to-px',
]

const cases = [
  {
    name: 'postcss-pxtrans',
    create: plugin => plugin(),
    input: '.a{margin:1px}',
    output: '.a{margin:1rpx}',
  },
  {
    name: 'postcss-rem-to-responsive-pixel',
    create: plugin => plugin(),
    input: '.a{font-size:1rem}',
    output: '.a{font-size:16px}',
  },
  {
    name: 'postcss-rem-to-viewport',
    create: plugin => plugin(),
    input: '.a{font-size:1rem}',
    output: '.a{font-size:4.266666666666667vw}',
  },
  {
    name: 'postcss-rule-unit-converter',
    create: plugin => plugin({ rules: [{ from: 'rem', to: 'px', factor: 16 }] }),
    input: '.a{margin:1rem}',
    output: '.a{margin:16px}',
    verify(plugin) {
      assert.equal(typeof plugin.composeRules, 'function')
      assert.equal(typeof plugin.presets, 'object')
    },
  },
  {
    name: 'postcss-units-to-px',
    create: plugin => plugin(),
    input: '.a{margin:1rem}',
    output: '.a{margin:16px}',
  },
]

function packageJson(name) {
  return JSON.parse(fs.readFileSync(join(root, 'packages', name, 'package.json'), 'utf8'))
}

function packageTarballPath(fixture, name) {
  const pkg = packageJson(name)
  return join(fixture, `${name}-${pkg.version}.tgz`)
}

function packPackage(fixture, name) {
  const distPath = join(root, 'packages', name, 'dist')
  if (!fs.existsSync(distPath)) {
    throw new Error(`Missing ${distPath}; run pnpm build before check:cjs`)
  }

  execFileSync('pnpm', [
    '--filter',
    name,
    'pack',
    '--pack-destination',
    fixture,
  ], {
    cwd: root,
    stdio: 'ignore',
  })
  return packageTarballPath(fixture, name)
}

function extractPackage(fixture, name, tarball) {
  execFileSync('tar', ['-xzf', tarball, '-C', fixture], { stdio: 'ignore' })
  const packageDir = join(fixture, 'node_modules', name)
  fs.mkdirSync(dirname(packageDir), { recursive: true })
  fs.renameSync(join(fixture, 'package'), packageDir)
}

function linkRootDependency(fixture, name) {
  const target = join(root, 'node_modules', name)
  if (!fs.existsSync(target)) {
    throw new Error(`Missing workspace dependency ${target}`)
  }
  fs.symlinkSync(target, join(fixture, 'node_modules', name), 'junction')
}

async function main() {
  const fixture = fs.mkdtempSync(join(os.tmpdir(), 'postcss-plugins-cjs-'))
  const fixtureEntry = join(fixture, 'consumer.cjs')
  fs.mkdirSync(join(fixture, 'node_modules'), { recursive: true })
  fs.writeFileSync(fixtureEntry, '')

  try {
    for (const name of packageNames) {
      extractPackage(fixture, name, packPackage(fixture, name))
    }

    // Resolve only the packed artifacts from the isolated fixture. The shared
    // package still needs its normal runtime dependency, so link that one from
    // the workspace without exposing workspace source exports to the test.
    linkRootDependency(fixture, 'defu')
    const fixtureRequire = createRequire(fixtureEntry)
    const postcss = rootRequire('postcss')

    const shared = fixtureRequire('postcss-plugin-shared')
    assert.equal(typeof shared.toFixed, 'function')
    assert.equal(shared.toFixed(1.25, 1), 1.3)

    for (const item of cases) {
      const plugin = fixtureRequire(item.name)
      assert.equal(typeof plugin, 'function', `${item.name} CJS entry must be callable`)
      assert.equal(plugin.default, plugin, `${item.name} CJS default must point to the callable entry`)
      item.verify?.(plugin)

      const result = await postcss([item.create(plugin)]).process(item.input, { from: undefined })
      assert.equal(result.css, item.output, `${item.name} CJS plugin output changed`)
      console.log(`${item.name} CJS: ${result.css}`)

      const packageDir = join(fixture, 'node_modules', item.name)
      const esm = await import(pathToFileURL(join(packageDir, 'dist', 'index.mjs')).href)
      assert.equal(typeof esm.default, 'function', `${item.name} ESM default must be callable`)
      console.log(`${item.name} ESM: ok`)
    }

    const presets = fixtureRequire('postcss-rule-unit-converter/presets')
    assert.equal(typeof presets.remToPx, 'function')
    const presetsEsm = await import(pathToFileURL(
      join(fixture, 'node_modules/postcss-rule-unit-converter/dist/presets.mjs'),
    ).href)
    assert.equal(typeof presetsEsm.remToPx, 'function')

    const defaults = fixtureRequire('postcss-units-to-px/defaults')
    assert.equal(defaults.defaultUnitMap.rem, 16)
    const defaultsEsm = await import(pathToFileURL(
      join(fixture, 'node_modules/postcss-units-to-px/dist/defaults.mjs'),
    ).href)
    assert.equal(defaultsEsm.defaultUnitMap.rem, 16)
    console.log('subpaths CJS/ESM: ok')
  }
  finally {
    fs.rmSync(fixture, { recursive: true, force: true })
  }
}

await main()
