---
title: 从 iOS 到 Web：React 基础概念指南
description: 作为一名 iOS 开发者转向 Web 开发，你会发现很多概念有相似之处，但也有本质区别。本文将通过对比 iOS 和 React 的方式，帮助你快速理解 React 的核心概念。
publishedAt: 2025-11-10
tags:
  - react
  - 学习
  - js
  - 前端
---
![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251110173552898.png)

# 从 iOS 到 Web：React 基础概念指南

> 写给 iOS 开发者的 React 入门教程

作为一名 iOS 开发者转向 Web 开发，你会发现很多概念有相似之处，但也有本质区别。本文将通过对比 iOS (Objective-C) 和 React 的方式，帮助你快速理解 React 的核心概念。

  

## 目录

- [一、Props：外部传入的数据](#一props外部传入的数据)

- [二、State：组件内部状态](#二state组件内部状态)

- [三、Props vs State 对比](#三props-vs-state-对比)

- [四、解构赋值：批量提取属性](#四解构赋值批量提取属性)

- [五、组件方法与事件处理](#五组件方法与事件处理)

- [六、SSR 数据获取：getInitialProps](#六ssr-数据获取getinitialprops)

- [七、组件渲染方法](#七组件渲染方法)

  

---

  

## 一、Props：外部传入的数据

### 什么是 Props？

Props（properties 的缩写）是**父组件传递给子组件的数据**，类似于 iOS 中的初始化参数或依赖注入。

  

### iOS vs React 对比

**iOS (Objective-C):**

```objc

// DetailViewController.h

@interface DetailViewController : UIViewController

  

@property (nonatomic, copy) NSString *userId;

@property (nonatomic, copy) NSString *userName;

- (instancetype)initWithUserId:(NSString *)userId

userName:(NSString *)userName;

@end

  

// DetailViewController.m

@implementation DetailViewController

  

- (instancetype)initWithUserId:(NSString *)userId

userName:(NSString *)userName {

if (self = [super init]) {

_userId = userId;

_userName = userName;

}

return self;

}

  

@end

  

// 使用

DetailViewController *vc = [[DetailViewController alloc]

initWithUserId:@"123"

userName:@"张三"];

```

  

**React:**

  

```javascript

// 父组件传入 props

class ParentComponent extends React.Component {

render() {

return (

<DetailComponent

userId="123" // 传入 userId

userName="张三" // 传入 userName

/>

);

}

}

  

// 子组件接收 props

class DetailComponent extends React.Component {

render() {

// 通过 this.props 访问

const { userId, userName } = this.props;

  

return (

<div>

<p>用户ID: {userId}</p>

<p>用户名: {userName}</p>

</div>

);

}

}

```

  

### Props 的特点

**1. 只读性**：子组件不能修改 props

  

```javascript

class ChildComponent extends React.Component {

render() {

// ✅ 可以读取

console.log(this.props.name);

  

// ❌ 不能修改（会报错或无效）

this.props.name = '新名字'; // 错误！

  

return <div>{this.props.name}</div>;

}

}

```

  

**2. 动态性**：父组件改变 props，子组件会自动重新渲染

  

```javascript

class Parent extends React.Component {

state = { count: 0 };

  

render() {

return (

<div>

<button onClick={() => this.setState({ count: this.state.count + 1 })}>

增加

</button>

{/* count 改变，Child 会自动重新渲染 */}

<Child count={this.state.count} />

</div>

);

}

}

```

  

**3. 无需声明**：JavaScript 动态特性，不需要提前声明属性

  

```javascript

// ✅ JavaScript - 不需要声明

class MyComponent extends React.Component {

// 不需要声明 props

render() {

// 直接使用，父组件传什么就有什么

const { name, age, city } = this.props;

}

}

```

  

```objc

// ❌ Objective-C - 必须先声明

@interface MyView : UIView

  

@property (nonatomic, copy) NSString *name; // 必须声明

@property (nonatomic, assign) NSInteger age; // 必须声明

  

@end

```

  

### Props 类型检查（可选）

虽然 JavaScript 不强制类型，但可以使用 PropTypes 进行运行时检查：

  

```javascript

import PropTypes from 'prop-types';

  

class UserProfile extends React.Component {

static propTypes = {

userId: PropTypes.string.isRequired, // 必需，字符串

userName: PropTypes.string.isRequired, // 必需，字符串

age: PropTypes.number, // 可选，数字

onUpdate: PropTypes.func // 可选，函数

};

  

render() {

const { userId, userName, age, onUpdate } = this.props;

// ...

}

}

  

// 如果传错类型，开发环境会警告

<UserProfile userId={123} userName="张三" />

// ⚠️ 警告: userId 应该是 string，不是 number

```

  

---

  

## 二、State：组件内部状态

### 什么是 State？

State 是组件**自己管理的内部数据**，类似于 iOS 中的实例变量。

  

### iOS vs React 对比

**iOS (Objective-C):**

  

```objc

@interface MyViewController : UIViewController

  

@property (nonatomic, assign) NSInteger count;

@property (nonatomic, assign) BOOL isLoading;

  

@end

  

@implementation MyViewController

  

- (void)viewDidLoad {

[super viewDidLoad];

self.count = 0;

self.isLoading = NO;

}

  

- (void)increaseCount {

self.count++; // 直接修改

[self updateUI]; // 手动更新 UI

}

  

- (void)updateUI {

self.label.text = [NSString stringWithFormat:@"%ld", (long)self.count];

}

  

@end

```

  

**React:**

  

```javascript

class MyComponent extends React.Component {

// 定义 state

state = {

count: 0,

isLoading: false

};

  

increaseCount = () => {

// 必须使用 setState 修改

this.setState({ count: this.state.count + 1 });

// React 会自动重新渲染组件

};

  

render() {

const { count, isLoading } = this.state;

  

return (

<div>

<p>计数: {count}</p>

<button onClick={this.increaseCount}>增加</button>

</div>

);

}

}

```

  

### State 的定义方式

**方式 1：类字段语法（推荐）**

  

```javascript

class MyComponent extends React.Component {

state = {

count: 0,

name: '张三'

};

}

```

  

**方式 2：Constructor 中定义**

  

```javascript

class MyComponent extends React.Component {

constructor(props) {

super(props);

this.state = {

count: 0,

name: '张三'

};

}

}

```

  

### State 的修改规则

**❌ 错误方式：直接修改**

  

```javascript

// 直接修改不会触发重新渲染

this.state.count = 10; // ❌ 错误

this.state.items.push('新项'); // ❌ 错误

```

  

**✅ 正确方式：使用 setState**

  

```javascript

// 修改单个属性

this.setState({ count: 10 });

  

// 修改多个属性

this.setState({

count: 10,

name: '李四'

});

  

// 基于当前 state 计算新值

this.setState(prevState => ({

count: prevState.count + 1

}));

  

// 修改数组（创建新数组）

this.setState({

items: [...this.state.items, '新项']

});

```

  

### State 解构赋值

  

```javascript

render() {

// 从 state 解构

const { count, isLoading, items } = this.state;

  

return (

<div>

<p>计数: {count}</p>

{isLoading && <p>加载中...</p>}

<ul>

{items.map(item => <li key={item.id}>{item.name}</li>)}

</ul>

</div>

);

}

```

  

---

  

## 三、Props vs State 对比

### 核心区别

  

| 特性     | Props        | State            |
| ------ | ------------ | ---------------- |
| 数据来源   | 父组件传入        | 组件内部定义           |
| 能否修改   | 只读           | 可修改（用 setState）  |
| 定义位置   | 父组件 JSX      | 组件内 `state = {}` |
| 用途     | 接收外部配置       | 管理组件状态           |
| iOS 类比 | init 参数/依赖注入 | 实例变量             |

  

### 完整示例

  

```javascript

class ImagePreview extends React.Component {

// ========== STATE (内部状态) ==========

state = {

scale: 1.0, // 组件自己管理

isZooming: false, // 组件自己管理

startDistance: null // 组件自己管理

};

  

render() {

// ========== PROPS (外部传入) ==========

const {

visible, // 父组件控制是否显示

image, // 父组件传入图片 URL

onClose // 父组件传入关闭回调

} = this.props;

  

// ========== STATE (内部状态) ==========

const {

scale, // 组件内部的缩放比例

isZooming // 组件内部的缩放状态

} = this.state;

  

if (!visible) return null;

  

return (

<div className="preview">

<button onClick={onClose}>关闭</button>

<img

src={image}

style={{ transform: `scale(${scale})` }}

/>

</div>

);

}

  

// 修改 state

handleZoom = () => {

this.setState({ scale: 2.0 }); // ✅ 可以修改 state

};

  

// 不能修改 props

handleError = () => {

this.props.visible = false; // ❌ 错误！props 是只读的

this.props.onClose(); // ✅ 正确！调用父组件的方法

};

}

  

// 使用组件

class App extends React.Component {

state = {

showPreview: false,

currentImage: ''

};

  

openPreview = (url) => {

this.setState({

showPreview: true,

currentImage: url

});

};

  

closePreview = () => {

this.setState({ showPreview: false });

};

  

render() {

return (

<div>

<button onClick={() => this.openPreview('photo.jpg')}>

查看图片

</button>

  

<ImagePreview

visible={this.state.showPreview}

image={this.state.currentImage}

onClose={this.closePreview}

/>

</div>

);

}

}

```

  

---

  

## 四、解构赋值：批量提取属性

### 什么是解构赋值？

解构赋值是 ES6 的语法特性，用于从对象或数组中批量提取值。

  

### 基础语法

**对象解构**

  

```javascript

// 传统方式

const visible = this.props.visible;

const image = this.props.image;

const onClose = this.props.onClose;

  

// 解构赋值（推荐）

const { visible, image, onClose } = this.props;

```

  

**iOS 对比：**

  

```objc

// Objective-C 没有解构语法，需要逐个赋值

@interface User : NSObject

@property (nonatomic, copy) NSString *name;

@property (nonatomic, assign) NSInteger age;

@property (nonatomic, copy) NSString *city;

@end

  

User *user = [[User alloc] init];

user.name = @"张三";

user.age = 25;

user.city = @"北京";

  

// 需要逐个取值

NSString *name = user.name;

NSInteger age = user.age;

NSString *city = user.city;

```

  

**数组解构**

  

```javascript

const arr = [1, 2, 3];

  

// 传统方式

const first = arr[0];

const second = arr[1];

  

// 解构赋值

const [first, second, third] = arr;

console.log(first); // 1

console.log(second); // 2

console.log(third); // 3

```

  

### 解构赋值高级用法

**1. 默认值**

  

```javascript

const { serviceUcId = '', shareItems = [] } = this.state;

  

// 如果 this.state 中没有这些属性

this.state = { APP_SOURCE: 'mobile' };

  

// 解构后

// serviceUcId = '' // 使用默认值

// shareItems = [] // 使用默认值

// APP_SOURCE = 'mobile' // 从 state 中取到值

```

  

**2. 重命名**

  

```javascript

const props = { visible: true };

  

// 提取并重命名

const { visible: isShow } = props;

  

console.log(isShow); // true

console.log(visible); // undefined (变量不存在)

```

  

**3. 嵌套解构**

  

```javascript

const user = {

name: '张三',

address: {

city: '北京',

street: '朝阳区'

}

};

  

// 嵌套解构

const { name, address: { city } } = user;

console.log(name); // '张三'

console.log(city); // '北京'

```

  

**4. 剩余参数**

  

```javascript

const { name, age, ...rest } = {

name: '张三',

age: 25,

city: '北京',

job: '工程师'

};

  

console.log(name); // '张三'

console.log(age); // 25

console.log(rest); // { city: '北京', job: '工程师' }

```

  

### React 中的常见用法

  

```javascript

class MyComponent extends React.Component {

render() {

// 同时解构 props 和 state

const { visible, image, onClose } = this.props;

const { scale, isZooming } = this.state;

  

// 函数参数解构

const user = { name: '张三', age: 25 };

this.renderUser(user);

}

  

renderUser = ({ name, age }) => { // 参数直接解构

return (

<div>

<p>姓名: {name}</p>

<p>年龄: {age}</p>

</div>

);

};

}

```

  

### 解构 vs 不解构对比

  

```javascript

// ❌ 不解构（繁琐）

render() {

return (

<div>

{this.props.visible && <img src={this.props.image} />}

<button onClick={this.props.onClose}>关闭</button>

<p>缩放: {this.state.scale}</p>

</div>

);

}

  

// ✅ 解构（简洁）

render() {

const { visible, image, onClose } = this.props;

const { scale } = this.state;

  

return (

<div>

{visible && <img src={image} />}

<button onClick={onClose}>关闭</button>

<p>缩放: {scale}</p>

</div>

);

}

```

  

---

  

## 五、组件方法与事件处理

### 箭头函数 vs 普通函数

#### 为什么用箭头函数？

**问题**: 普通函数中的 `this` 容易丢失

  

```javascript

class MyComponent extends React.Component {

// 普通函数

handleClick() {

console.log(this.props); // undefined ❌

}

  

render() {

return <button onClick={this.handleClick}>点击</button>;

}

}

```

  

**解决方案 1**: 在 constructor 中绑定

  

```javascript

class MyComponent extends React.Component {

constructor(props) {

super(props);

this.handleClick = this.handleClick.bind(this); // 绑定 this

}

  

handleClick() {

console.log(this.props); // ✅ 正常

}

}

```

  

**解决方案 2**: 使用箭头函数（推荐）

  

```javascript

class MyComponent extends React.Component {

// 箭头函数自动绑定 this

handleClick = () => {

console.log(this.props); // ✅ 正常

};

  

render() {

return <button onClick={this.handleClick}>点击</button>;

}

}

```

  

**iOS 对比：**

  

```objc

@interface MyViewController : UIViewController

@end

  

@implementation MyViewController

  

- (void)viewDidLoad {

[super viewDidLoad];

  

UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];

[button addTarget:self

action:@selector(handleClick:)

forControlEvents:UIControlEventTouchUpInside];

}

  

- (void)handleClick:(UIButton *)sender {

// self 总是指向 MyViewController 实例

NSLog(@"%@", self.view);

}

  

@end

```

  

### 事件处理方法

**无参数事件**

  

```javascript

handleClick = () => {

console.log('按钮被点击');

this.setState({ count: this.state.count + 1 });

};

  

render() {

return <button onClick={this.handleClick}>点击</button>;

}

```

  

**传递参数**

  

```javascript

handleItemClick = (item) => {

console.log('点击了:', item);

this.setState({ selectedItem: item });

};

  

render() {

return (

<div>

{this.state.items.map(item => (

<div

key={item.id}

onClick={() => this.handleItemClick(item)}

>

{item.name}

</div>

))}

</div>

);

}

```

  

**事件对象**

  

```javascript

handleInputChange = (event) => {

const value = event.target.value;

this.setState({ inputValue: value });

};

  

render() {

return (

<input

value={this.state.inputValue}

onChange={this.handleInputChange}

/>

);

}

```

  

**阻止事件冒泡**

  

```javascript

handleShareClick = (e, item) => {

e.stopPropagation(); // 阻止冒泡到父元素

this.shareItem(item);

};

  

render() {

return (

<div onClick={this.handleCardClick}>

<button onClick={(e) => this.handleShareClick(e, item)}>

分享

</button>

</div>

);

}

```

  

---

  

## 六、SSR 数据获取：getInitialProps

### 什么是 getInitialProps？

在 SSR（Server-Side Rendering）项目中，`getInitialProps` 是一个特殊的静态方法，用于在**服务端渲染前获取数据**。

  

### 完整数据流

  

```javascript

// ========== 1. 服务端 (Node.js) ==========

// src/actions/worker/pages/standard-share-library.js

export default {

async handler(ctx) {

// 1.1 从接口获取数据

const res = await ProxyApis.constructionShareApi.getConfigItem(ctx, {});

const shareItems = res.data;

  

// 1.2 传给 KSSR 渲染

const renderContent = await kssr.render('worker/standard-share-library/index', {

shareItems,

projectOrderId: ctx.query.id,

APP_SOURCE: getAppSource(ctx)

});

  

ctx.body = renderContent.body;

}

};

  

// ========== 2. React 组件 ==========

class StandardShareLibrary extends React.Component {

// 2.1 接收服务端数据

static async getInitialProps({ shareItems, projectOrderId, APP_SOURCE }) {

// 可以在这里做数据处理

return {

shareItems, // → 变成 this.props.shareItems

projectOrderId, // → 变成 this.props.projectOrderId

APP_SOURCE // → 变成 this.props.APP_SOURCE

};

}

  

// 2.2 组件使用数据

render() {

const { shareItems, APP_SOURCE } = this.props;

  

return (

<div>

{shareItems.map(item => (

<div key={item.id}>{item.title}</div>

))}

</div>

);

}

}

```

  

### getInitialProps 的用途

**1. 原样返回（最常见）**

  

```javascript

static async getInitialProps({ shareItems, projectOrderId, APP_SOURCE }) {

// 服务端传什么，就返回什么

return { shareItems, projectOrderId, APP_SOURCE };

}

  

// 等价简写

static async getInitialProps(props) {

return props;

}

```

  

**2. 数据转换**

  

```javascript

static async getInitialProps({ shareItems, projectOrderId, APP_SOURCE }) {

return {

// 过滤掉无效的分享项

shareItems: shareItems.filter(item => item.enabled),

projectOrderId,

APP_SOURCE

};

}

```

  

**3. 额外数据获取**

  

```javascript

static async getInitialProps({ shareItems, projectOrderId, APP_SOURCE }) {

// 在服务端额外获取数据

const projectDetail = await fetch(`/api/project/${projectOrderId}`);

  

return {

shareItems,

projectOrderId,

projectDetail, // 新增的数据

APP_SOURCE

};

}

```

  

**4. 数据验证**

  

```javascript

static async getInitialProps({ shareItems, projectOrderId, APP_SOURCE }) {

if (!projectOrderId) {

throw new Error('缺少项目 ID');

}

  

return {

shareItems: shareItems || [], // 提供默认值

projectOrderId,

APP_SOURCE

};

}

```

  

---

  

## 七、组件渲染方法

### render 方法解析

  

```javascript

render() {

// 1. 获取数据

const { visible, image, onClose } = this.props;

const { scale } = this.state;

  

// 2. 条件判断

if (!visible) {

return null; // 不渲染任何内容

}

  

// 3. 计算动态样式

const wrapperStyle = {

width: `${scale * 100}%`

};

  

// 4. 返回 JSX

return (

<div className="preview">

<button onClick={onClose}>关闭</button>

<div style={wrapperStyle}>

<img src={image} alt="预览图" />

</div>

</div>

);

}

```

  

### 条件渲染

**1. if-return**

  

```javascript

render() {

if (!this.props.visible) {

return null;

}

  

return <div>内容</div>;

}

```

  

**2. 三元表达式**

  

```javascript

render() {

return (

<div>

{this.props.visible ? <Content /> : <Empty />}

</div>

);

}

```

  

**3. 逻辑与 &&**

  

```javascript

render() {

return (

<div>

{this.props.visible && <Content />}

{this.props.error && <ErrorMessage />}

</div>

);

}

```

  

### 列表渲染

  

```javascript

render() {

const { items } = this.props;

  

return (

<div>

{items.map(item => (

<div key={item.id} className="item">

<h3>{item.title}</h3>

<p>{item.description}</p>

</div>

))}

</div>

);

}

```

  

### 自定义渲染方法

  

```javascript

class MyComponent extends React.Component {

// 渲染单个卡片

renderCard = (item) => {

return (

<div key={item.id} className="card">

<img src={item.image} />

<h3>{item.title}</h3>

<button onClick={() => this.handleClick(item)}>

查看

</button>

</div>

);

};

  

// 主渲染方法

render() {

const { items } = this.props;

  

return (

<div className="card-list">

{items.map(item => this.renderCard(item))}

</div>

);

}

}

```

  

---

  

## 总结

### 核心概念速查表

  

| 概念 | 说明 | 类比 iOS (OC) |
| --------------- | ---------------------- | ------------------------- |
| Props | 父组件传入的数据，只读 | init 参数 / property 注入 |
| State | 组件内部状态，可修改 | 实例变量 |
| 解构赋值 | 批量提取对象属性 | - |
| 箭头函数 | 自动绑定 this | - |
| render | 渲染组件 UI | viewDidLoad + 更新UI |
| getInitialProps | SSR 数据获取 | - |

  

### 最佳实践

1. **Props 用于接收外部数据**，State 用于管理内部状态

2. **优先使用解构赋值**，让代码更简洁

3. **组件方法使用箭头函数**，避免 this 绑定问题

4. **State 修改必须用 setState**，不能直接赋值

5. **Props 和 State 的命名要清晰**，见名知意

  
  

---

  