import { defineConfig } from 'vitepress'

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
  ['meta', { name: 'og:type', content: 'website' }],
  ['meta', { name: 'og:site_name', content: 'postcss-plugins' }],
  ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
]

export default defineConfig({
  srcDir: 'src/.generated',
  title: 'postcss-plugins',
  description: 'PostCSS unit conversion tools for responsive CSS and multi-platform projects.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  head,
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'postcss-plugins',
    search: { provider: 'local' },
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
