# postcss-plugin-shared

[English](./README.md) | 简体中文

`postcss-plugin-shared` 是 `postcss-plugins` monorepo 内部多个 PostCSS 插件之间复用的公共工具包，主要用于消除重复实现（配置合并、选择器黑名单、声明去重、exclude 匹配、单位正则与数值处理等）。

> 设计目标：**小而稳定、无副作用、可在多个插件中复用**。该包不包含具体的单位换算逻辑（例如 rem→px 的公式），只提供通用能力。

## 安装 / 使用方式

### 在本仓库（pnpm workspace）中

本仓库内建议使用 workspace 依赖：

```jsonc
// packages/your-plugin/package.json
{
  "dependencies": {
    "postcss-plugin-shared": "workspace:^"
  }
}
```

然后在插件代码中直接引用：

```ts
import { createExcludeMatcher, remRegex } from 'postcss-plugin-shared'
```

### 在仓库外使用

如果你把该包发布到了 npm，则可以使用常规安装方式（示例）：

```bash
pnpm add postcss-plugin-shared
```

该包声明了 `postcss` 为 `peerDependencies`（`^8`）。

## 导出内容（Exports）

入口：`packages/postcss-plugin-shared/src/index.ts`

- `mergeOptions`：基于 `defu` 的 options 合并工具（数组采用“覆盖”策略）
- `createConfigGetter`：基于 `mergeOptions` 生成 `getConfig(options?)` 的工厂函数
- `toFixed`：稳定的小数处理（避免 `-0`/精度噪声）
- `createUnitRegex`：可配置单位/跳过规则的通用单位正则工厂
- `remRegex` / `pxRegex`：用于替换 rem/px 的通用正则（排除字符串字面量、`url()`、`var()`）
- `blacklistedSelector`：选择器黑名单匹配（string 包含 / RegExp 匹配）
- `maybeBlacklistedSelector`：与 `blacklistedSelector` 逻辑一致，但 selector 非字符串时返回 `undefined`
- `createPropListMatcher`：根据 propList 生成属性匹配函数（支持 `*` 通配）
- `createAdvancedPropListMatcher`：支持高级 `propList` 语法的属性匹配器（string[]，通配符 + 取反）
- `createExcludeMatcher`：根据 exclude 生成文件路径排除函数（数组或函数）
- `createSelectorBlacklistMatcher`：选择器黑名单匹配器（支持缓存）
- `declarationExists`：用于检测某 rule/decls 中是否已存在相同 `prop/value`，可同时比较优先级，避免重复注入
- `walkAndReplaceValues`：通用遍历替换逻辑（decl 值与 media params）

## API 说明

### `mergeOptions(options, defaults)`

用于把用户配置与默认配置合并，行为特点：

- 对象字段按 `defu` 语义合并（仅在 `options` 未提供时回退到 `defaults`）
- **数组字段采用覆盖策略**：如果 `options.someArray` 与 `defaults.someArray` 都是数组，则使用 `options.someArray` 覆盖

```ts
import { mergeOptions } from 'postcss-plugin-shared'

interface Options {
  propList: string[]
  unitPrecision: number
}

const defaults: Options = { propList: ['*'], unitPrecision: 5 }
const resolved = mergeOptions<Options>({ propList: ['font-size'] }, defaults)
// resolved.propList === ['font-size']
```

### `createConfigGetter(defaults)`

用于生成一个类型友好的 `getConfig(options?)`：

```ts
import { createConfigGetter } from 'postcss-plugin-shared'

const defaultOptions = { rootValue: 16, propList: ['*'] as string[] }
export const getConfig = createConfigGetter(defaultOptions)
```

### `toFixed(number, precision)`

对数值进行稳定四舍五入：

- `number === 0` 时直接返回 `0`
- 保留符号（支持负数）
- 使用 `Number.EPSILON` 降低浮点误差影响

```ts
import { toFixed } from 'postcss-plugin-shared'

toFixed(1.005, 2) // 1.01
toFixed(0, 5) // 0
```

### `createUnitRegex(options)`

用于构建单位替换用的全局正则，并可配置“跳过规则”：

- 捕获组 1 为数值部分
- 默认会跳过：引号字符串、`url(...)`、`var(...)`

