# Project Graph 思维导图 JSON 文件规范

本文档根据 `app/src/types/node.tsx` 文件中的 TypeScript 类型定义，总结了 Project Graph 使用的思维导图 JSON 文件格式规范。

## 1. 根结构 (`Serialized.File`)

JSON 文件的顶层是一个对象，包含以下属性：

- `version`: `string` - **必需**。表示此文件格式的版本号 (例如 `"1.0.0"`)。
- `entities`: `Array<Entity>` - **必需**。一个包含所有节点对象的数组。
- `associations`: `Array<Association>` - **必需**。一个包含所有连接线（边）对象的数组。
- `tags`: `Array<string>` - **必需**。一个包含与此思维导图相关的标签字符串的数组。

```json
{
  "version": "...",
  "entities": [ ... ],
  "associations": [ ... ],
  "tags": [ ... ]
}
```

## 2. 基础对象 (`Serialized.StageObject`)

所有实体（Entity）和关联（Association）都继承自此基础结构：

- `uuid`: `string` - **必需**。对象的唯一标识符。
- `type`: `string` - **必需**。对象的类型标识符 (例如, `"core:text_node"`, `"core:line_edge"`)。

## 3. 实体 (`Serialized.Entity`)

大多数节点类型都继承自实体，它在 `StageObject` 的基础上增加了：

- `location`: `Vector` (`[number, number]`) - **必需**。节点在画布上的位置 `[x, y]`。
- `details`: `string` - **必需**。节点的详细描述或备注信息。

## 4. 实体类型 (Nodes)

`entities` 数组可以包含以下类型的节点对象：

### 文本节点 (`Serialized.TextNode`)

- `type`: `"core:text_node"`
- `size`: `Vector` (`[number, number]`) - **必需**。节点的尺寸 `[width, height]`。
- `text`: `string` - **必需**。节点显示的文本内容。
- `color`: `Color` (`[number, number, number, number]`) - **必需**。节点的背景颜色 `[r, g, b, a]` (0-255)。
- `sizeAdjust`: `"auto" | "manual"` - **必需**。节点尺寸调整模式。`auto` 表示自动缩紧，`manual` 表示手动调宽、高度自适应。
- _(继承自 `Entity` 和 `StageObject`)_

### 区域节点 (`Serialized.Section`)

- `type`: `"core:section"`
- `size`: `Vector` - **必需**。区域的尺寸。
- `text`: `string` - **必需**。区域的标题。
- `color`: `Color` - **必需**。区域的背景颜色。
- `children`: `Array<string>` - **必需**。包含在此区域内的子节点 `uuid` 列表。
- `isHidden`: `boolean` - **必需**。区域是否隐藏。
- `isCollapsed`: `boolean` - **必需**。区域是否折叠。
- _(继承自 `Entity` 和 `StageObject`)_

### 连接点 (`Serialized.ConnectPoint`)

- `type`: `"core:connect_point"`
- _(继承自 `Entity` 和 `StageObject`)_ (似乎只用于标记连接位置)

### 图片节点 (`Serialized.ImageNode`)

- `type`: `"core:image_node"`
- `path`: `string` - **必需**。图片文件的相对或绝对路径。
- `size`: `Vector` - **必需**。图片在画布上显示的尺寸。
- `scale`: `number` - **必需**。图片的缩放比例。
- _(继承自 `Entity` 和 `StageObject`)_

### URL 节点 (`Serialized.UrlNode`)

- `type`: `"core:url_node"`
- `url`: `string` - **必需**。链接指向的 URL。
- `title`: `string` - **必需**。节点上显示的标题。
- `size`: `Vector` - **必需**。节点的尺寸。
- `color`: `Color` - **必需**。节点的背景颜色。
- _(继承自 `Entity` 和 `StageObject`)_

### 传送门节点 (`Serialized.PortalNode`)

- `type`: `"core:portal_node"`
- `portalFilePath`: `string` - **必需**。链接到的另一个 Project Graph 文件的路径。
- `targetLocation`: `Vector` - **必需**。在目标文件中聚焦的位置 `[x, y]`。
- `cameraScale`: `number` - **必需**。在目标文件中聚焦时的缩放级别。
- `title`: `string` - **必需**。传送门节点显示的标题。
- `size`: `Vector` - **必需**。节点的尺寸。
- `color`: `Color` - **必需**。节点的背景颜色。
- _(继承自 `Entity` 和 `StageObject`)_

### 画笔笔划 (`Serialized.PenStroke`)

- `type`: `"core:pen_stroke"`
- `content`: `string` - **必需**。笔划数据 (可能是 SVG 路径或其他格式)。
- `color`: `Color` - **必需**。笔划的颜色。
- _(继承自 `Entity` 和 `StageObject`)_

## 5. 关联 (`Serialized.Association`)

所有连接线（边）类型都继承自关联，它在 `StageObject` 的基础上增加了：

- `text`: `string` - **必需**。连接线上显示的文本标签。

## 6. 关联类型 (Edges)

`associations` 数组可以包含以下类型的连接线对象，它们都继承自 `Association` 和 `StageObject`，并包含以下通用属性：

- `source`: `string` - **必需**。起始节点的 `uuid`。
- `target`: `string` - **必需**。目标节点的 `uuid`。
- `sourceRectRate`: `[number, number]` - **必需**。连接点相对于起始节点边界框的位置比例 `[x_rate, y_rate]` (例如 `[0.5, 0.5]` 表示中心)。
- `targetRectRate`: `[number, number]` - **必需**。连接点相对于目标节点边界框的位置比例 `[x_rate, y_rate]`。

具体的连接线类型有：

### 直线 (`Serialized.LineEdge`)

- `type`: `"core:line_edge"`
- `color`: `Color` - **必需**。线条的颜色。
- `text`: `string` - **必需**。 (注意: 此处 `text` 属性与 `Association` 中的 `text` 重复，具体使用逻辑需参考代码实现)
- _(继承自 `Edge`, `Association`, `StageObject`)_

### Catmull-Rom 样条曲线 (`Serialized.CublicCatmullRomSplineEdge`)

- `type`: `"core:cublic_catmull_rom_spline_edge"`
- `text`: `string` - **必需**。
- `controlPoints`: `Array<Vector>` - **必需**。定义曲线形状的控制点 `[x, y]` 数组。
- `alpha`: `number` - **必需**。 (用途不明确，可能是透明度或曲线参数)
- `tension`: `number` - **必需**。曲线的张力参数。
- _(继承自 `Edge`, `Association`, `StageObject`)_

## 7. 辅助类型

- `Vector`: `[number, number]` - 表示二维坐标 `[x, y]` 或尺寸 `[width, height]`。
- `Color`: `[number, number, number, number]` - 表示 RGBA 颜色，每个分量通常是 0-255 范围内的整数。
