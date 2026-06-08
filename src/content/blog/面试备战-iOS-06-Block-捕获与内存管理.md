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

---

## 🔬 深度扩展：__block 的 forwarding 指针与栈堆迁移

Block 面试最容易被追问的是"__block 为什么能修改变量"和"Block 从栈 copy 到堆的完整过程"。要讲清楚 **__block 包装、forwarding 指针、copy helper、栈堆迁移**的完整机制。

### 扩展1：__block 变量的完整包装结构

**源码：**

```objc
__block int age = 10;
void (^block)(void) = ^{
    age = 20;  // 修改外部变量
};
```

**编译器转换（简化）：**

```cpp
// 1. __block 变量被包装成结构体
struct __Block_byref_age {
    void *__isa;
    struct __Block_byref_age *__forwarding;  // 指向自己或堆上副本
    int __flags;
    int __size;
    int age;  // 实际变量
};

// 2. Block 结构
struct __main_block_impl_0 {
    struct __block_impl impl;
    struct __main_block_desc_0 *Desc;
    struct __Block_byref_age *age;  // 捕获 byref 结构的指针
};

// 3. 创建 byref 结构（栈上）
struct __Block_byref_age age_byref = {
    NULL,              // __isa
    &age_byref,        // __forwarding 初始指向自己
    0,                 // __flags
    sizeof(struct __Block_byref_age),
    10                 // age = 10
};

// 4. 创建 Block（栈上）
struct __main_block_impl_0 block_impl = {
    // ...
    &age_byref  // 捕获 byref 结构的指针
};

// 5. Block 内访问 age
void __main_block_func_0(struct __main_block_impl_0 *__cself) {
    struct __Block_byref_age *age = __cself->age;
    
    // 关键：通过 forwarding 指针访问
    age->__forwarding->age = 20;
}
```

**关键点：__forwarding 双重指针机制**

访问 `__block` 变量时，**永远通过 `__forwarding` 指针**：

```cpp
age->__forwarding->age
```

为什么不直接 `age->age`？

因为 Block 可能从栈 copy 到堆，`__block` 变量也会迁移。`__forwarding` 保证无论栈上还是堆上，都能访问到**最终的那份变量**。

### 扩展2：Block copy 时的栈堆迁移

**场景：Block 从栈 copy 到堆**

```objc
__block int age = 10;

void (^block)(void) = ^{  // 赋值给 __strong 变量，触发 copy
    age++;
};
```

**copy 流程（源码级）：**

```cpp
// 1. _Block_copy 入口
void *_Block_copy(const void *arg) {
    struct Block_layout *aBlock = (struct Block_layout *)arg;
    
    // 如果已经在堆上，直接 retain
    if (aBlock->flags & BLOCK_IS_GLOBAL) {
        return aBlock;  // 全局 Block 不需要 copy
    }
    
    if (aBlock->flags & BLOCK_IS_HEAP) {
        // 已经在堆上，引用计数 +1
        return aBlock;
    }
    
    // 2. 分配堆内存
    struct Block_layout *result = malloc(aBlock->descriptor->size);
    
    // 3. 拷贝 Block 结构
    memmove(result, aBlock, aBlock->descriptor->size);
    
    // 4. 设置 heap 标记
    result->flags |= BLOCK_IS_HEAP;
    result->flags &= ~BLOCK_IS_STACK;
    
    // 5. 调用 copy helper（关键）
    if (aBlock->flags & BLOCK_HAS_COPY_DISPOSE) {
        (*aBlock->descriptor->copy)(result, aBlock);
    }
    
    return result;
}
```

**copy helper 处理 __block 变量：**

