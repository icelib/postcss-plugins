import { spawn } from 'node:child_process'
import { execPath } from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const siteUrl = 'https://postcss.icebreaker.top'
const packageDocsRoot = fileURLToPath(new URL('../../../packages/', import.meta.url))
const syncScript = fileURLToPath(new URL('../scripts/sync-docs.mjs', import.meta.url))
const packageDocsFile = /(?:README(?:\.zh-CN)?|API(?:\.zh-CN)?|COOKBOOK(?:\.zh-CN)?|MIGRATION(?:\.zh-CN)?|PRESET_AUTHORING(?:\.zh-CN)?)\.md$/

interface DevServer {
  watcher: {
    add: (path: string) => void
    on: (event: 'change', callback: (file: string) => void) => void
    off: (event: 'change', callback: (file: string) => void) => void
  }
  ws: { send: (payload: { type: 'full-reload' }) => void }
  httpServer?: { once: (event: 'close', callback: () => void) => void }
}

const packageDocsSyncPlugin = {
  name: 'package-docs-sync',
  configureServer(server: DevServer) {
    let timer: ReturnType<typeof setTimeout> | undefined
    let syncing = false
    let queued = false
    const sync = () => {
      if (syncing) {
        queued = true
        return
      }
      syncing = true
      const child = spawn(execPath, [syncScript], { stdio: 'inherit' })
      child.once('close', () => {
        syncing = false
        server.ws.send({ type: 'full-reload' })
        if (queued) {
          queued = false
          sync()
        }
      })
    }
    const onPackageChange = (file: string) => {
      const normalizedFile = file.replaceAll('\\', '/')
      if (!normalizedFile.startsWith(packageDocsRoot.replaceAll('\\', '/'))) {
        return
      }
      if (!normalizedFile.endsWith('/package.json') && !packageDocsFile.test(normalizedFile)) {
        return
      }
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(sync, 120)
    }
    server.watcher.add(packageDocsRoot)
    server.watcher.on('change', onPackageChange)
    server.httpServer?.once('close', () => {
      server.watcher.off('change', onPackageChange)
      if (timer) {
        clearTimeout(timer)
      }
    })
  },
}

const pluginLinks = [
  { text: 'postcss-plugin-shared', link: '/plugins/postcss-plugin-shared/' },
  { text: 'postcss-rem-to-responsive-pixel', link: '/plugins/postcss-rem-to-responsive-pixel/' },
  { text: 'postcss-rem-to-viewport', link: '/plugins/postcss-rem-to-viewport/' },
  { text: 'postcss-pxtrans', link: '/plugins/postcss-pxtrans/' },
  { text: 'postcss-rule-unit-converter', link: '/plugins/postcss-rule-unit-converter/' },
  { text: 'postcss-units-to-px', link: '/plugins/postcss-units-to-px/' },
]

const zhPluginLinks = pluginLinks.map(({ text, link }) => ({
  text,
  link: `/zh-CN${link}`,
}))

const sharedSidebar = [
  {
    text: 'Start here',
    items: [
      { text: 'Choose a plugin', link: '/guide/choose-a-plugin' },
      { text: 'PostCSS integration', link: '/guide/postcss-integration' },
      { text: 'Recipes and migrations', link: '/guide/recipes' },
    ],
  },
  {
    text: 'Plugins',
    items: pluginLinks,
  },
]

const zhSidebar = [
  {
    text: '开始使用',
    items: [
      { text: '选择插件', link: '/zh-CN/guide/choose-a-plugin' },
      { text: '接入 PostCSS', link: '/zh-CN/guide/postcss-integration' },
      { text: '场景与迁移', link: '/zh-CN/guide/recipes' },
    ],
  },
  {
    text: '插件',
    items: zhPluginLinks,
  },
]

const head = [
  ['meta', { name: 'theme-color', content: '#0b1020' }],
  ['meta', { property: 'og:type', content: 'website' }],
  ['meta', { property: 'og:site_name', content: 'postcss-plugins' }],
  ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
]

