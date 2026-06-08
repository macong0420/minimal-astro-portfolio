---
title: "面试备战 iOS 06：Block 捕获与内存管理"
description: "从 Block 底层结构、变量捕获、__block forwarding、栈堆拷贝、对象持有和循环引用深入拆解 Block 面试题。"
publishedAt: "2026-06-08"
tags: ["面试", "iOS", "Block", "内存管理"]
---

# 面试备战 iOS 06：Block 捕获与内存管理

Block 是 iOS 内存管理和 Runtime 面试的交叉点。它既像函数，又是对象；既能捕获变量，又会参与 retain/release；既能让异步代码优雅，也最容易制造循环引用。

核心问题：

- Block 底层是什么结构？
- 为什么有全局、栈、堆三种 Block？
- 捕获变量到底捕获了什么？
- `__block` 为什么能修改外部变量？
- 循环引用怎么判断，不是见到 self 就 weak？

## 1. Block 本质是什么？

Block 是一个 Objective-C 对象，底层可以简化为结构体：

```cpp
struct Block_layout {
    void *isa;
    int flags;
    int reserved;
    void (*invoke)(void *, ...);
    struct Block_descriptor *descriptor;
    // captured variables
};
```

关键字段：

- `isa`：说明 Block 也是对象。
- `flags`：标记是否需要 copy/dispose、是否在堆上等。
- `invoke`：真正执行的函数指针。
- `descriptor`：描述 Block 大小;copy/dispose 辅助函数放在 `Block_descriptor_2`,仅当捕获了对象或 `__block` 变量(flags 含 `BLOCK_HAS_COPY_DISPOSE`)时才存在。
- captured variables：捕获变量区域。

所以调用 Block：

```objc
block();
```

底层接近：

```cpp
block->invoke(block);
```

Block 自己作为第一个参数传进去，用来访问捕获变量。

## 2. 三种 Block

### 2.1 Global Block

不捕获局部变量的 Block 通常是全局 Block。

```objc
void (^block)(void) = ^{
    NSLog(@"hello");
};
```

它位于全局区，生命周期贯穿进程。

### 2.2 Stack Block

捕获局部变量时，Block 初始可能在栈上。

```objc
int age = 18;
void (^block)(void) = ^{
    NSLog(@"%d", age);
};
```

栈 Block 离开作用域后就无效，所以如果要跨作用域使用，必须 copy 到堆上。

### 2.3 Heap Block

对栈 Block copy 后，Block 复制到堆上。

ARC 下，很多场景编译器会自动 copy，例如 Block 赋值给 strong/copy 属性、作为返回值等。

## 3. 为什么 Block 属性要用 copy？

经典写法：

```objc
@property (nonatomic, copy) void (^completion)(void);
```

原因：Block 可能在栈上。copy 可以把栈 Block 移到堆上，保证属性持有后仍然有效。

ARC 下 strong 很多时候也会触发 copy，但 copy 更准确表达语义，也兼容历史和规范。

## 4. 捕获局部基本类型：按值捕获

```objc
int age = 18;
void (^block)(void) = ^{
    NSLog(@"%d", age);
};
age = 20;
block(); // 18
```

Block 定义时把 `age` 的值拷贝进自己的捕获区域。后续外部变量变化，不影响 Block 内部副本。

如果想修改，需要 `__block`。

## 5. 捕获对象：捕获的是指针，并可能强持有对象

```objc
NSObject *obj = [NSObject new];
void (^block)(void) = ^{
    NSLog(@"%@", obj);
};
```

Block 捕获的是对象指针。堆 Block 会根据捕获语义强持有对象。

ARC 下，如果 Block 被 copy 到堆，会调用 copy helper，对捕获对象 retain。

这就是 Block 循环引用的基础。

## 6. 捕获 self 的本质

在实例方法中：

```objc
self.block = ^{
    [self doSomething];
};
```

Block 捕获 self，堆 Block 强持有 self。

同时 self 又通过属性强持有 block：

```text
self -> block -> self
```

形成环。

但注意：

> Block 里出现 self 不一定循环引用，关键看 self 是否直接或间接强持有这个 Block。

例如：

```objc
dispatch_async(dispatch_get_global_queue(0, 0), ^{
    [self doSomething];
});
```

GCD 队列会临时持有 block，block 持有 self。执行完 block 释放，通常不形成永久环。

## 7. weak-strong dance 为什么需要 strong？

常见写法：

```objc
__weak typeof(self) weakSelf = self;
self.block = ^{
    __strong typeof(weakSelf) strongSelf = weakSelf;
    if (!strongSelf) return;
    [strongSelf doSomething];
};
```

为什么 Block 内还要 strong？

因为 weakSelf 可能在 Block 执行过程中变成 nil。strong 的作用是：

- 不在 Block 持有前形成循环。
- Block 执行期间临时保证 self 存活。

## 8. `__block` 底层结构

`__block` 变量会被包装成结构体：

```cpp
struct __Block_byref_age {
    void *__isa;
    __Block_byref_age *__forwarding;
    int __flags;
    int __size;
    int age;
};
```