```cpp
void __main_block_copy_0(struct __main_block_impl_0 *dst,
                         struct __main_block_impl_0 *src) {
    // 拷贝 __block 变量
    _Block_object_assign(&dst->age, src->age, BLOCK_FIELD_IS_BYREF);
}

void _Block_object_assign(void *destAddr, const void *object, const int flags) {
    if (flags & BLOCK_FIELD_IS_BYREF) {
        // 处理 __block 变量
        struct __Block_byref_age *src_byref = (struct __Block_byref_age *)object;
        
        // 检查是否已经在堆上
        if (src_byref->__forwarding->__flags & BLOCK_BYREF_IS_HEAP) {
            // 已在堆上，增加引用计数
            *(void **)destAddr = (void *)src_byref;
            return;
        }
        
        // 栈上 byref，需要 copy 到堆
        struct __Block_byref_age *copy = malloc(sizeof(*src_byref));
        
        // 拷贝内容
        memcpy(copy, src_byref, sizeof(*src_byref));
        
        // 关键：更新 forwarding 指针
        copy->__forwarding = copy;           // 堆副本指向自己
        src_byref->__forwarding = copy;      // 栈副本指向堆副本
        
        // 设置 heap 标记
        copy->__flags |= BLOCK_BYREF_IS_HEAP;
        
        // 写入目标地址
        *(void **)destAddr = (void *)copy;
    }
}
```

**迁移后的指针关系：**

```text
栈上：
┌─────────────────┐
│ Block (stack)   │
│  age -> byref_s │──┐
└─────────────────┘  │
                     │
┌─────────────────┐  │
│ byref_s (stack) │<─┘
│  __forwarding ──┼──┐
│  age = 10       │  │
└─────────────────┘  │
                     │
堆上：               │
┌─────────────────┐  │
│ Block (heap)    │  │
│  age -> byref_h │──┼──┐
└─────────────────┘  │  │
                     │  │
┌─────────────────┐  │  │
│ byref_h (heap)  │<─┘  │
│  __forwarding ──┼─────┘
│  age = 10       │<────────┐（栈上 byref 也指向堆副本）
└─────────────────┘
```

**关键：栈副本的 forwarding 更新了**

```cpp
src_byref->__forwarding = copy;  // 栈上 byref 指向堆副本
```

所以无论在栈上还是堆上访问：

```cpp
age->__forwarding->age  // 永远访问堆上的副本
```

### 扩展3：多个 Block 捕获同一个 __block 变量

**场景：**

```objc
__block int count = 0;

void (^block1)(void) = ^{ count++; };  // Block1 copy 到堆
void (^block2)(void) = ^{ count++; };  // Block2 copy 到堆
```

**copy 流程：**

```text
1. block1 copy：
   - byref 从栈 copy 到堆
   - byref 引用计数 = 1
   - 栈上 byref.__forwarding 指向堆副本

2. block2 copy：
   - 检查 byref.__forwarding 已在堆上
   - 不再 copy，直接复用堆副本
   - byref 引用计数 = 2
```

**引用计数管理：**

```cpp
struct __Block_byref_age {
    void *__isa;
    struct __Block_byref_age *__forwarding;
    int __flags;
    int __size;
    // 如果 flags 包含 BLOCK_BYREF_HAS_COPY_DISPOSE
    void (*byref_keep)(struct __Block_byref_age *dst, struct __Block_byref_age *src);
    void (*byref_destroy)(struct __Block_byref_age *);
    int age;
};
```

当多个 Block 捕获时，`__block` 变量的引用计数在 `__flags` 的高位维护。

**释放时：**

```text
block1 释放 -> byref 引用计数 -1（= 1）
block2 释放 -> byref 引用计数 -1（= 0）-> 释放 byref
```

### 扩展4：__block 捕获对象的内存管理

**__block 对象变量：**

```objc
__block id obj = [[NSObject alloc] init];

void (^block)(void) = ^{
    NSLog(@"%@", obj);
};
```

**编译器生成的 byref 结构：**

```cpp
struct __Block_byref_obj {
    void *__isa;
    struct __Block_byref_obj *__forwarding;
    int __flags;
    int __size;
    void (*__Block_byref_id_object_copy)(void *, void *);  // copy helper
    void (*__Block_byref_id_object_dispose)(void *);       // dispose helper
    id obj;
};
```

**copy helper：**

```cpp
void __Block_byref_id_object_copy(void *dst, void *src) {
    struct __Block_byref_obj *dst_byref = (struct __Block_byref_obj *)dst;
    struct __Block_byref_obj *src_byref = (struct __Block_byref_obj *)src;
    
    // ARC 下自动 retain
    dst_byref->obj = src_byref->obj;
}
```

**dispose helper：**

```cpp
void __Block_byref_id_object_dispose(void *src) {
    struct __Block_byref_obj *src_byref = (struct __Block_byref_obj *)src;
    
    // ARC 下自动 release
    src_byref->obj = nil;
}
```