```ts
import { createUnitRegex } from 'postcss-plugin-shared'

const re = createUnitRegex({ units: ['px', 'rpx'], ignoreCase: true })
```

### `remRegex` / `pxRegex`

用于 `String.prototype.replace` 的全局正则，匹配目标单位，并尽量避免误替换：

- 排除双引号字符串 `"..."`、单引号字符串 `'...'`
- 排除 `url(...)`
- 排除 `var(...)`
- 捕获组 1 为数值部分（例如 `1.25`）

### `blacklistedSelector(blacklist, selector?)`

判断当前 `selector` 是否命中黑名单：

- `blacklist` 支持 `string | RegExp`
- `selector` 非字符串时返回 `false`

### `maybeBlacklistedSelector(blacklist, selector?)`

与 `blacklistedSelector` 一致，但当 `selector` 不是字符串时返回 `undefined`（方便调用方区分“未提供 selector”与“未命中”）。

### `createPropListMatcher(propList)`

生成一个 `(prop: string) => boolean` 的匹配器，用于快速判断某个 CSS 属性是否需要处理。

规则：

- 包含 `'*'` 时默认匹配全部属性
- 以 `!` 开头的字符串表示排除属性，支持：
  - `!foo`：精确排除
  - `!foo*`、`!*foo`、`!*foo*`、`!--wot-*-font-size`：按 glob 模式排除
- 其他不带 `*` 的字符串仍然使用 `prop.includes(rule)` 规则
- 带 `*` 的字符串按 glob 模式匹配
- `RegExp` 使用 `Boolean(prop.match(rule))`

### `createAdvancedPropListMatcher(propList)`

用于 `string[]` 的高级 `propList` 匹配器（兼容 `postcss-pxtrans` 的写法）：

- `*`：匹配所有属性
- `foo`：精确匹配
- 只要字符串中包含 `*`，就按 glob 匹配，例如 `foo*`、`*foo`、`*foo*`、`!--wot-*-font-size`
- `!pattern`：取反（黑名单）

### `createExcludeMatcher(exclude)`

生成一个 `(filepath?: string) => boolean` 的排除函数。

### `declarationExists(decls, prop, value, important?)`

检查同一规则中是否已有相同属性和值（常用于 `replace: false` 时 `cloneAfter` 的去重判断）。省略 `important` 时匹配任意优先级，保持原有三参数行为；显式传入 `true` 或 `false` 时，严格匹配归一化后的 `!important` 标志。

### `walkAndReplaceValues(options)`

默认 `replace: true` 会原位转换每条命中的声明，即使已存在相同属性和转换后值。声明顺序和 `!important` 保持不变；此函数不删除重复声明。

`skipDuplicate` 默认为 `true`，仅控制 `replace: false` 时的插入行为：保留原声明，已有相同属性、值和优先级时不再插入。普通声明不会阻止重要声明的 fallback，反之亦然。设置 `skipDuplicate: false` 后，即使存在相同组合，仍插入转换后的声明。

可选择两种值转换策略：

```ts
interface WalkAndReplaceOptions {
  // 为没有源码信息的手工 AST 提供可选上下文：
  input?: Input
  // 原有正则策略：
  unitRegex?: RegExp
  createReplacer?: (context: ReplaceContext) => (m: string, $1?: string) => string
  // 整值转换策略；提供时优先使用：
  createValueTransformer?: (context: ReplaceContext) => (value: string) => string
  // 其他 walker 选项保持不变。
}
```

`createValueTransformer` 完全绕过正则匹配及其预检查，接收每条符合条件的声明值；
开启 `mediaQuery` 后，也接收媒体查询参数。两种策略共享过滤、上下文、原位替换、
fallback 和去重逻辑。未提供整值转换器时，必须同时提供 `unitRegex` 和
`createReplacer`；不完整的策略会抛出 `TypeError`。

`context.input`、`context.filePath` 和 `exclude` 使用根 CSS 入口。转换器可通过
`context.decl?.source?.input.file` 获取导入声明的原文件。

手工创建的根节点没有 `root.source.input` 时，可传入 `input` 作为回调和排除
规则的上下文；真实根输入始终优先。walker 不会将备用输入附加到任何 AST
源码或创建 sourcemap 信息。两种输入都没有时，根节点保持原样。
