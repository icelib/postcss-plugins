import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const siteRoot = resolve(here, '..')
const sourceRoot = join(siteRoot, 'src')
const generatedRoot = join(sourceRoot, '.generated')
const repositoryRoot = resolve(siteRoot, '../..')
const packagesRoot = join(repositoryRoot, 'packages')

const plugins = [
  {
    slug: 'postcss-plugin-shared',
    packageDir: 'postcss-plugin-shared',
    extras: [],
  },
  {
    slug: 'postcss-rem-to-responsive-pixel',
    packageDir: 'postcss-rem-to-responsive-pixel',
    extras: [],
  },
  {
    slug: 'postcss-rem-to-viewport',
    packageDir: 'postcss-rem-to-viewport',
    extras: [],
  },
  {
    slug: 'postcss-pxtrans',
    packageDir: 'postcss-pxtrans',
    extras: [],
  },
  {
    slug: 'postcss-rule-unit-converter',
    packageDir: 'postcss-rule-unit-converter',
    extras: ['API', 'COOKBOOK', 'MIGRATION', 'PRESET_AUTHORING'],
  },
  {
    slug: 'postcss-units-to-px',
    packageDir: 'postcss-units-to-px',
    extras: [],
  },
]

const locales = [
  { key: 'en', suffix: '.md', prefix: '' },
  { key: 'zh-CN', suffix: '.zh-CN.md', prefix: 'zh-CN/' },
]

const extraFiles = new Set(['API', 'COOKBOOK', 'MIGRATION', 'PRESET_AUTHORING'])

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function routeFor(slug, name, locale) {
  const suffix = name === 'README' ? '' : `/${name.toLowerCase().replaceAll('_', '-')}`
  return `/${locale.prefix}plugins/${slug}${suffix || '/'}`
}

function packageLink(slug, locale, file) {
  const targetLocale = file.endsWith('.zh-CN.md') ? locales[1] : file.endsWith('.md') ? locales[0] : locale
  const normalized = file.replace(/^\.\//, '').replace(/\.zh-CN(?=\.md$)/, '')
  if (normalized === 'README.md') {
    return routeFor(slug, 'README', targetLocale)
  }
  const base = normalized.replace(/\.md$/, '').toUpperCase()
  if (extraFiles.has(base)) {
    return routeFor(slug, base, targetLocale)
  }
  return `https://github.com/sonofmagic/postcss-plugins/blob/main/packages/${slug}/${normalized}`
}

function rewriteLinks(markdown, slug, locale) {
  return markdown.replace(/\]\(([^)]+)\)/g, (match, target) => {
    if (/^(?:https?:|#|mailto:|javascript:)/.test(target)) {
      return match
    }
    const [pathPart, hash = ''] = target.split('#', 2)
    if (!pathPart) {
      return match
    }
    let targetSlug = slug
    let targetFile = pathPart
    const sibling = pathPart.match(/^\.\.\/(postcss-[^/]+)\/(.+)$/)
    if (sibling) {
      targetSlug = sibling[1]
      targetFile = sibling[2]
    }
    const rewritten = packageLink(targetSlug, locale, targetFile)
    return `](${rewritten}${hash ? `#${hash}` : ''})`
  })
}

async function syncLocale(locale) {
  for (const plugin of plugins) {
    const packageRoot = join(packagesRoot, plugin.packageDir)
    const packageJson = await readJson(join(packageRoot, 'package.json'))
    const readmeName = locale.key === 'en' ? 'README.md' : 'README.zh-CN.md'
    const readme = await readFile(join(packageRoot, readmeName), 'utf8')
    const targetDir = join(generatedRoot, locale.prefix, 'plugins', plugin.slug)
    await mkdir(targetDir, { recursive: true })
    const overview = rewriteLinks(readme, plugin.slug, locale)
    const header = `---\ntitle: ${packageJson.name}\ndescription: ${packageJson.description}\n---\n\n`
    await writeFile(join(targetDir, 'index.md'), header + overview)

    for (const extra of plugin.extras) {
      const name = locale.key === 'en' ? `${extra}.md` : `${extra}.zh-CN.md`
      const source = join(packageRoot, name)
      const content = await readFile(source, 'utf8')
      await writeFile(
        join(targetDir, `${extra.toLowerCase().replaceAll('_', '-')}.md`),
        rewriteLinks(content, plugin.slug, locale),
      )
    }
  }
}

await rm(generatedRoot, { recursive: true, force: true })
await mkdir(generatedRoot, { recursive: true })
await cp(join(sourceRoot, 'index.md'), join(generatedRoot, 'index.md'))
await cp(join(sourceRoot, 'guide'), join(generatedRoot, 'guide'), { recursive: true })
await cp(join(sourceRoot, 'zh-CN'), join(generatedRoot, 'zh-CN'), { recursive: true })
await syncLocale(locales[0])
await syncLocale(locales[1])

console.log(`Synced ${plugins.length} plugins into ${relative(repositoryRoot, generatedRoot)}`)
