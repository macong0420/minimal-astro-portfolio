---
title: CSS 进阶：层级与优先级
description: 本文将深入讲解 CSS 中的定位、层叠和优先级机制，帮助你掌握复杂布局场景。
publishedAt: 2025-11-10
tags:
  - css
  - react
  - 学习
---
![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251110173350489.png)


> 深入理解 Position、z-index 和 !important

本文将深入讲解 CSS 中的定位、层叠和优先级机制，帮助你掌握复杂布局场景。

## 目录

- [一、Position：定位方式详解](#一position定位方式详解)
- [二、z-index：控制元素层级](#二z-index控制元素层级)
- [三、!important：优先级强制提升](#三important优先级强制提升)
- [四、CSS 优先级规则](#四css-优先级规则)
- [五、实战案例](#五实战案例)

---

## 一、Position：定位方式详解

### Position 的 5 种类型

```less
position: static;      // 静态定位（默认）
position: relative;    // 相对定位 ⭐️
position: absolute;    // 绝对定位 ⭐️⭐️
position: fixed;       // 固定定位 ⭐️⭐️
position: sticky;      // 粘性定位 ⭐️
```

---

### 1. static（静态定位）- 默认值

**特点**: 正常的文档流，按照 HTML 顺序排列

```less
.box {
  position: static;    // 默认值，可以不写
  // top, right, bottom, left 无效
  // z-index 无效
}
```

**效果:**
```
┌─────────────┐
│   元素 1    │  ← 从上到下
├─────────────┤
│   元素 2    │
├─────────────┤
│   元素 3    │
└─────────────┘
```

---

### 2. relative（相对定位）⭐️ 最常用

**特点**:
- 相对于**元素原来的位置**移动
- **原来的空间仍然占据**（不脱离文档流）
- 可以使用 `top`, `right`, `bottom`, `left` 调整位置
- 可以使用 `z-index`

#### 基础示例

```less
.box {
  position: relative;
  top: 20px;          // 向下移动 20px（相对原位置）
  left: 30px;         // 向右移动 30px（相对原位置）
}
```

**图解:**
```
原来的位置（虚框）
┌ ─ ─ ─ ─ ─ ┐
│           │
            │
 ─ ─ ─ ─ ─ ─
        ↓ top: 20px
        → left: 30px
        ┌───────────┐
        │  实际位置 │
        │  (box)    │
        └───────────┘
```

#### 主要用途

**用途 1: 作为绝对定位的参照物（最常用）**
```less
.parent {
  position: relative;    // 父元素设置 relative
}

.child {
  position: absolute;    // 子元素绝对定位
  top: 10px;            // 相对父元素定位
  right: 10px;
}
```

**用途 2: 微调元素位置**
```less
.button-icon {
  position: relative;
  top: 2px;             // 图标向下微调 2px，与文字对齐
}
```

**用途 3: 配合 z-index**
```less
.card {
  position: relative;
  z-index: 10;          // 需要 relative 才能使用 z-index
}
```

---

### 3. absolute（绝对定位）⭐️⭐️ 很常用

**特点**:
- 相对于**最近的非 static 定位的祖先元素**定位
- **脱离文档流**（不占据空间）
- 如果没有定位的祖先，则相对于 `<body>` 定位

#### 基础示例

```less
.parent {
  position: relative;    // 父元素作为参照
  width: 300px;
  height: 200px;
  background: lightgray;
}

.child {
  position: absolute;    // 绝对定位
  top: 20px;            // 距离父元素顶部 20px
  right: 20px;          // 距离父元素右侧 20px
  width: 100px;
  height: 50px;
  background: red;
}
```

**图解:**
```
父元素 (relative)
┌─────────────────────────────┐
│                             │
│                             │
│                ┌──────────┐ │ ← top: 20px
│                │  子元素  │ │   right: 20px
│                │(absolute)│ │
│                └──────────┘ │
│                             │
└─────────────────────────────┘
```

#### 实际例子

**例子 1: 卡片右上角的标签**

```javascript
render() {
  return (
    <div className="card">
      <div className="card-badge">新</div>
      <img src="product.jpg" alt="商品" />
      <div className="card-title">商品标题</div>
    </div>
  )
}
```

```less
.card {
  position: relative;      // 父元素 relative
  width: 200px;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.card-badge {
  position: absolute;      // 子元素 absolute
  top: 10px;              // 距离顶部 10px
  right: 10px;            // 距离右侧 10px
  padding: 4px 8px;
  background: red;
  color: white;
  border-radius: 4px;
  font-size: 12px;
}
```

**效果:**
```
┌─────────────────┐
│           [新]  │ ← 右上角标签
│                 │
│   ┌─────────┐   │
│   │  图片   │   │
│   └─────────┘   │
│   商品标题      │
└─────────────────┘
```

**例子 2: 水平垂直居中**

```less
.parent {
  position: relative;
  width: 400px;
  height: 300px;
  background: lightgray;
}

.child {
  position: absolute;
  top: 50%;                    // 距离顶部 50%
  left: 50%;                   // 距离左侧 50%
  transform: translate(-50%, -50%);  // 回拉自身宽高的 50%

  width: 200px;
  height: 100px;
  background: blue;
}
```

**图解:**
```
┌─────────────────────────────┐
│                             │
│        ┌──────────┐         │
│        │ 居中元素 │         │ ← 完美居中
│        └──────────┘         │
│                             │
└─────────────────────────────┘
```

#### 定位参照规则

```html
<div class="grand">           <!-- position: static (默认) -->
  <div class="parent">        <!-- position: relative -->
    <div class="child">       <!-- position: absolute -->
      我相对谁定位？
    </div>
  </div>
</div>
```

**规则**:
- `child` 会找**最近的非 static 祖先元素**
- 找到了 `parent` (relative)，就相对它定位
- 如果 `parent` 也是 static，会继续向上找 `grand`
- 如果都没有，就相对 `<body>` 定位

---

### 4. fixed（固定定位）⭐️⭐️ 很常用

**特点**:
- 相对于**浏览器视口 (viewport)** 定位
- **脱离文档流**
- 滚动页面时，元素**位置不变**（固定在屏幕某个位置）

#### 实际例子

**例子 1: 固定头部导航**

```javascript
render() {
  return (
    <div className="app">
      <header className="fixed-header">
        <h1>我的网站</h1>
        <nav>导航菜单</nav>
      </header>

      <main className="content">
        <p>页面内容...</p>
        {/* 大量内容，可以滚动 */}
      </main>
    </div>
  )
}
```

```less
.fixed-header {
  position: fixed;        // 固定定位
  top: 0;                // 固定在顶部
  left: 0;
  right: 0;
  height: 60px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 100;

  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.content {
  padding-top: 60px;     // 避免内容被 header 遮挡
}
```

**效果**: 无论页面如何滚动，header 始终固定在顶部

**例子 2: 固定底部按钮**

```javascript
render() {
  return (
    <div className="page">
      <div className="content">
        页面内容...
      </div>

      <button className="fixed-button">
        立即购买
      </button>
    </div>
  )
}
```

```less
.fixed-button {
  position: fixed;        // 固定定位
  bottom: 20px;          // 距离底部 20px
  right: 20px;           // 距离右侧 20px
  width: 60px;
  height: 60px;
  border-radius: 50%;    // 圆形按钮
  background: #1890ff;
  color: white;
  border: none;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  z-index: 999;
}
```

**效果**: 右下角始终有个悬浮按钮

---

### 5. sticky（粘性定位）⭐️ 新特性

**特点**:
- 平时像 `relative`，滚动到特定位置后变成 `fixed`
- 不脱离文档流（占据空间）
- 需要指定 `top`, `bottom`, `left`, `right` 中的至少一个

#### 实际例子

```javascript
render() {
  return (
    <div className="page">
      <div className="banner">顶部横幅</div>

      <nav className="sticky-nav">
        <a href="#section1">分类1</a>
        <a href="#section2">分类2</a>
        <a href="#section3">分类3</a>
      </nav>

      <div className="content">
        <div id="section1">内容区域 1</div>
        <div id="section2">内容区域 2</div>
        <div id="section3">内容区域 3</div>
      </div>
    </div>
  )
}
```

```less
.banner {
  height: 200px;
  background: lightblue;
}

.sticky-nav {
  position: sticky;      // 粘性定位
  top: 0;               // 滚动到顶部时固定
  background: white;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 100;

  display: flex;
  gap: 20px;
}

.content {
  min-height: 2000px;   // 足够长以便滚动
}
```

**效果**:
- 页面加载时，导航栏在横幅下方
- 向下滚动，横幅消失后，导航栏固定在顶部
- 向上滚动，导航栏回到原位

---

### Position 对比表

| 类型 | 参照物 | 是否脱离文档流 | 是否占据空间 | 常见用途 |
|------|--------|---------------|-------------|----------|
| **static** | - | 否 | 是 | 默认布局 |
| **relative** | 自身原位置 | 否 | 是 | 微调位置、作为参照物 |
| **absolute** | 最近的定位祖先 | 是 | 否 | 弹出层、标签、关闭按钮 |
| **fixed** | 浏览器视口 | 是 | 否 | 固定头部、悬浮按钮 |
| **sticky** | 视口+滚动位置 | 否 | 是 | 吸顶导航、表头固定 |

---

## 二、z-index：控制元素层级

### 什么是 z-index？

`z-index` 控制**元素层叠顺序**（谁在上面，谁在下面）。

**想象**: 网页是一层层叠起来的纸，`z-index` 控制哪张纸在最上面。

```
           z-index: 30  ← 最上层
          ┌─────────┐
          │ 元素 C  │
          └─────────┘
       z-index: 20
      ┌─────────┐
      │ 元素 B  │
      └─────────┘
   z-index: 10  ← 最下层
  ┌─────────┐
  │ 元素 A  │
  └─────────┘
```

### 基础用法

```less
.box-1 {
  position: relative;      // ⚠️ 必须有定位（非 static）
  z-index: 1;              // 层级 1
  background: red;
}

.box-2 {
  position: relative;
  z-index: 10;             // 层级 10（在 box-1 上面）
  background: blue;
}

.box-3 {
  position: relative;
  z-index: 100;            // 层级 100（在 box-2 上面）
  background: green;
}
```

**重要**: `z-index` 只对**有定位的元素**生效：
- `position: relative`
- `position: absolute`
- `position: fixed`
- `position: sticky`

### 实际例子

#### 例子 1: 弹窗遮罩层

```javascript
render() {
  return (
    <div>
      <div className="page-content">正常页面内容</div>

      {/* 弹窗 */}
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>弹窗标题</h2>
          <p>弹窗内容</p>
          <button>关闭</button>
        </div>
      </div>
    </div>
  )
}
```

```less
.page-content {
  // 正常内容，z-index 默认为 0 或 auto
  padding: 20px;
}

.modal-overlay {
  position: fixed;         // 固定定位
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);  // 半透明黑色遮罩
  z-index: 1000;          // 很高的层级，确保在页面内容上方

  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  position: relative;
  z-index: 1001;          // 比遮罩更高，确保在遮罩上方
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 400px;
}
```

**效果:**
```
┌───────────────────────────┐
│                           │  ← 页面内容 (z-index: auto)
│  正常页面内容              │
│                           │
│  ┌─────────────────────┐  │
│  │ 遮罩 (z-index:1000) │  │  ← 半透明黑色遮罩覆盖页面
│  │                     │  │
│  │  ┌───────────────┐  │  │
│  │  │ 弹窗内容      │  │  │  ← 弹窗 (z-index:1001) 在遮罩上方
│  │  │ (z-index:1001)│  │  │
│  │  └───────────────┘  │  │
│  └─────────────────────┘  │
└───────────────────────────┘
```

#### 例子 2: 固定导航栏

```less
.header {
  position: fixed;         // 固定在顶部
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 100;           // 确保在其他内容上方
}

.content {
  padding-top: 60px;      // 避免被 header 遮挡
}

.card {
  position: relative;
  z-index: 1;            // 在正常内容层
}
```

### 常见 z-index 层级规范

大型项目通常会定义标准的 z-index 层级：

```less
// z-index 层级定义（推荐规范）

// 1. 正常内容层 (0-9)
.content {
  z-index: 1;
}

// 2. 下拉菜单、Tooltip (10-99)
.dropdown-menu {
  z-index: 10;
}

.tooltip {
  z-index: 20;
}

// 3. 固定元素 (100-999)
.header {
  z-index: 100;
}

.sidebar {
  z-index: 150;
}

.floating-button {
  z-index: 200;
}

// 4. 遮罩层 (1000-1999)
.modal-overlay {
  z-index: 1000;
}

.drawer-overlay {
  z-index: 1100;
}

// 5. 弹窗/对话框 (2000-2999)
.modal {
  z-index: 2000;
}

.dialog {
  z-index: 2100;
}

// 6. Toast/通知 (3000-3999)
.toast {
  z-index: 3000;
}

.notification {
  z-index: 3100;
}

// 7. 最高层（调试、引导） (9000+)
.debug-panel {
  z-index: 9000;
}

.user-guide-overlay {
  z-index: 9999;
}
```

### 常见问题

#### 问题 1: z-index 不生效

```less
// ❌ 错误 - 没有设置 position
.box {
  z-index: 100;           // 不会生效！
}

// ✅ 正确 - 必须有定位
.box {
  position: relative;     // 或 absolute/fixed/sticky
  z-index: 100;           // 生效了
}
```

#### 问题 2: 层叠上下文（Stacking Context）

子元素的 `z-index` 只在**父元素的层叠上下文**内生效：

```less
.parent-1 {
  position: relative;
  z-index: 1;

  .child {
    position: relative;
    z-index: 9999;        // 即使是 9999，也在 parent-1 的层级内
  }
}

.parent-2 {
  position: relative;
  z-index: 2;            // parent-2 比 parent-1 高

  .child {
    position: relative;
    z-index: 1;          // 这个 child 会在 parent-1 的 child 上面
  }
}
```

---

## 三、!important：优先级强制提升

### 什么是 !important？

`!important` 是 CSS 的**优先级提升符**，用于**强制覆盖**其他样式规则。

```less
.box {
  color: red !important;     // 这个样式优先级最高
}
```

### 基础示例

#### 不使用 !important

```less
.box {
  color: red;              // 优先级: 10
}

#container .box {
  color: blue;             // 优先级: 110（更高）
}

// 结果: 文字是蓝色
```

#### 使用 !important

```less
.box {
  color: red !important;   // 强制最高优先级
}

#container .box {
  color: blue;             // 优先级虽然高，但被 !important 覆盖
}

// 结果: 文字是红色（!important 生效）
```

### 实际例子

#### 例子 1: 覆盖第三方库样式

```javascript
import { Button } from 'antd'  // 假设使用 Ant Design

render() {
  return (
    <Button className="my-button">
      点击我
    </Button>
  )
}
```

```less
// Ant Design 内部样式（你无法修改）
.ant-btn {
  background: #1890ff;
  color: white;
  padding: 8px 16px;
}

// 你的自定义样式
.my-button {
  background: red;         // ❌ 不生效，因为优先级不够
}

// 使用 !important 强制覆盖
.my-button {
  background: red !important;   // ✅ 生效了
  color: yellow !important;
}
```

#### 例子 2: 工具类样式

```less
// 通用工具类，需要确保生效
.hidden {
  display: none !important;     // 强制隐藏
}

.text-center {
  text-align: center !important;  // 强制居中
}

.no-margin {
  margin: 0 !important;          // 强制无边距
}
```

### !important 的问题 ⚠️

#### 问题 1: 难以覆盖

```less
.button {
  background: red !important;
}

// 后来想改颜色，发现改不了
.button.primary {
  background: blue;              // ❌ 不生效
}

.button.primary {
  background: blue !important;   // ✅ 只能再用 !important
}

// 恶性循环，导致代码充满 !important
```

#### 问题 2: 维护困难

```less
// 代码到处都是 !important
.card {
  padding: 20px !important;
  margin: 10px !important;
  background: white !important;
  border: 1px solid #ddd !important;
}

// 很难理解为什么需要这么多 !important
// 也很难修改和维护
```

### 什么时候可以用 !important

#### ✅ 场景 1: 覆盖第三方库样式

```less
// 覆盖 Ant Design / Bootstrap 等
.ant-modal {
  width: 800px !important;   // 强制修改第三方组件宽度
}
```

#### ✅ 场景 2: 工具类（Utility Classes）

```less
// 确保工具类一定生效
.hide {
  display: none !important;
}

.show {
  display: block !important;
}

.text-red {
  color: red !important;
}
```

#### ✅ 场景 3: 临时调试

```less
.debug-element {
  border: 5px solid red !important;
  background: yellow !important;
  // 调试完后记得删除
}
```

### 如何避免使用 !important

#### 方法 1: 提高选择器优先级

```less
// ❌ 不推荐
.button {
  background: red !important;
}

// ✅ 推荐：提高优先级
.my-app .button {
  background: red;
}
```

#### 方法 2: 使用更具体的类名

```less
// ❌ 不推荐
.button {
  background: blue !important;
}

// ✅ 推荐：使用更具体的类名
.button-primary {
  background: blue;
}

.button-danger {
  background: red;
}
```

---

## 四、CSS 优先级规则

### 优先级从高到低

```less
// 1. !important - 最高优先级
.box {
  color: red !important;
}

// 2. 内联样式 - 优先级: 1000
<div style="color: red;">最高优先级</div>

// 3. ID 选择器 - 优先级: 100
#header {
  color: blue;
}

// 4. 类/属性/伪类选择器 - 优先级: 10
.box { color: green; }
[type="text"] { color: green; }
:hover { color: green; }

// 5. 标签选择器 - 优先级: 1
div { color: yellow; }

// 6. 通配符 - 优先级: 0
* { color: gray; }
```

### 优先级计算示例

```less
// 优先级: 1 (标签)
div {
  color: red;
}

// 优先级: 10 (类)
.box {
  color: blue;
}

// 优先级: 11 (标签 + 类)
div.box {
  color: green;
}

// 优先级: 100 (ID)
#container {
  color: purple;
}

// 优先级: 111 (ID + 标签 + 类)
#container div.box {
  color: orange;
}

// 优先级: 最高！(强制覆盖所有)
.box {
  color: pink !important;
}
```

---

## 五、实战案例

### 案例 1: 完整的弹窗组件

```javascript
class App extends React.Component {
  state = {
    showModal: false,
    showToast: false
  }

  openModal = () => {
    this.setState({ showModal: true })
  }

  closeModal = () => {
    this.setState({ showModal: false })
  }

  showToast = () => {
    this.setState({ showToast: true })
    setTimeout(() => {
      this.setState({ showToast: false })
    }, 3000)
  }

  render() {
    const { showModal, showToast } = this.state

    return (
      <div className="app">
        {/* 固定头部 */}
        <header className="header">
          <h1>我的应用</h1>
        </header>

        {/* 正常内容 */}
        <main className="main-content">
          <button onClick={this.openModal}>打开弹窗</button>
          <button onClick={this.showToast}>显示提示</button>
        </main>

        {/* 弹窗（更高层级） */}
        {showModal && (
          <>
            <div className="modal-overlay" onClick={this.closeModal} />
            <div className="modal">
              <h2>弹窗标题</h2>
              <p>弹窗内容</p>
              <button onClick={this.closeModal}>关闭</button>
            </div>
          </>
        )}

        {/* Toast（最高层级） */}
        {showToast && (
          <div className="toast">操作成功！</div>
        )}
      </div>
    )
  }
}
```

```less
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 100;           // 固定头部层级

  display: flex;
  align-items: center;
  padding: 0 16px;
}

.main-content {
  padding-top: 60px;      // 避免被 header 遮挡
  padding: 20px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;          // 遮罩层级
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  z-index: 1001;          // 弹窗层级（比遮罩高）
  min-width: 400px;
}

.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #52c41a;
  color: white;
  padding: 12px 24px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 3000;          // Toast 层级（最高）
}
```

### 案例 2: 商品卡片

```javascript
class ProductCard extends React.Component {
  render() {
    const { product } = this.props

    return (
      <div className="product-card">
        {/* absolute: 右上角标签 */}
        {product.isNew && (
          <div className="badge-new">新品</div>
        )}

        {/* absolute: 左上角折扣 */}
        {product.discount && (
          <div className="badge-discount">-{product.discount}%</div>
        )}

        <img src={product.image} alt={product.name} />

        <div className="card-info">
          <h3>{product.name}</h3>
          <div className="price">¥{product.price}</div>
        </div>

        {/* absolute: 右下角购物车按钮 */}
        <button className="add-cart-btn">
          🛒
        </button>
      </div>
    )
  }
}
```

```less
.product-card {
  position: relative;         // 父元素 relative，作为参照
  width: 200px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);

  .badge-new {
    position: absolute;       // 绝对定位
    top: 10px;
    right: 10px;
    padding: 4px 8px;
    background: red;
    color: white;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10;
  }

  .badge-discount {
    position: absolute;       // 绝对定位
    top: 10px;
    left: 10px;
    padding: 4px 8px;
    background: orange;
    color: white;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10;
  }

  img {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  .card-info {
    padding: 12px;

    h3 {
      font-size: 16px;
      margin-bottom: 8px;
    }

    .price {
      font-size: 18px;
      color: red;
      font-weight: bold;
    }
  }

  .add-cart-btn {
    position: absolute;       // 绝对定位
    bottom: 12px;
    right: 12px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: #1890ff;
    color: white;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);

    &:hover {
      background: #40a9ff;
    }
  }
}
```

---

## 总结

### 核心要点

1. **Position 定位**:
   - `relative`: 相对自己，不脱离流，常做参照物
   - `absolute`: 相对定位祖先，脱离流，常做弹出元素
   - `fixed`: 相对视口，脱离流，常做固定元素
   - `sticky`: 滚动吸附，不脱离流，常做吸顶元素

2. **z-index 层级**:
   - 必须配合定位使用
   - 数值越大越在上层
   - 建议定义统一的层级规范

3. **!important 优先级**:
   - 慎用，优先考虑其他方案
   - 可用于覆盖第三方库、工具类
   - 避免在业务代码中使用

### 最佳实践

```less
// ✅ 推荐
.parent {
  position: relative;      // 作为参照
}

.child {
  position: absolute;      // 相对 parent 定位
  top: 10px;
  right: 10px;
}

.fixed-header {
  position: fixed;         // 固定头部
  z-index: 100;           // 合理的层级
}

// ❌ 不推荐
.box {
  z-index: 100;           // 没有 position，不生效
}

.card {
  padding: 20px !important;  // 滥用 !important
}
```

---

**系列文章:**
1. [从 iOS 到 Web：React 基础概念指南](./01-React基础概念指南.md)
2. [CSS 布局完全指南](./02-CSS布局完全指南.md)
3. CSS 进阶：层级与优先级 (本文)
4. [JavaScript 基础语法速查](./04-JavaScript基础语法速查.md)