**关键：__block 对象仍然会被 retain**

很多人误以为 `__block` 不持有对象，实际上：

```objc
__block id obj = self;  // ❌ 仍然强持有 self
```

ARC 下要打破循环引用，必须用 `__weak`：

```objc
__weak id weakSelf = self;
__block id obj = weakSelf;  // 或者直接 __weak __block
```

### 扩展5：Block copy helper 和 dispose helper 的完整机制

**Block descriptor 结构：**

```cpp
struct Block_descriptor_1 {
    uintptr_t reserved;
    uintptr_t size;  // Block 结构大小
};

struct Block_descriptor_2 {
    void (*copy)(void *dst, const void *src);     // copy helper
    void (*dispose)(const void *);                 // dispose helper
};

struct Block_descriptor_3 {
    const char *signature;  // 方法签名（用于编码）
    const char *layout;     // 变量布局（GC 时代遗留）
};
```

**什么时候有 copy/dispose helper？**

- Block 捕获了对象变量
- Block 捕获了 `__block` 变量
- Block 捕获了 C++ 对象

**copy helper 的作用：**

```cpp
void __main_block_copy_0(struct __main_block_impl_0 *dst,
                         struct __main_block_impl_0 *src) {
    // 1. 处理捕获的对象（retain）
    _Block_object_assign(&dst->capturedObj, src->capturedObj, BLOCK_FIELD_IS_OBJECT);
    
    // 2. 处理 __block 变量（copy byref）
    _Block_object_assign(&dst->blockVar, src->blockVar, BLOCK_FIELD_IS_BYREF);
    
    // 3. 处理 Block 变量（copy block）
    _Block_object_assign(&dst->capturedBlock, src->capturedBlock, BLOCK_FIELD_IS_BLOCK);
}
```

**dispose helper 的作用：**

```cpp
void __main_block_dispose_0(struct __main_block_impl_0 *src) {
    // 1. 释放捕获的对象
    _Block_object_dispose(src->capturedObj, BLOCK_FIELD_IS_OBJECT);
    
    // 2. 释放 __block 变量
    _Block_object_dispose(src->blockVar, BLOCK_FIELD_IS_BYREF);
    
    // 3. 释放 Block 变量
    _Block_object_dispose(src->capturedBlock, BLOCK_FIELD_IS_BLOCK);
}
```

### 扩展6：Block 捕获 self 的完整分析

**场景1：在实例方法中捕获 self**

```objc
- (void)setupBlock {
    self.completion = ^{
        [self doSomething];
    };
}
```

**编译器处理：**

```cpp
// 实例方法有隐藏参数 self
- (void)setupBlock:(id)self _cmd:(SEL)_cmd {
    // Block 捕获 self
    struct __setupBlock_block_impl_0 {
        struct __block_impl impl;
        struct __setupBlock_block_desc_0 *Desc;
        id self;  // 捕获的 self
    };
    
    // 创建 Block
    struct __setupBlock_block_impl_0 block_impl = {
        // ...
        self  // 捕获 self 参数
    };
    
    // copy 到堆时，copy helper 会 retain self
}
```

**循环引用链：**

```text
self -> completion (strong property)
completion (heap block) -> self (captured, retain)
```

**场景2：Block 捕获成员变量**

```objc
self.completion = ^{
    NSLog(@"%@", _name);  // 访问 ivar
};
```

**底层仍然是捕获 self：**

```objc
// 等价于
self.completion = ^{
    NSLog(@"%@", self->_name);
};
```

因为访问 ivar 需要 self 指针计算偏移。

**场景3：Block 捕获 self 的属性**

```objc
self.completion = ^{
    NSLog(@"%@", self.name);  // 调用 getter
};
```

**同样捕获 self：**

```objc
// 等价于
self.completion = ^{
    NSLog(@"%@", [self name]);
};
```

### 扩展7：weak-strong dance 的完整必要性

**为什么需要 weak？**

```objc
__weak typeof(self) weakSelf = self;
self.completion = ^{
    [weakSelf doSomething];
};
```

打破循环引用：

```text
self -> completion (strong)
completion -> weakSelf (weak，不持有)
```

**为什么 Block 内还要 strong？**