const search = {
  provider: 'local' as const,
  options: {
    locales: {
      'zh-CN': {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            displayDetails: '显示详细信息',
            resetButtonTitle: '重置搜索',
            backButtonTitle: '返回',
            noResultsText: '没有结果',
            footer: {
              selectText: '选择',
              selectKeyAriaLabel: '选择',
              navigateText: '导航',
              navigateUpKeyAriaLabel: '向上',
              navigateDownKeyAriaLabel: '向下',
              closeText: '关闭',
              closeKeyAriaLabel: '关闭',
            },
          },
        },
      },
    },
  },
}

function routeFromPage(page: string) {
  const relativePath = page.replace(/\\/g, '/').replace(/^\.?\//, '')
  if (relativePath === 'index.md') {
    return '/'
  }
  if (relativePath.endsWith('/index.md')) {
    return `/${relativePath.slice(0, -'/index.md'.length)}/`
  }
  return `/${relativePath.replace(/\.md$/, '')}`
}

function localizedRoute(route: string, locale: 'en' | 'zh-CN') {
  if (locale === 'zh-CN') {
    return route.startsWith('/zh-CN/') ? route : `/zh-CN${route}`
  }
  return route.replace(/^\/zh-CN(?=\/)/, '') || '/'
}

export default defineConfig({
  srcDir: 'src/.generated',
  title: 'postcss-plugins',
  description: 'PostCSS unit conversion tools for responsive CSS and multi-platform projects.',
  lang: 'en-US',
  cleanUrls: true,
  head,
  sitemap: { hostname: siteUrl },
  vite: { plugins: [packageDocsSyncPlugin] },
  transformHead({ page, pageData, title, description }) {
    if (!pageData.filePath || pageData.isNotFound) {
      return []
    }
    const route = routeFromPage(pageData.relativePath || page)
    const url = `${siteUrl}${route}`
    const locale = route.startsWith('/zh-CN/') ? 'zh-CN' : 'en'
    const alternate = localizedRoute(route, locale === 'zh-CN' ? 'en' : 'zh-CN')
    return [
      ['link', { rel: 'canonical', href: url }],
      ['link', { rel: 'alternate', hreflang: locale, href: url }],
      ['link', { rel: 'alternate', hreflang: locale === 'zh-CN' ? 'en' : 'zh-CN', href: `${siteUrl}${alternate}` }],
      ['link', { rel: 'alternate', hreflang: 'x-default', href: `${siteUrl}${localizedRoute(route, 'en')}` }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:image', content: `${siteUrl}/logo.svg` }],
      ['meta', { name: 'twitter:card', content: 'summary' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
    ]
  },
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'postcss-plugins',
    search,
    outlineTitle: 'On this page',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Return to top',
    langMenuLabel: 'Change language',
    skipToContentLabel: 'Skip to content',
    darkModeSwitchLabel: 'Appearance',
    lightModeSwitchTitle: 'Switch to light theme',
    darkModeSwitchTitle: 'Switch to dark theme',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/icelib/postcss-plugins' },
    ],
    nav: [
      { text: 'Guide', link: '/guide/choose-a-plugin' },
      { text: 'Plugins', link: '/plugins/postcss-plugin-shared/' },
      { text: 'GitHub', link: 'https://github.com/icelib/postcss-plugins' },
    ],
    sidebar: sharedSidebar,
    outline: 'deep',
    footer: {
      message: 'Built for CSS that moves between screens.',
      copyright: 'Released under the MIT License.',
    },
  },
  locales: {
    'root': {
      label: 'English',
      lang: 'en',
      link: '/',
    },
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh-CN/',
      title: 'postcss-plugins 文档',
      description: '面向响应式 CSS 与多端项目的 PostCSS 单位转换工具。',
      themeConfig: {
        outlineTitle: '本页目录',
        sidebarMenuLabel: '目录',
        returnToTopLabel: '返回顶部',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳到正文',
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题',
        nav: [
          { text: '指南', link: '/zh-CN/guide/choose-a-plugin' },
          { text: '插件', link: '/zh-CN/plugins/postcss-plugin-shared/' },
          { text: 'GitHub', link: 'https://github.com/icelib/postcss-plugins' },
        ],
        sidebar: zhSidebar,
        footer: {
          message: '让 CSS 在不同屏幕之间稳定流动。',
          copyright: 'MIT License。',
        },
      },
    },
  },
})
