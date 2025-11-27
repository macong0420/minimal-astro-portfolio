---
title: "Flutter-02-Dart 空安全 (Null Safety) 全景指南"
description: ""
publishedAt: 2025-11-27
tags:
  - "flutter"
  - " 空安全"
---
# Dart 空安全 (Null Safety) 全景指南

![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251127124357082.png)


Dart 的空安全体系自 **Dart 2.12** 引入，是一项\*\*健全（Sound）\*\*的特性。

> "健全"意味着什么？
>
> 只要代码通过了编译，Dart 就能在运行时保证非空类型的变量永远不会为 null（除非使用了 dynamic 或进行了不安全的强行转换）。

***

## 1. 核心原则：默认非空 (Non-nullable by default)

这是空安全机制的基石。

- **Before (空安全之前)**: 所有类型的变量默认都可以赋值为 `null`。

- **After (空安全之后)**: **除非明确声明，否则变量坚决不能为 `null`。**

| **类型**                  | **写法**    | **含义**      | **示例**                 |
| ----------------------- | --------- | ----------- | ---------------------- |
| **非空类型** (Non-nullable) | `String`  | 永远不能为 null  | `String name = 'Tom';` |
| **可空类型** (Nullable)     | `String?` | 可以存储值或 null | `String? name = null;` |

***

## 2. 类型层级结构的变化

空安全重构了 Dart 的类型树（Type Hierarchy）：

1. **`Object?` (Root)**

   - **新的顶层根节点**。

   - 包含：“所有的非空对象” + “`null`”。
2. **`Object`**

   - **所有非空类型的根**。

   - 不包含 `null`。
3. **`Null`**

   - 一个独立的类，只包含唯一的值 `null`。
4. **`Never` (Bottom)**

   - 位于类型层级的最底层。

   - 表示“永远不存在的值”或“程序无法运行到这里”（通常用于抛出异常的函数返回值）。

> **继承关系**：`String` 是 `String?` 的子类型。

***

## 3. 关键操作符 (Operators)

这是日常开发中最常用的“语法糖工具箱”：

| **操作符**                                      | **名称**                  | **示例**   | **作用与解释**                    |
| -------------------------------------------- | ----------------------- | -------- | ---------------------------- |
| **`?`**                                      | **可空声明**                | `int? a` | 声明变量 `a` 可以存储整数，也可以是 `null`。 |
| **`!`**                                      | **空断言** (Bang Operator) | `a!`     |                              |
| **强制解包**。告诉编译器：“我保证 `a` 现在肯定不是 null，出了事我负责”。 |                         |          |                              |

⚠️ **风险**：如果运行时为 null，会抛出异常崩溃。

|
\| **`?.`** | **空安全访问** | `a?.length` | 优雅访问。如果 `a` 有值则访问 `.length`；如果 `a` 为 null，则直接返回 `null`（不会崩溃）。 |
\| **`??`** | **空值合并** | `a ?? b` | 兜底逻辑。如果 `a` 有值则返回 `a`；如果 `a` 为 null，则返回 `b`（默认值）。 |
\| **`??=`** | **空值赋值** | `a ??= b` | 懒赋值。如果 `a` 原本为 null，则把 `b` 赋值给 `a`；否则保持 `a` 不变。 |

***

## 4. `late` 关键字 (延迟初始化)

`late` 用于处理那些\*\*“声明时无法赋值，但使用前肯定会有值”\*\*的非空变量。

### 场景 1：稍后初始化

解决“非空变量必须在声明时初始化”的限制。



```Dart
late String value;

void init() { 
  value = 'Hello'; 
}
// 编译器信任你在使用 value 前会调用 init()。
// 🚨 如果没调用直接用，运行时抛出 LateInitializationError。
```

### 场景 2：懒加载 (Lazy Initialization)

利用 `late` 结合 `final` 实现惰性计算。



```Dart
late final expensive = heavyComputation();
// 只有代码第一次读取 expensive 变量时，heavyComputation() 才会真正执行。
```

***

## 5. `required` 关键字 (命名参数)

在函数的**命名参数 (Named Parameters)** 中使用。

- **旧版 (`@required`)**: 只是一个注解提示，不传只会报警告。

- **新版 (`required`)**: **语法强制**。如果参数是非空的且没有默认值，必须加 `required`，否则编译报错。



```Dart
void method({
  required String name,  // 必传，不能为空
  int? age               // 可选，可以为 null
}) { ... }
```