访问时不是直接访问 age，而是：

```cpp
age->__forwarding->age
```

为什么需要 `__forwarding`？

因为 Block 从栈 copy 到堆时，`__block` 变量也可能从栈搬到堆。forwarding 指针保证无论栈上还是堆上，都能访问到最终那份变量。

## 9. `__block` 和 `__weak` 区别

`__block`：

- 允许 Block 内修改外部变量。
- 解决变量可变性。
- ARC 下不自动打破循环。

`__weak`：

- 不强持有对象。
- 对象释放后自动置 nil。
- 解决持有关系。

所以：

> `__block` 不是用来解决循环引用的，`__weak` 才是。

## 10. Block copy/dispose 做什么？

当 Block 捕获对象或 `__block` 变量时，descriptor 中可能有 copy/dispose helper。

copy helper：

- retain 捕获对象。
- copy `__block` 变量到堆。

dispose helper：

- release 捕获对象。
- 释放 `__block` 相关资源。

这说明 Block 的内存管理不是简单拷贝字节，而是需要处理捕获对象所有权。

## 11. 常见循环引用场景

### 11.1 属性 Block

```objc
self.completion = ^{
    [self finish];
};
```

### 11.2 Timer / CADisplayLink

Timer 强持有 target，target 强持有 timer。

即使换成 Block Timer，如果 block 捕获 self，也可能环。

### 11.3 UIView 动画不一定长期环

```objc
[UIView animateWithDuration:1 animations:^{
    self.view.alpha = 0;
}];
```

动画系统临时持有 block，执行完释放，一般不是永久循环。但如果动画被长期持有或 repeat，要具体分析。

### 11.4 Masonry/SnapKit 类约束 Block

通常同步执行，不被长期持有，一般不需要 weak self。但如果库内部保存 block，就要看实现。

## 12. 高频追问

### Q1：Block 为什么是对象？

因为它有 isa，可以被 copy/release，能作为 Objective-C 对象参与内存管理。底层结构里有 invoke 函数指针和捕获变量。

### Q2：Block 捕获变量是按值还是按引用？

局部基本类型默认按值捕获。对象变量捕获的是对象指针，堆 Block 会强持有对象。全局变量直接访问;static 局部变量按地址捕获(捕获变量地址),所以 Block 内修改 static 变量对外可见,效果类似 `__block` 但机制不同。

### Q3：为什么 `__block` 可以修改变量？

因为变量被包装成 byref 结构体，Block 内外通过 forwarding 指针访问同一份存储。

### Q4：什么时候必须 weak self？

当 self 强持有 Block，且 Block 内强持有 self 时必须打破环。不是所有 Block 里出现 self 都必须 weak。

## 工程建议

- 属性 Block 用 copy。
- 判断循环引用看持有图，不看语法。
- 异步回调里 weak-strong dance。
- Timer、displayLink、notification block 特别检查。
- 不滥用 weak，避免执行中对象提前释放导致逻辑丢失。


## 深挖追问：Block 要从 ABI、捕获和生命周期三条线答

Block 的本质不是“匿名函数”，而是一个对象，核心结构可以抽象为：

```text
isa
flags
invoke 函数指针
descriptor
captured variables
```

继续追问时，要区分三类 Block：

| 类型 | 位置 | 什么时候出现 | copy 后 |
|---|---|---|---|
| Global Block | 全局区 | 不捕获自动变量 | 仍在全局区 |
| Stack Block | 栈 | 捕获局部自动变量 | 复制到堆 |
| Malloc Block | 堆 | Stack Block copy 后 | 引用计数管理 |

ARC 下很多场景编译器会自动 copy，所以你不常看到 Stack Block 崩溃；但底层概念仍然重要。

`__block` 深挖：

```text
局部变量
  -> 编译器包装成 __Block_byref 结构
  -> Block 内外都通过 forwarding 指针访问
  -> Block 从栈 copy 到堆时，byref 结构也迁移到堆
  -> forwarding 更新，保证内外访问同一份变量
```

所以 `__block` 解决的是“能否在 Block 内修改变量”和“栈堆迁移后访问同一变量”，不是自动解决循环引用。

weak-strong dance 要答成生命周期问题：

```objc
__weak typeof(self) weakSelf = self;
self.callback = ^{
    __strong typeof(weakSelf) self = weakSelf;
    if (!self) return;
    [self doWork];
};
```

弱引用避免 Block 持有 self；进入 Block 后转 strong，是为了保证本次执行过程中 self 不被释放。

容易被问穿的点：

- `__block self` 在 ARC 下默认仍可能被 Block 强持有，不能替代 weak。
- Block 捕获对象变量是捕获对象指针并按语义持有对象，不是深拷贝对象内容。
- Block 捕获 C 基本类型默认是值捕获，后续外部变量变化不影响内部值。
- `copy` property 用于 Block，是因为历史上 Block 可能在栈上。
- Block 作为回调属性时，最常见泄漏链是 `self -> block -> self`。

## 一句话总结

Block 是带捕获上下文的对象；它的问题本质不是语法，而是捕获变量的存储方式和对象之间的持有关系。
