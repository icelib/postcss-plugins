# Preset Authoring Guide

如何为 `postcss-rule-unit-converter` 设计、组织、测试和发布自定义 preset。

- 总览与快速上手：[README.zh-CN.md](./README.zh-CN.md)
- API 文档：[API.zh-CN.md](./API.zh-CN.md)
- 迁移文档：[MIGRATION.zh-CN.md](./MIGRATION.zh-CN.md)

## 先决定该用哪种形态

下面场景适合单条 preset：

- 一个源单位对应一个目标单位
- 一组 options 只控制一条规则
- 和其他规则之间的顺序关系比较简单

下面场景适合 preset group：

- 一个业务模式下需要多条相关规则
- 多种单位需要统一归一到一个目标单位体系
- 你想沉淀一组可复用的偏业务化规则组合

## 编写单条 Preset

Preset options 可以使用命名 interface 或普通对象类型，无需添加索引签名。
`PresetFactory`、`PresetGroupFactory`、`definePreset` 和 `definePresetGroup`
统一接受 `object | undefined`，不接受 `number` 等原始类型。

```ts
import type { PresetFactory } from 'postcss-rule-unit-converter'
import { definePreset } from 'postcss-rule-unit-converter'

interface RemToDpOptions {
  rootValue?: number | ((input: import('postcss').Input) => number)
  to?: string
  minValue?: number
}

export const remToDp: PresetFactory<RemToDpOptions> = definePreset((options = {}) => {
  const { rootValue = 16, to = 'dp', minValue } = options

  return {
    from: 'rem',
    to,
    minValue,
    transform(value, context) {
      const resolvedRootValue = typeof rootValue === 'function'
        ? rootValue(context.input)
        : rootValue
      return value * resolvedRootValue
    },
  }
})
```

建议：

- option 名称尽量表达业务意图
- 单条 preset 只返回一条 `ConversionRule`
- 规则是静态倍率时优先用 `factor`
- 只有在需要 input-aware / context-aware 逻辑时再用 `transform`

## 编写 Preset Group

```ts
import type { PresetGroupFactory } from 'postcss-rule-unit-converter'
import { definePresetGroup } from 'postcss-rule-unit-converter'

interface MobilePresetOptions {
  rootValue?: number
  ratio?: number
  viewportWidth?: number
}

export const mobilePresetGroup: PresetGroupFactory<MobilePresetOptions> = definePresetGroup((options = {}) => {
  const {
    rootValue = 16,
    ratio = 2,
    viewportWidth = 375,
  } = options

  return [
    {
      from: 'rem',
      to: 'rpx',
      factor: rootValue * ratio,
    },
    {
      from: 'px',
      to: 'rpx',
      factor: ratio,
    },
    {
      from: 'vw',
      to: 'rpx',
      factor: viewportWidth * ratio / 100,
    },
  ]
})
```

建议：

- 只把属于同一个目标单位体系的规则放进一个 group
- 在返回数组里显式写清顺序
- 不要把互不相关的场景强行塞进一个 group

## Option 设计

优先暴露能表达转换意图的参数：

- `rootValue`
- `viewportWidth`
- `viewportHeight`
- `ratio`
- `to`
- `minValue`

不要过早暴露过多实现细节，除非用户真的需要控制它们。

## 使用上下文信息

当规则依赖下面这些因素时，使用 `RuleContext`：

- 当前文件路径
- 当前属性名
- 当前选择器
- 原始单位大小写
- 原始完整匹配文本

示例：

```ts
const rule = {
  transform(value, context) {
    if (context.prop === 'letter-spacing') {
      return value * 2
    }

    if (context.rawUnit === 'PX') {
      return {
        value,
        unit: 'ch',
      }
    }

    return value
  },
}
```

回调接收带符号的数值，包括科学计数法；不要为负值再次添加负号。
`minValue` 按绝对值比较。`context.input` 和 `context.filePath` 指向根入口；
需要区分导入声明的来源时，读取 `context.decl?.source?.input.file`。
默认 tokenizer 与自定义 `unitRegex` 的边界见 [匹配边界](./API.zh-CN.md#匹配边界)。

## 文件组织

推荐目录结构：

```text
src/
  presets/
    rem.ts
    viewport.ts
    mobile.ts
  index.ts
  presets.ts
test/
  rem.test.ts
  mobile.test.ts
```

推荐导出方式：

```ts
export { mobilePresetGroup } from './presets/mobile'
export { remToDp } from './presets/rem'
```

当 preset 数量增多时，尽量拆成多个小文件，不要把所有逻辑塞进一个超大文件。

## 测试策略

测试时优先走插件边界，而不是只断言原始规则对象。

```ts
import postcss from 'postcss'
import unitConverter from 'postcss-rule-unit-converter'
import { remToDp } from '../src/presets/rem'

it('converts rem to dp', () => {
  const result = postcss([
    unitConverter({
      rules: [remToDp({ rootValue: 20 })],
    }),
  ]).process('.rule{font-size:1rem}', { from: undefined }).css

  expect(result).toBe('.rule{font-size:20dp}')
})
```

建议覆盖：

- 默认参数
- 自定义参数
- 规则顺序
- `propList` / selector blacklist 交互
- 基于 `input` 的动态参数
- 原始匹配信息分支
- 带符号数值、科学计数法、零值与绝对值 `minValue` 阈值
- 完整单位边界、字符串 / URL 与深层 `var()` fallback
- 输出单位还能匹配规则时的重复处理

## 组合策略

当业务代码要混用下面几类规则时，用 `composeRules(...)`：

- 你自己的 preset group
- 内置 presets
- 一次性的临时规则

示例：

```ts
unitConverter({
  rules: composeRules(
    mobilePresetGroup({ ratio: 2 }),
    {
      from: 'em',
      to: 'rpx',
      factor: 32,
    },
  ),
})
```

## 发布策略

如果 preset 只服务当前项目：

- 放在业务自己的配置包里
- 从一个本地模块统一导出

如果 preset 会被多个项目复用：

- 单独发一个很薄的 wrapper package
- 导出带类型的 preset factory
- 测试和 preset 定义放在一起维护

## 常见错误

- 依赖隐式规则顺序
- 把不相关的转换硬塞进一个 preset group
- 太早暴露太多底层参数
- 只测规则对象，不测真实插件输出
- 忘了“先匹配到的规则优先”

## 一个经验法则

- 一条 preset 只表达一个转换意图
- 一个 preset group 只表达一个目标单位体系
- 组合放在业务层做，不要在项目里反复手写同一套转换逻辑