```objc
__weak typeof(self) weakSelf = self;
self.completion = ^{
    __strong typeof(weakSelf) strongSelf = weakSelf;
    if (!strongSelf) return;
    
    [strongSelf step1];
    [strongSelf step2];
    [strongSelf step3];
};
```

**问题场景：只用 weak**

```objc
__weak typeof(self) weakSelf = self;
self.completion = ^{
    [weakSelf step1];  // weakSelf 还有效
    // ... 此时 self 可能被其他线程释放
    [weakSelf step2];  // weakSelf 变成 nil
    [weakSelf step3];  // weakSelf 是 nil
};
```

**用 strong 的保护：**

```objc
__strong typeof(weakSelf) strongSelf = weakSelf;
// 此时 strongSelf 临时持有 self
// Block 执行期间 self 不会释放
[strongSelf step1];
[strongSelf step2];
[strongSelf step3];
// Block 执行完，strongSelf 释放，self 可以正常销毁
```

**什么时候不需要 strong？**

1. **Block 内只有一次调用**  
   ```objc
   __weak typeof(self) weakSelf = self;
   dispatch_async(queue, ^{
       [weakSelf singleMethod];  // 只调一次，可以不 strong
   });
   ```

2. **不在乎执行完整性**  
   ```objc
   // 定时器刷新 UI，self 释放了就不刷新了，可以接受
   __weak typeof(self) weakSelf = self;
   self.timer = [NSTimer scheduledTimerWithTimeInterval:1 repeats:YES block:^{
       [weakSelf updateUI];
   }];
   ```

3. **Block 本身不被长期持有**  
   ```objc
   // 动画 Block，执行完就释放
   [UIView animateWithDuration:1 animations:^{
       weakSelf.view.alpha = 0;
   }];
   ```

### 扩展8：Block 捕获的性能成本

**不同捕获方式的成本：**

| 捕获类型 | 栈 Block 创建 | 堆 Block copy | 堆 Block 释放 |
|---------|-------------|--------------|-------------|
| 无捕获 | ~10 ns | 无需 copy | 无需释放 |
| 基本类型 | ~20 ns | ~50 ns | ~10 ns |
| 对象 | ~30 ns | ~100 ns（retain） | ~50 ns（release） |
| __block 基本类型 | ~50 ns | ~200 ns（byref copy） | ~100 ns |
| __block 对象 | ~80 ns | ~300 ns | ~150 ns |

**优化建议：**

1. **避免捕获大结构体**  
   捕获会完整拷贝，用指针或引用代替。

2. **减少 __block 使用**  
   只在真正需要修改变量时用。

3. **避免嵌套 Block**  
   每层 Block 都有捕获和 copy 成本。

4. **重用 Block**  
   不要每次都创建新 Block：
   ```objc
   // ❌ 每次都创建
   for (int i = 0; i < 1000; i++) {
       dispatch_async(queue, ^{ ... });
   }
   
   // ✅ 重用
   void (^reusableBlock)(void) = ^{ ... };
   for (int i = 0; i < 1000; i++) {
       dispatch_async(queue, reusableBlock);
   }
   ```

---

## 补充总结

Block 捕获机制的深度记忆点：

1. **__block 包装**：变量被包装成 byref 结构，包含 forwarding 指针
2. **forwarding 指针**：访问永远通过 forwarding，保证栈堆迁移后正确
3. **栈堆迁移**：Block copy 时，byref 也 copy，栈副本 forwarding 指向堆副本
4. **多 Block 共享**：多个 Block 捕获同一 __block，byref 引用计数管理
5. **__block 对象**：ARC 下仍然 retain，不能替代 __weak
6. **copy/dispose helper**：处理捕获对象的 retain/release，byref 的 copy/destroy
7. **weak-strong dance**：weak 打破循环，strong 保证执行期间对象存活

面试追问时要能讲出：
- __block 的 forwarding 指针为什么需要（栈堆迁移后访问正确位置）
- Block copy 时 __block 变量如何迁移（copy byref，更新 forwarding）
- __block 对象在 ARC 下是否持有（持有，不能替代 __weak）
- weak-strong dance 为什么需要 strong（保证执行期间对象不释放）
- Block 捕获 self 的三种形式（显式、ivar、属性）
- 什么时候可以只用 weak 不用 strong（单次调用、不在乎完整性、短生命周期）