***

## 6. 流分析与类型提升 (Flow Analysis)

Dart 编译器具备上下文感知能力，能自动将“可空”提升为“非空”。

### 智能提升



```Dart
String? text = getSomeString(); // 此时 text 是可空的

if (text != null) {
  // ✅ 在这个作用域内，编译器确定 text 不为空
  // text 自动提升为 String 类型，不需要加 !
  print(text.length); 
}
```

### ⚠️ 重要限制

类型提升通常**只对局部变量有效**。

- **原因**: 类的成员变量（实例变量）可能被其他方法或子类随时修改，编译器无法担保其安全性。

- **解决**: 将成员变量赋值给一个局部变量，然后判断局部变量。

***

## 7. 集合中的空安全

定义复杂数据结构（如 List/Map）时，`?` 的位置决定了谁可以为 null。

- `List`: 列表**不能**为 null，元素也**不能**为 null。

- `List?`: **列表本身**可以为 null，但若列表存在，其元素不能为 null。

- `List`: 列表不能为 null，但**列表里的元素**可以为 null。

- `List?`: **列表本身**和**列表里的元素**都可以为 null。

***

## 8. 级联操作符中的空安全 (`?..`)

当对象可能为 null 时，使用 `?..` 进行链式调用。



```Dart
// 如果 paint 为 null，后续的 color 和 strokeCap 赋值都不会执行
paint
  ?..color = Colors.black
  ..strokeCap = StrokeCap.round; 
// 注意：第一个点用 ?.. 判断后，后续的点通常只需用 ..
```

***

## 9. 构造函数中的初始化列表

对于类中的 **非空 final 字段**，必须在构造函数体执行**之前**赋值。



```Dart
class User {
  final String name;
  
  // ✅ 正确：使用初始化列表 (Initializer List)
  User(String rawName) : name = rawName.trim();
  
  // ❌ 错误：在函数体赋值（此时变量已初始化为 null，违反了非空 final 规则）
  // User(String rawName) { name = rawName; } 
}
```

## 🚨 10. 警示：空安全 ≠ 绝对不崩溃

**误区**：开启了空安全（Null Safety）就等于给 App 穿上了无敌防弹衣，永远不会 Crash。 **真相**：空安全只能在**编译期**拦截大部分明显的错误。如果使用了以下 4 种“高危操作”，App 依然会在**运行期**崩溃。

### 1. 滥用 `!` (空断言) —— "我骗了编译器"

`!` 的本质是强制编译器闭嘴。如果运行时的真实数据是 `null`，应用会立即崩溃。

- **崩溃代码**:


  ```Dart
  String? name; // 默认 null
  // 假如网络请求失败，name 还是 null
  print(name!.length); // 💥 Crash: Null check operator used on a null value
  ```

- **避坑**: 除非生命周期完全可控，否则尽量用 `??` 或 `if (xxx != null)` 代替 `!`。

### 2. `late` 变量未初始化 —— "空头支票没兑现"

`late` 是对编译器的承诺：“我现在不赋值，但在用它之前**一定**会赋值”。如果你食言了，直接使用，就会报错。

- **崩溃代码**:



  ```Dart
  late String info;
  // 忘记赋值，直接打印
  print(info); // 💥 Crash: LateInitializationError: Field 'info' has not been initialized.
  ```

- **避坑**: 确保 `late` 变量的初始化路径覆盖了所有使用场景。

### 3. `dynamic` 类型 —— "法外之地"

`dynamic` 类型的变量会绕过所有静态类型检查（包括空安全检查）。

- **崩溃代码**:


  ```Dart
  dynamic data = null; // 编译器不管 dynamic
  print(data.length);  // 💥 Crash: NoSuchMethodError
  ```

- **避坑**: 在处理 JSON (`Map`) 时要格外小心，尽量早地转为强类型的实体类。

### 4. 类型转换错误 (Cast Error)

空安全不负责检查类型逻辑。

- **崩溃代码**:

  ```Dart
  Object result = 'Success';
  int code = result as int; // 💥 Crash: type 'String' is not a subtype of type 'int'
  ```

***

### 💡 核心总结：空安全到底保了什么？

把空安全想象成汽车的**安全带**：

1. **正常行驶**（编写规范的 Dart 代码）：安全带把你牢牢固定，不会飞出去。

2. **解开安全带**（使用 `dynamic`）：风险自负。

3. **故意撞墙**（滥用 `!`）：安全带也救不了你。