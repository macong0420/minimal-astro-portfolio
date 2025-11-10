---
title: JavaScript 基础语法速查
description: 本文将通过对比 Swift 和 JavaScript 的方式，帮助 iOS 开发者快速掌握 JavaScript 基础语法。
publishedAt: 2025-11-10
tags:
  - js
  - react
  - 学习
---
![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251110173223214.png)


> 从 iOS 到 JavaScript 的语法对比指南

本文将通过对比 Swift 和 JavaScript 的方式，帮助 iOS 开发者快速掌握 JavaScript 基础语法。

## 目录

- [一、箭头函数](#一箭头函数)
- [二、解构赋值](#二解构赋值)
- [三、类字段语法](#三类字段语法)
- [四、模板字符串](#四模板字符串)
- [五、展开运算符](#五展开运算符)
- [六、可选链与空值合并](#六可选链与空值合并)
- [七、数组方法](#七数组方法)
- [八、对象操作](#八对象操作)

---

## 一、箭头函数

### 什么是箭头函数？

箭头函数是 ES6 引入的函数简写语法，**自动绑定 this**。

### Objective-C vs JavaScript

**Objective-C:**
```objc
// Block 语法
int (^add)(int, int) = ^(int a, int b) {
    return a + b;
};

// 调用
int result = add(2, 3);  // 5
```

**JavaScript:**
```javascript
// 普通函数
function add(a, b) {
    return a + b
}

// 箭头函数
const add = (a, b) => {
    return a + b
}

// 简化（隐式返回）
const add = (a, b) => a + b
```

### 语法规则

#### 1. 基础语法

```javascript
// 标准形式
const func = (param1, param2) => {
    // 函数体
    return result
}

// 单个参数，可省略括号
const square = x => {
    return x * x
}

// 无参数，括号不能省略
const sayHello = () => {
    console.log('Hello')
}

// 单行返回，可省略 return 和花括号
const square = x => x * x
const add = (a, b) => a + b
```

#### 2. 返回对象

```javascript
// ❌ 错误 - 花括号被当作函数体
const getUser = () => { name: 'Tom', age: 25 }

// ✅ 正确 - 用小括号包裹对象
const getUser = () => ({ name: 'Tom', age: 25 })
```

#### 3. this 绑定

**这是箭头函数最重要的特性！**

```javascript
class MyComponent extends React.Component {
    // 普通函数 - this 会丢失
    handleClick1() {
        console.log(this.props)  // undefined ❌
    }

    // 箭头函数 - 自动绑定 this
    handleClick2 = () => {
        console.log(this.props)  // ✅ 正常
    }

    render() {
        return (
            <button onClick={this.handleClick2}>点击</button>
        )
    }
}
```

**Objective-C 对比:**
```objc
@interface MyClass : NSObject
@property (nonatomic, copy) NSString *name;
@end

@implementation MyClass

- (void)normalMethod {
    // Block 会自动捕获 self
    void (^myBlock)(void) = ^{
        NSLog(@"%@", self.name);  // 需要显式使用 self
    };
    myBlock();
}

- (void)withWeakCapture {
    // 弱引用避免循环引用
    __weak typeof(self) weakSelf = self;
    void (^myBlock)(void) = ^{
        NSLog(@"%@", weakSelf.name);
    };
    myBlock();
}

@end
```

### React 中的使用

```javascript
class TodoList extends React.Component {
    state = {
        items: []
    }

    // 箭头函数 - 自动绑定 this
    addItem = (item) => {
        this.setState({
            items: [...this.state.items, item]
        })
    }

    // 删除项目
    removeItem = (id) => {
        this.setState({
            items: this.state.items.filter(item => item.id !== id)
        })
    }

    render() {
        return (
            <div>
                {this.state.items.map(item => (
                    <div key={item.id}>
                        {item.name}
                        {/* 传递参数 */}
                        <button onClick={() => this.removeItem(item.id)}>
                            删除
                        </button>
                    </div>
                ))}
            </div>
        )
    }
}
```

---

## 二、解构赋值

### 什么是解构赋值？

从对象或数组中**批量提取值**的语法糖。

### 对象解构

#### 基础用法

```javascript
const user = {
    name: '张三',
    age: 25,
    city: '北京'
}

// 传统方式
const name = user.name
const age = user.age
const city = user.city

// 解构赋值
const { name, age, city } = user

console.log(name)  // '张三'
console.log(age)   // 25
console.log(city)  // '北京'
```

**Objective-C 对比:**
```objc
// Objective-C 没有直接的解构语法，需要逐个赋值
@interface User : NSObject
@property (nonatomic, copy) NSString *name;
@property (nonatomic, assign) NSInteger age;
@property (nonatomic, copy) NSString *city;
@end

@implementation User
@end

// 使用
User *user = [[User alloc] init];
user.name = @"张三";
user.age = 25;
user.city = @"北京";

// 需要逐个取值
NSString *name = user.name;
NSInteger age = user.age;
NSString *city = user.city;
```

#### 默认值

```javascript
const { serviceUcId = '', shareItems = [] } = this.state
//                  ^^^^              ^^^^
//                  默认值             默认值

// 如果 this.state 中没有这些属性，使用默认值
this.state = { APP_SOURCE: 'mobile' }

// 解构后
serviceUcId = ''        // 使用默认值
shareItems = []         // 使用默认值
APP_SOURCE = 'mobile'   // 从 state 中取到值
```

#### 重命名

```javascript
const props = { visible: true }

// 提取并重命名
const { visible: isShow } = props

console.log(isShow)   // true
console.log(visible)  // undefined
```

#### 嵌套解构

```javascript
const user = {
    name: '张三',
    address: {
        city: '北京',
        street: '朝阳区'
    }
}

// 嵌套解构
const { name, address: { city } } = user
console.log(name)  // '张三'
console.log(city)  // '北京'
```

#### 剩余参数

```javascript
const { name, age, ...rest } = {
    name: '张三',
    age: 25,
    city: '北京',
    job: '工程师'
}

console.log(name)  // '张三'
console.log(age)   // 25
console.log(rest)  // { city: '北京', job: '工程师' }
```

### 数组解构

```javascript
const arr = [1, 2, 3, 4, 5]

// 基础解构
const [first, second] = arr
console.log(first)   // 1
console.log(second)  // 2

// 跳过元素
const [first, , third] = arr
console.log(first)   // 1
console.log(third)   // 3

// 剩余元素
const [first, ...rest] = arr
console.log(first)   // 1
console.log(rest)    // [2, 3, 4, 5]

// 默认值
const [a = 10, b = 20] = [1]
console.log(a)  // 1
console.log(b)  // 20 (使用默认值)
```

### React 中的使用

```javascript
class MyComponent extends React.Component {
    render() {
        // 同时解构 props 和 state
        const { visible, image, onClose } = this.props
        const { scale, isZooming } = this.state

        return (
            <div>
                {visible && <img src={image} />}
                <button onClick={onClose}>关闭</button>
                <p>缩放: {scale}</p>
            </div>
        )
    }

    // 函数参数解构
    renderUser = ({ name, age, city }) => {
        return (
            <div>
                <p>姓名: {name}</p>
                <p>年龄: {age}</p>
                <p>城市: {city}</p>
            </div>
        )
    }
}
```

---

## 三、类字段语法

### 什么是类字段语法？

在类中直接定义属性和方法的语法（ES2022 标准）。

### Objective-C vs JavaScript

**Objective-C:**
```objc
@interface MyClass : NSObject

// 实例属性
@property (nonatomic, assign) NSInteger count;
@property (nonatomic, copy) NSString *name;

// 方法声明
- (void)increaseCount;

@end

@implementation MyClass

- (instancetype)init {
    if (self = [super init]) {
        _count = 0;
        _name = @"Tom";
    }
    return self;
}

- (void)increaseCount {
    self.count += 1;
}

@end
```

**JavaScript:**
```javascript
class MyComponent extends React.Component {
    // 类字段 - 实例属性
    count = 0
    name = 'Tom'

    // 类字段 - 箭头函数方法
    increaseCount = () => {
        this.count += 1
    }
}
```

### React 中的使用

#### 定义 State

```javascript
class MyComponent extends React.Component {
    // 方式 1: 类字段语法（推荐）
    state = {
        count: 0,
        name: '张三'
    }

    // 方式 2: Constructor 中定义
    constructor(props) {
        super(props)
        this.state = {
            count: 0,
            name: '张三'
        }
    }
}
```

#### 定义方法

```javascript
class MyComponent extends React.Component {
    // 类字段 + 箭头函数（推荐）
    handleClick = () => {
        console.log(this.props)  // ✅ this 正常
    }

    // 普通方法（需要绑定）
    handleClick() {
        console.log(this.props)  // ❌ this 可能是 undefined
    }

    constructor(props) {
        super(props)
        // 在 constructor 中绑定
        this.handleClick = this.handleClick.bind(this)
    }
}
```

---

## 四、模板字符串

### 什么是模板字符串？

使用反引号 `` ` `` 的字符串，支持变量插值和多行。

### Objective-C vs JavaScript

**Objective-C:**
```objc
NSString *name = @"Tom";
NSInteger age = 25;

// 字符串格式化
NSString *message = [NSString stringWithFormat:@"我是 %@,今年 %ld 岁", name, (long)age];
```

**JavaScript:**
```javascript
const name = 'Tom'
const age = 25

// 模板字符串
const message = `我是 ${name}，今年 ${age} 岁`
```

### 基础用法

```javascript
const name = '张三'
const age = 25
const score = 90

// 变量插值
const message = `姓名: ${name}, 年龄: ${age}`

// 表达式
const result = `及格: ${score >= 60 ? '是' : '否'}`

// 函数调用
const greeting = `Hello, ${name.toUpperCase()}!`

// 多行字符串
const html = `
    <div>
        <h1>${name}</h1>
        <p>年龄: ${age}</p>
    </div>
`
```

### React 中的使用

```javascript
class MyComponent extends React.Component {
    state = {
        scale: 1.5,
        count: 10
    }

    render() {
        const { scale, count } = this.state

        return (
            <div>
                {/* CSS 中使用 */}
                <div style={{ width: `${scale * 100}%` }}>
                    缩放内容
                </div>

                {/* className 动态拼接 */}
                <div className={`card ${count > 5 ? 'large' : 'small'}`}>
                    卡片
                </div>

                {/* 文本内容 */}
                <p>当前缩放: {`${(scale * 100).toFixed(0)}%`}</p>
            </div>
        )
    }
}
```

---

## 五、展开运算符

### 什么是展开运算符？

使用 `...` 展开数组或对象。

### 数组展开

```javascript
const arr1 = [1, 2, 3]
const arr2 = [4, 5, 6]

// 合并数组
const merged = [...arr1, ...arr2]
console.log(merged)  // [1, 2, 3, 4, 5, 6]

// 添加元素
const newArr = [...arr1, 4]
console.log(newArr)  // [1, 2, 3, 4]

// 复制数组
const copy = [...arr1]
console.log(copy)  // [1, 2, 3]
```

**Objective-C 对比:**
```objc
NSArray *arr1 = @[@1, @2, @3];
NSArray *arr2 = @[@4, @5, @6];

// 合并数组
NSArray *merged = [arr1 arrayByAddingObjectsFromArray:arr2];

// 添加元素（使用可变数组）
NSMutableArray *newArr = [arr1 mutableCopy];
[newArr addObject:@4];
```

### 对象展开

```javascript
const obj1 = { a: 1, b: 2 }
const obj2 = { c: 3, d: 4 }

// 合并对象
const merged = { ...obj1, ...obj2 }
console.log(merged)  // { a: 1, b: 2, c: 3, d: 4 }

// 覆盖属性
const updated = { ...obj1, b: 10 }
console.log(updated)  // { a: 1, b: 10 }

// 添加属性
const extended = { ...obj1, c: 3 }
console.log(extended)  // { a: 1, b: 2, c: 3 }
```

### React 中的使用

```javascript
class MyComponent extends React.Component {
    state = {
        items: [1, 2, 3],
        user: { name: 'Tom', age: 25 }
    }

    // 添加数组元素
    addItem = (item) => {
        this.setState({
            items: [...this.state.items, item]  // 创建新数组
        })
    }

    // 更新对象属性
    updateUser = (newAge) => {
        this.setState({
            user: { ...this.state.user, age: newAge }  // 创建新对象
        })
    }

    // 传递 props
    render() {
        const props = { visible: true, image: 'test.jpg' }

        return (
            <ChildComponent {...props} />  // 展开 props
            // 等价于:
            // <ChildComponent visible={true} image="test.jpg" />
        )
    }
}
```

---

## 六、可选链与空值合并

### 可选链 (?.)

安全地访问嵌套属性，如果中间某个值是 `null` 或 `undefined`，返回 `undefined`。

**Objective-C 对比:**
```objc
// Objective-C 的 nil 消息发送机制
NSString *city = user.address.city;

// 如果 user 或 address 为 nil,整个表达式返回 nil
// 这是 Objective-C 的特性,不会崩溃

// 等价于
NSString *city = nil;
if (user != nil && user.address != nil) {
    city = user.address.city;
}
```

**JavaScript:**
```javascript
const user = {
    name: 'Tom',
    address: {
        city: '北京'
    }
}

// 传统方式
const city = user && user.address && user.address.city

// 可选链
const city = user?.address?.city

console.log(city)  // '北京'

// 如果 address 不存在
const user2 = { name: 'Tom' }
const city2 = user2?.address?.city
console.log(city2)  // undefined (不会报错)
```

### 空值合并 (??)

当左侧值为 `null` 或 `undefined` 时，返回右侧值。

```javascript
// 传统方式（有问题）
const value = someValue || 'default'
// 问题: 0, '', false 也会被当作 falsy

// 空值合并（推荐）
const value = someValue ?? 'default'
// 只有 null 或 undefined 才使用默认值

// 示例
const count1 = 0 ?? 10
console.log(count1)  // 0 (✅ 保留 0)

const count2 = 0 || 10
console.log(count2)  // 10 (❌ 0 被当作 falsy)

const name1 = '' ?? 'Tom'
console.log(name1)  // '' (✅ 保留空字符串)

const name2 = '' || 'Tom'
console.log(name2)  // 'Tom' (❌ 空字符串被当作 falsy)
```

### React 中的使用

```javascript
class MyComponent extends React.Component {
    render() {
        const { user, config } = this.props

        return (
            <div>
                {/* 可选链 */}
                <p>城市: {user?.address?.city ?? '未知'}</p>
                <p>邮编: {user?.address?.zipCode ?? '000000'}</p>

                {/* 方法调用 */}
                <button onClick={this.props.onClose?.()}>
                    关闭
                </button>

                {/* 数组访问 */}
                <p>第一项: {this.state.items?.[0]?.name ?? '无'}</p>
            </div>
        )
    }
}
```

---

## 七、数组方法

### 常用数组方法

#### 1. map - 映射

**作用**: 转换数组元素

```javascript
const numbers = [1, 2, 3, 4, 5]

// 每个元素 * 2
const doubled = numbers.map(num => num * 2)
console.log(doubled)  // [2, 4, 6, 8, 10]

// 提取对象属性
const users = [
    { id: 1, name: 'Tom' },
    { id: 2, name: 'Jerry' }
]
const names = users.map(user => user.name)
console.log(names)  // ['Tom', 'Jerry']
```

**Objective-C 对比:**
```objc
NSArray *numbers = @[@1, @2, @3, @4, @5];

// 使用 enumerateObjectsUsingBlock
NSMutableArray *doubled = [NSMutableArray array];
[numbers enumerateObjectsUsingBlock:^(NSNumber *num, NSUInteger idx, BOOL *stop) {
    [doubled addObject:@([num intValue] * 2)];
}];
```

**React 中渲染列表:**
```javascript
render() {
    const { items } = this.props

    return (
        <ul>
            {items.map(item => (
                <li key={item.id}>{item.name}</li>
            ))}
        </ul>
    )
}
```

#### 2. filter - 过滤

**作用**: 筛选符合条件的元素

```javascript
const numbers = [1, 2, 3, 4, 5]

// 筛选偶数
const evens = numbers.filter(num => num % 2 === 0)
console.log(evens)  // [2, 4]

// 筛选对象
const users = [
    { name: 'Tom', age: 25 },
    { name: 'Jerry', age: 17 }
]
const adults = users.filter(user => user.age >= 18)
console.log(adults)  // [{ name: 'Tom', age: 25 }]
```

**Objective-C 对比:**
```objc
NSArray *numbers = @[@1, @2, @3, @4, @5];

// 使用 NSPredicate 过滤
NSPredicate *predicate = [NSPredicate predicateWithBlock:^BOOL(NSNumber *num, NSDictionary *bindings) {
    return [num intValue] % 2 == 0;
}];
NSArray *evens = [numbers filteredArrayUsingPredicate:predicate];
```

#### 3. reduce - 归约

**作用**: 将数组归约为单个值

```javascript
const numbers = [1, 2, 3, 4, 5]

// 求和
const sum = numbers.reduce((acc, num) => acc + num, 0)
console.log(sum)  // 15

// 求最大值
const max = numbers.reduce((acc, num) => Math.max(acc, num), 0)
console.log(max)  // 5

// 转换为对象
const users = [
    { id: 1, name: 'Tom' },
    { id: 2, name: 'Jerry' }
]
const userMap = users.reduce((acc, user) => {
    acc[user.id] = user
    return acc
}, {})
console.log(userMap)  // { 1: { id: 1, name: 'Tom' }, 2: { id: 2, name: 'Jerry' } }
```

**Objective-C 对比:**
```objc
NSArray *numbers = @[@1, @2, @3, @4, @5];

// 使用循环累加
NSInteger sum = 0;
for (NSNumber *num in numbers) {
    sum += [num intValue];
}

// 或使用 KVC
NSNumber *sumNumber = [numbers valueForKeyPath:@"@sum.self"];
NSInteger sum = [sumNumber intValue];
```

#### 4. find / findIndex

```javascript
const users = [
    { id: 1, name: 'Tom' },
    { id: 2, name: 'Jerry' }
]

// 查找元素
const user = users.find(u => u.id === 2)
console.log(user)  // { id: 2, name: 'Jerry' }

// 查找索引
const index = users.findIndex(u => u.id === 2)
console.log(index)  // 1
```

#### 5. some / every

```javascript
const numbers = [1, 2, 3, 4, 5]

// 是否存在偶数
const hasEven = numbers.some(num => num % 2 === 0)
console.log(hasEven)  // true

// 是否全部为偶数
const allEven = numbers.every(num => num % 2 === 0)
console.log(allEven)  // false
```

#### 6. includes

```javascript
const arr = [1, 2, 3]

console.log(arr.includes(2))  // true
console.log(arr.includes(5))  // false
```

---

## 八、对象操作

### Object 常用方法

#### 1. Object.keys / values / entries

```javascript
const user = { name: 'Tom', age: 25, city: '北京' }

// 获取键
const keys = Object.keys(user)
console.log(keys)  // ['name', 'age', 'city']

// 获取值
const values = Object.values(user)
console.log(values)  // ['Tom', 25, '北京']

// 获取键值对
const entries = Object.entries(user)
console.log(entries)  // [['name', 'Tom'], ['age', 25], ['city', '北京']]
```

#### 2. Object.assign

```javascript
const obj1 = { a: 1, b: 2 }
const obj2 = { b: 3, c: 4 }

// 合并对象
const merged = Object.assign({}, obj1, obj2)
console.log(merged)  // { a: 1, b: 3, c: 4 }

// 等价于展开运算符（推荐）
const merged2 = { ...obj1, ...obj2 }
```

#### 3. 动态属性名

```javascript
const key = 'name'
const value = 'Tom'

// 动态属性名
const obj = {
    [key]: value  // name: 'Tom'
}

console.log(obj)  // { name: 'Tom' }
```

---

## 总结

### 核心语法速查表

| 语法 | 说明 | 示例 |
|------|------|------|
| **箭头函数** | 函数简写，自动绑定 this | `const add = (a, b) => a + b` |
| **解构赋值** | 批量提取属性 | `const { name, age } = user` |
| **类字段** | 类中定义属性和方法 | `state = { count: 0 }` |
| **模板字符串** | 变量插值 | `` `Hello ${name}` `` |
| **展开运算符** | 展开数组/对象 | `[...arr1, ...arr2]` |
| **可选链** | 安全访问嵌套属性 | `user?.address?.city` |
| **空值合并** | 默认值处理 | `value ?? 'default'` |

### Objective-C vs JavaScript 对照表

| Objective-C | JavaScript |
|-------|-----------|
| `^(int a, int b) { return a + b; }` | `const sum = (a, b) => a + b` |
| `NSString *name = user.name` | `const { name } = user` |
| `[NSString stringWithFormat:@"Hello %@", name]` | `` `Hello ${name}` `` |
| `[arr1 arrayByAddingObjectsFromArray:arr2]` | `[...arr1, ...arr2]` |
| `user.address.city` (nil-safe) | `user?.address?.city` |
| `value ?: @"default"` | `value ?? "default"` |
| `enumerateObjectsUsingBlock` | `arr.map(x => x * 2)` |
| `filteredArrayUsingPredicate` | `arr.filter(x => x > 5)` |

### 最佳实践

1. **优先使用箭头函数**，避免 this 绑定问题
2. **使用解构赋值**，让代码更简洁
3. **使用展开运算符**，避免直接修改原数组/对象
4. **使用可选链**，避免空值检查的嵌套 if
5. **使用模板字符串**，提高字符串拼接的可读性

---
