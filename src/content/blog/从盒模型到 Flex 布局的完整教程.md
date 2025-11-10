---
title: 从盒模型到 Flex 布局的完整教程
description: CSS 布局是 Web 开发的基础，本文将系统讲解盒模型、常用属性、Flex 布局等核心概念。
publishedAt: 2025-11-10
tags:
  - react
  - 学习
  - js
---

  

> 从盒模型到 Flex 布局的完整教程

  

CSS 布局是 Web 开发的基础，本文将系统讲解盒模型、常用属性、Flex 布局等核心概念。

  

## 目录

  

- [一、盒模型：CSS 布局的基础](#一盒模型css-布局的基础)

- [二、Margin：外边距](#二margin外边距)

- [三、Padding：内边距](#三padding内边距)

- [四、Border：边框](#四border边框)

- [五、Width & Height：尺寸](#五width--height尺寸)

- [六、Display：显示类型](#六display显示类型)

- [七、Flex 布局：现代布局方案](#七flex-布局现代布局方案)

- [八、横向与纵向布局实战](#八横向与纵向布局实战)

- [九、常用单位详解](#九常用单位详解)

  

---

  

## 一、盒模型：CSS 布局的基础

  

### 什么是盒模型？

  

每个 HTML 元素都是一个**盒子**，由内到外包含四个部分：

  

```

┌─────────────────────────────────┐

│ margin (外边距) │ ← 元素外部的空白

│ ┌───────────────────────────┐ │

│ │ border (边框) │ │ ← 元素的边框

│ │ ┌─────────────────────┐ │ │

│ │ │ padding (内边距) │ │ │ ← 内容与边框之间

│ │ │ ┌───────────────┐ │ │ │

│ │ │ │ content │ │ │ │ ← 实际内容区域

│ │ │ │ (内容) │ │ │ │

│ │ │ └───────────────┘ │ │ │

│ │ └─────────────────────┘ │ │

│ └───────────────────────────┘ │

└─────────────────────────────────┘

```

  

### 盒模型的组成

  

1. **Content（内容）**: 文字、图片等实际内容

2. **Padding（内边距）**: 内容与边框之间的空白

3. **Border（边框）**: 盒子的边框线

4. **Margin（外边距）**: 盒子与其他元素之间的空白

  

### 实际示例

  

```javascript

render() {

return (

<div className="box">

这是内容

</div>

)

}

```

  

```less

.box {

width: 200px; // 内容宽度

height: 100px; // 内容高度

padding: 20px; // 内边距

border: 2px solid #ddd; // 边框

margin: 10px; // 外边距

background: lightblue;

}

  

// 实际占用空间 = 200 + 20×2 + 2×2 + 10×2 = 264px

```

  

**效果图:**

```

10px ←→ margin

┌─────────────────────────────┐

│ 2px ←→ border │

│ ┌─────────────────────────┐│

│ │ 20px ←→ padding ││

│ │ ┌───────────────────┐ ││

│ │ │ 200px × 100px │ ││ ← content

│ │ │ 这是内容 │ ││

│ │ └───────────────────┘ ││

│ └─────────────────────────┘│

└─────────────────────────────┘

```

  

---

  

## 二、Margin：外边距

  

### 作用

  

控制元素**外部**的空白距离，用于元素之间的间隔。

  

### 基础用法

  

```less

.box {

margin: 20px; // 四周都是 20px

margin: 10px 20px; // 上下 10px，左右 20px

margin: 10px 20px 30px 40px; // 上 右 下 左 (顺时针)

}

```

  

### 单独设置

  

```less

.box {

margin-top: 10px; // 上外边距

margin-right: 20px; // 右外边距

margin-bottom: 30px; // 下外边距

margin-left: 40px; // 左外边距

}

```

  

### 特殊值

  

#### 1. 水平居中

```less

.box {

width: 800px;

margin: 0 auto; // 水平居中（块级元素）

}

```

  

#### 2. 负边距

```less

.box {

margin-top: -10px; // 向上移动 10px

margin-left: -20px; // 向左移动 20px

}

```

  

#### 3. auto

```less

.box {

margin-left: auto; // 推到最右边

margin-right: auto; // 推到最左边

}

```

  

### Margin 折叠

  

**垂直方向的 margin 会折叠**（取较大值）：

  

```less

.box1 {

margin-bottom: 20px;

}

  

.box2 {

margin-top: 10px; // 两个盒子之间实际间距是 20px，不是 30px

}

```

  

### 实际例子

  

```javascript

render() {

return (

<div className="container">

<div className="card">卡片 1</div>

<div className="card">卡片 2</div>

<div className="card">卡片 3</div>

</div>

)

}

```

  

```less

.container {

padding: 20px;

background: #f0f0f0;

}

  

.card {

margin-bottom: 16px; // 卡片之间间距 16px

padding: 20px;

background: white;

border-radius: 8px;

  

&:last-child {

margin-bottom: 0; // 最后一个不需要下边距

}

}

```

  

---

  

## 三、Padding：内边距

  

### 作用

  

控制元素**内部**内容与边框之间的距离。

  

### 基础用法

  

```less

.box {

padding: 20px; // 四周都是 20px

padding: 10px 20px; // 上下 10px，左右 20px

padding: 10px 20px 30px 40px; // 上 右 下 左 (顺时针)

}

```

  

### 简写规则详解

  

#### 1 个值

```less

padding: 20px;

// 等价于

padding-top: 20px;

padding-right: 20px;

padding-bottom: 20px;

padding-left: 20px;

```

  

#### 2 个值

```less

padding: 10px 20px;

// ↑ ↑

// 上下 左右

  

// 等价于

padding-top: 10px;

padding-bottom: 10px;

padding-right: 20px;

padding-left: 20px;

```

  

#### 3 个值 ⭐️

```less

padding: 0 12px 12px;

// ↑ ↑ ↑

// 上 左右 下

  

// 等价于

padding-top: 0;

padding-right: 12px;

padding-bottom: 12px;

padding-left: 12px;

```

  

**效果图:**

```

┌────────────────┐

│ 0 │

│ 12px 内容 12px │

│ 12px │

└────────────────┘

```

  

#### 4 个值

```less

padding: 10px 20px 30px 40px;

// ↑ ↑ ↑ ↑

// 上 右 下 左 (顺时针 🕐)

```

  

### 记忆技巧

  

**口诀: "上右下左，顺时针转"**

  

```

上 (top)

↑

左 ← 内容 → 右

(left) (right)

↓

下 (bottom)

```

  

### 实际例子

  

```javascript

render() {

return (

<div className="card">

<div className="card-header">标题</div>

<div className="card-body">内容区域</div>

</div>

)

}

```

  

```less

.card {

background: white;

border-radius: 8px;

box-shadow: 0 2px 8px rgba(0,0,0,0.1);

}

  

.card-header {

padding: 16px; // 标题四周留白

border-bottom: 1px solid #f0f0f0;

font-size: 18px;

font-weight: bold;

}

  

.card-body {

padding: 0 16px 16px; // 上0，左右16px，下16px

// ↑ ↑↑↑↑ ↑↑↑↑

// 上边已经有 header 了，不需要 padding

font-size: 14px;

line-height: 1.6;

}

```

  

### 0 和 0px 的区别

  

**重要**: 当值为 0 时，单位可以省略

  

```less

// ✅ 推荐 - 简洁

padding: 0 12px 12px;

  

// ✅ 也可以 - 但啰嗦

padding: 0px 12px 12px;

  

// ❌ 错误 - 非零值必须带单位

padding: 0 12 12;

```

  

**规则**:

- 0 值 → 不需要单位（更简洁）

- 非 0 值 → 必须加单位

  

---

  

## 四、Border：边框

  

### 基础用法

  

```less

.box {

border: 1px solid #ddd; // 宽度 样式 颜色

border: 2px dashed red; // 虚线边框

border: 3px dotted blue; // 点状边框

}

```

  

### 单独设置

  

```less

.box {

border-top: 1px solid #ddd; // 上边框

border-right: 2px solid red; // 右边框

border-bottom: 1px solid #ddd; // 下边框

border-left: 0; // 左边框（无）

}

```

  

### 详细控制

  

```less

.box {

border-width: 1px; // 边框宽度

border-style: solid; // 样式: solid | dashed | dotted | double

border-color: #ddd; // 颜色

border-radius: 8px; // 圆角

}

```

  

### 圆角控制

  

```less

.box {

border-radius: 8px; // 四个角都是 8px

  

// 单独设置每个角

border-top-left-radius: 8px; // 左上角

border-top-right-radius: 16px; // 右上角

border-bottom-right-radius: 24px; // 右下角

border-bottom-left-radius: 32px; // 左下角

  

// 圆形

width: 100px;

height: 100px;

border-radius: 50%; // 圆形

}

```

  

### 实际例子

  

```javascript

render() {

return (

<div className="card">

<div className="card-header">标题</div>

<div className="card-body">内容</div>

<div className="card-footer">底部</div>

</div>

)

}

```

  

```less

.card {

border: 1px solid #e8e8e8; // 整体边框

border-radius: 8px;

overflow: hidden; // 子元素不超出圆角

background: white;

}

  

.card-header {

padding: 16px;

border-bottom: 1px solid #f0f0f0; // 只有底部边框（分割线）

font-weight: bold;

}

  

.card-body {

padding: 16px;

}

  

.card-footer {

padding: 12px 16px;

border-top: 1px solid #f0f0f0; // 只有顶部边框

background: #fafafa;

}

```

  

---

  

## 五、Width & Height：尺寸

  

### 基础用法

  

```less

.box {

width: 100px; // 固定宽度

height: 50px; // 固定高度

  

width: 50%; // 父元素宽度的 50%

height: 100vh; // 视口高度的 100%

  

width: auto; // 自动宽度（默认）

height: auto; // 自动高度（默认）

}

```

  

### 最大/最小限制

  

```less

.box {

max-width: 1200px; // 最大宽度

min-width: 320px; // 最小宽度

  

max-height: 500px; // 最大高度

min-height: 100px; // 最小高度

}

```

  

### 实际例子

  

```javascript

render() {

return (

<div className="container">

<div className="sidebar">侧边栏</div>

<div className="content">内容区域</div>

</div>

)

}

```

  

```less

.container {

display: flex;

max-width: 1200px; // 最大宽度限制

margin: 0 auto; // 水平居中

padding: 0 16px;

}

  

.sidebar {

width: 200px; // 固定宽度

min-height: 100vh; // 最小高度为视口高度

background: #f5f5f5;

}

  

.content {

flex: 1; // 占据剩余空间

min-height: 300px; // 最小高度

padding: 20px;

}

```

  

---

  

## 六、Display：显示类型

  

### 常用值

  

```less

.box {

display: block; // 块级元素（独占一行）

display: inline; // 行内元素（不能设置宽高）

display: inline-block; // 行内块元素（可设置宽高）

display: flex; // 弹性布局 ⭐️⭐️⭐️

display: grid; // 网格布局

display: none; // 隐藏元素

}

```

  

### 区别对比

  

```less

// 块级元素

.div-block {

display: block;

width: 100%; // 默认占满一行

padding: 10px;

}

  

// 行内元素

.span-inline {

display: inline;

// width: 100px; // ❌ 无效，行内元素不能设置宽高

padding: 0 10px; // ✅ 可以设置左右内边距

}

  

// 行内块元素

.button {

display: inline-block;

width: 100px; // ✅ 可以设置宽高

height: 40px;

padding: 10px;

}

```

  

---

  

## 七、Flex 布局：现代布局方案

  

### 为什么用 Flex？

  

Flex 是现代 Web 布局的首选方案，简单、强大、灵活。

  

### 基础概念

  

```less

.container {

display: flex; // 开启 flex 布局

  

// 主轴方向

flex-direction: row; // 横向（默认）

flex-direction: column; // 纵向

  

// 主轴对齐

justify-content: flex-start; // 左对齐（默认）

justify-content: center; // 居中

justify-content: space-between; // 两端对齐

justify-content: space-around; // 环绕对齐

  

// 交叉轴对齐

align-items: center; // 居中

align-items: flex-start; // 顶部对齐

align-items: flex-end; // 底部对齐

  

// 间距

gap: 16px; // 子元素间距

}

```

  

### 容器属性（父元素）

  

```less

.container {

display: flex;

  

// 1. 主轴方向

flex-direction: row; // 横向（默认）→ → →

flex-direction: column; // 纵向 ↓ ↓ ↓

flex-direction: row-reverse; // 横向反向 ← ← ←

flex-direction: column-reverse; // 纵向反向 ↑ ↑ ↑

  

// 2. 主轴对齐

justify-content: flex-start; // 左对齐

justify-content: center; // 居中

justify-content: flex-end; // 右对齐

justify-content: space-between; // 两端对齐，间隔相等

justify-content: space-around; // 环绕对齐

justify-content: space-evenly; // 均匀分布

  

// 3. 交叉轴对齐

align-items: stretch; // 拉伸（默认）

align-items: flex-start; // 顶部对齐

align-items: center; // 居中

align-items: flex-end; // 底部对齐

  

// 4. 换行

flex-wrap: nowrap; // 不换行（默认）

flex-wrap: wrap; // 换行

  

// 5. 间距

gap: 16px; // 子元素间距

row-gap: 16px; // 行间距

column-gap: 12px; // 列间距

}

```

  

### 子元素属性

  

```less

.item {

flex: 1; // 占据剩余空间（最常用）

flex: 0 0 100px; // 固定 100px

flex: 2; // 占 2 份空间

  

// flex 是以下三个属性的简写

flex-grow: 1; // 放大比例

flex-shrink: 1; // 缩小比例

flex-basis: auto; // 基础大小

  

// 单独对齐

align-self: center; // 覆盖父元素的 align-items

  

// 顺序

order: 1; // 排序（数值越小越靠前）

}

```

  

### 实际例子

  

#### 例子 1: 水平居中

  

```less

.container {

display: flex;

justify-content: center;

align-items: center;

height: 100vh;

}

```

  

**效果:**

```

┌─────────────────────────────┐

│ │

│ ┌──────────┐ │

│ │ 居中元素 │ │

│ └──────────┘ │

│ │

└─────────────────────────────┘

```

  

#### 例子 2: 两端对齐

  

```javascript

render() {

return (

<div className="header">

<div className="logo">Logo</div>

<div className="menu">Menu</div>

</div>

)

}

```

  

```less

.header {

display: flex;

justify-content: space-between;

align-items: center;

padding: 16px;

background: white;

box-shadow: 0 2px 8px rgba(0,0,0,0.1);

}

```

  

**效果:**

```

┌─────────────────────────────┐

│ Logo Menu │

└─────────────────────────────┘

```

  

#### 例子 3: 等分布局

  

```javascript

render() {

return (

<div className="row">

<div className="col">列1</div>

<div className="col">列2</div>

<div className="col">列3</div>

</div>

)

}

```

  

```less

.row {

display: flex;

gap: 16px;

  

.col {

flex: 1; // 每列平分空间

padding: 20px;

background: lightblue;

border-radius: 8px;

}

}

```

  

**效果:**

```

┌─────────┐ ┌─────────┐ ┌─────────┐

│ 列1 │ │ 列2 │ │ 列3 │

└─────────┘ └─────────┘ └─────────┘

```

  

---

  

## 八、横向与纵向布局实战

  

### 场景 1: 横向两个按钮

  

```javascript

render() {

return (

<div className="button-container">

<button className="btn-cancel">取消</button>

<button className="btn-confirm">确认</button>

</div>

)

}

```

  

```less

.button-container {

display: flex; // 横向布局

gap: 16px; // 按钮间距

padding: 16px;

}

  

.btn-cancel,

.btn-confirm {

flex: 1; // 平分宽度

height: 44px;

border: none;

border-radius: 4px;

font-size: 16px;

cursor: pointer;

}

  

.btn-cancel {

background: #f0f0f0;

color: #666;

}

  

.btn-confirm {

background: #1890ff;

color: white;

}

```

  

**效果:**

```

┌────────────────────────────┐

│ [取消] [确认] │

└────────────────────────────┘

```

  

### 场景 2: 左侧纵向，右侧按钮

  

**布局结构:**

```

┌─────────────────────────────┐

│ ┌─────────┐ ┌──────────┐ │

│ │ 元素1 │ │ │ │

│ ├─────────┤ │ 按钮 │ │

│ │ 元素2 │ │ │ │

│ └─────────┘ └──────────┘ │

└─────────────────────────────┘

```

  

**代码:**

```javascript

render() {

return (

<div className="container">

{/* 左侧: 纵向两个元素 */}

<div className="left-section">

<div className="item-1">用户名: 张三</div>

<div className="item-2">电话: 13800138000</div>

</div>

  

{/* 右侧: 一个按钮 */}

<button className="action-btn">联系</button>

</div>

)

}

```

  

```less

.container {

display: flex; // 外层: 横向布局

align-items: center; // 垂直居中

gap: 16px;

padding: 16px;

}

  

.left-section {

display: flex; // 内层: 纵向布局

flex-direction: column;

gap: 8px;

flex: 1; // 占据剩余空间

}

  

.item-1,

.item-2 {

font-size: 14px;

color: #333;

}

  

.action-btn {

height: 40px;

padding: 0 20px;

background: #1890ff;

color: white;

border: none;

border-radius: 4px;

white-space: nowrap; // 按钮文字不换行

}

```

  

**效果:**

```

┌─────────────────────────────┐

│ 用户名: 张三 │

│ 电话: 13800138000 [联系] │

└─────────────────────────────┘

```

  

### 场景 3: 复杂嵌套布局

  

```javascript

render() {

return (

<div className="product-card">

{/* 左侧: 图片 + 信息 */}

<div className="card-left">

<img src="product.jpg" className="product-image" />

<div className="product-info">

<h3>商品名称</h3>

<p className="price">¥199</p>

</div>

</div>

  

{/* 右侧: 按钮 */}

<button className="buy-btn">购买</button>

</div>

)

}

```

  

```less

.product-card {

display: flex;

align-items: center;

padding: 16px;

background: white;

border-radius: 8px;

box-shadow: 0 2px 8px rgba(0,0,0,0.05);

}

  

.card-left {

display: flex;

gap: 12px;

flex: 1;

}

  

.product-image {

width: 80px;

height: 80px;

border-radius: 4px;

object-fit: cover;

}

  

.product-info {

display: flex;

flex-direction: column;

justify-content: center;

gap: 8px;

  

h3 {

font-size: 16px;

font-weight: 500;

color: #333;

}

  

.price {

font-size: 20px;

color: #ff4d4f;

font-weight: bold;

}

}

  

.buy-btn {

width: 80px;

height: 40px;

background: #ff4d4f;

color: white;

border: none;

border-radius: 20px;

font-size: 14px;

}

```

  

---

  

## 九、常用单位详解

  

### 1. 绝对单位

  

```less

.box {

width: 100px; // 像素（最常用）

width: 1cm; // 厘米

width: 1in; // 英寸

}

```

  

### 2. 相对单位

  

```less

.box {

width: 50%; // 百分比（相对父元素）

font-size: 16px;

padding: 1em; // em（相对当前字体大小）= 16px

margin: 2rem; // rem（相对根元素字体大小）

width: 50vw; // 视口宽度的 50%

height: 50vh; // 视口高度的 50%

}

```

  

### 3. calc() 计算

  

```less

.box {

width: calc(100% - 20px); // 100% 减去 20px

height: calc(100vh - 60px); // 视口高度减去 60px

padding: calc(1em + 10px); // 1em 加上 10px

}

```

  

### 单位对比表

  

| 单位 | 说明 | 使用场景 |

|------|------|---------|

| `px` | 像素（绝对单位） | 边框、小间距 |

| `%` | 百分比（相对父元素） | 宽度、高度 |

| `em` | 相对当前字体大小 | 字体、内边距 |

| `rem` | 相对根元素字体大小 | 全局统一尺寸 |

| `vw` | 视口宽度的 1% | 响应式宽度 |

| `vh` | 视口高度的 1% | 全屏高度 |

  

---

  

## 总结

  

### 核心要点

  

1. **盒模型**: content → padding → border → margin

2. **Padding 简写**:

- 1 个值: 四周

- 2 个值: 上下 | 左右

- 3 个值: 上 | 左右 | 下

- 4 个值: 上右下左（顺时针）

3. **Flex 布局**: 现代布局首选方案

4. **单位**: 0 值可省略单位，非 0 值必须加单位

  

### 布局速查表

  

| 需求 | 实现方式 |

|------|---------|

| **水平居中** | `margin: 0 auto` 或 `justify-content: center` |

| **垂直居中** | `align-items: center` |

| **两端对齐** | `justify-content: space-between` |

| **平分空间** | `flex: 1` |

| **固定间距** | `gap: 16px` |

  

### iOS vs Web 布局

  

| iOS (Swift) | Web (CSS) |

|-------------|-----------|

| `UIView.frame` | `width`, `height`, `position` |

| `UIEdgeInsets` | `padding` 或 `margin` |

| `UIStackView` | `display: flex` |

| `.spacing` | `gap` |

| `layer.cornerRadius` | `border-radius` |

  

---

  

**系列文章:**

1. [从 iOS 到 Web：React 基础概念指南](./01-React基础概念指南.md)

2. CSS 布局完全指南 (本文)

3. [CSS 进阶：层级与优先级](./03-CSS进阶层级与优先级.md)

4. [JavaScript 基础语法速查](./04-JavaScript基础语法速查.md)