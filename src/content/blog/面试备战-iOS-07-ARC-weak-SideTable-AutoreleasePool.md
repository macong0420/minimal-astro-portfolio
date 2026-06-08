---
title: "面试备战 iOS 07：ARC、weak、SideTable 与 AutoreleasePool"
description: "从 ARC 编译器插入、objc_storeStrong、引用计数分层、weak_table、SideTable、AutoreleasePoolPage 到 RunLoop 释放时机深入解析内存管理。"
publishedAt: "2026-06-08"
tags: ["面试", "iOS", "ARC", "内存管理"]
---

# 面试备战 iOS 07：ARC、weak、SideTable 与 AutoreleasePool

iOS 内存管理面试最容易答浅。很多人只会说“ARC 自动管理内存，weak 自动置 nil，autorelease pool 延迟释放”。这远远不够。

高分回答要能把这条链讲完整：

```text
编译器插入 retain/release -> Runtime 维护引用计数 -> isa/SideTable 分层存储 -> weak 表记录弱引用地址 -> dealloc 清理 weak 和关联对象 -> AutoreleasePoolPage 批量 release
```

## 1. ARC 到底是什么？

ARC 不是垃圾回收，也不是 Runtime 后台线程帮你扫描对象。

ARC 是编译器特性。编译器根据所有权规则，在合适的位置插入内存管理调用。

例如：

```objc
- (void)test {
    NSObject *obj = [[NSObject alloc] init];
    self.item = obj;
}
```

编译后可以粗略理解为：

```objc
NSObject *obj = objc_msgSend(NSObject, @selector(alloc));
obj = objc_msgSend(obj, @selector(init));
objc_storeStrong(&_item, obj);
objc_storeStrong(&obj, nil);
```

真实编译产物更复杂，但核心思想是：

> ARC 把 retain、release、autorelease、storeStrong 等操作前移到编译期决定，Runtime 负责执行这些操作背后的引用计数和弱引用维护。

## 2. strong 赋值底层：objc_storeStrong 做了什么？

strong 属性赋值不是简单指针替换。

```objc
self.name = newName;
```

底层语义接近：

```objc
id old = self->_name;
id new = [newName retain];
self->_name = new;
[old release];
```

真实实现要处理原子性、相同对象、内存屏障等细节。

为什么要先 retain 新值，再 release 旧值？

考虑这种场景：

```objc
self.name = self.name;
```

如果先 release 旧值，可能把对象释放掉，再 retain 就危险了。先 retain 新值可以保证赋值过程对象活着。

## 3. 引用计数存在哪里？

引用计数不是简单存在对象旁边的一个 int。

现代 Runtime 采用分层策略：

```text
第一层：non-pointer isa 的 extra_rc
第二层：SideTable 的 RefcountMap
```

### 3.1 为什么不全部放 SideTable？

SideTable 是全局表，需要哈希、查表、加锁。retain/release 极其高频，如果每次都访问 SideTable，会有锁竞争和性能损耗。

所以常见对象的小引用计数直接放在 isa 位域里。

### 3.2 什么时候用 SideTable？

- isa 中 extra_rc 溢出，引用计数存不下。
- 对象被 weak 引用（存到 SideTable 的 weak_table）。
- 某些复杂 Runtime 状态。

SideTable 是 Runtime 的“外部仓库”，只在对象头装不下或需要全局映射时使用。

> 注意：关联对象（Associated Object）**不在 SideTable**，它存在全局独立的 `AssociationsManager`（内部是 `AssociationsHashMap`）。SideTable 里只有引用计数表 `refcnts` 和弱引用表 `weak_table`，不含关联对象。

## 4. SideTable 是什么？

可以简化理解：

```cpp
struct SideTable {
    spinlock_t slock;
    RefcountMap refcnts;
    weak_table_t weak_table;
};
```

它包含三类能力：

- 锁：保护表结构。
- 引用计数溢出表。
- weak 引用表。

### 为什么 SideTable 要分段？

如果全 App 所有对象共用一张表和一把锁，多线程 retain/release/weak 操作会严重竞争。

Runtime 使用类似 StripedMap 的分段策略，根据对象地址哈希到不同 SideTable，降低锁竞争。

这和 ConcurrentHashMap 分段锁思想类似：不是完全无锁，而是降低同一把锁的争用概率。

## 5. weak 为什么能自动置 nil？

weak 的本质不是“不 retain”这么简单。

weak 赋值时，Runtime 会把“weak 指针变量的地址”登记到 weak 表里。

例如：

```objc
__weak id weakObj = obj;
```

Runtime 需要记录：

```text
obj -> [&weakObj1, &weakObj2, &weakObj3]
```

对象释放时，Runtime 根据对象地址找到所有 weak 指针变量地址，然后逐个写 nil。

流程：

```mermaid
flowchart TD
    A["__weak id w = obj"] --> B["objc_storeWeak"]
    B --> C["根据 obj 地址找到 SideTable"]
    C --> D["weak_table 记录 weak 变量地址"]
    E["obj dealloc"] --> F["判断 weakly_referenced"]
    F --> G["查 weak_table"]
    G --> H["把所有 weak 指针置 nil"]
    H --> I["清理 weak 表记录"]
```

所以 weak 的成本包括：

- 注册 weak。
- 查 SideTable。
- 加锁。
- 对象释放时清理 weak 表。

这也是为什么 Runtime 会在 isa 里放 `weakly_referenced` 标记：如果对象从没被 weak 引用，dealloc 时可以跳过 weak 表清理。

## 6. weak 和 unsafe_unretained 的区别

`weak`：

- 不持有对象。
- 对象释放后自动置 nil。
- Runtime 维护 weak 表。

`unsafe_unretained`：

- 不持有对象。
- 对象释放后不置 nil。
- 可能变成野指针。

所以 unsafe_unretained 没有 weak 的注册、查表和清理开销，成本更低，但失去自动置 nil 保护，风险高。现代业务代码很少需要它。

## 7. AutoreleasePool 底层不是一个普通数组

AutoreleasePool 底层由 `AutoreleasePoolPage` 组成。

可以理解成双向链表页：

```text
AutoreleasePoolPage <-> AutoreleasePoolPage <-> AutoreleasePoolPage
```

关键量化细节（高频追问点）：

- 每个 page 大小是一个虚拟内存页，即 **4096 字节**。
- page 头部约 **56 字节**，存 magic、next（下一个可用位置）、thread、parent、child 等。
- 剩余空间按指针顺序存 autorelease 对象。
- `hotPage` 指当前正在使用的 page。

当执行：

```objc
@autoreleasepool {
    id obj = [[[NSObject alloc] init] autorelease];
}
```

大致发生：

1. push 一个边界哨兵 `POOL_BOUNDARY`（值为 nil，旧称 POOL_SENTINEL），返回它的地址作为 pool token。
2. autorelease 对象指针不断压入当前 page，存满了就新建 page 链到链表后面。
3. pool 结束时拿 token 做 pop，从栈顶一直 release 到该 `POOL_BOUNDARY`。
4. 对边界内所有对象发送 release。

## 8. autorelease 对象为什么不立即释放？

典型场景：

```objc
- (NSString *)name {
    return [NSString stringWithFormat:@"user-%@", self.userId];
}
```

调用方拿到返回值后还要继续用。如果方法内部创建完就立刻 release，返回值就悬空了。

autorelease 解决的是：

> 让对象跨过当前方法作用域继续存活一小段时间，同时不要求调用方手动 release。

它是在生命周期正确性和性能之间的折中。

## 9. AutoreleasePool 和 RunLoop 的关系

主线程 RunLoop 会自动管理 autorelease pool。

可以简化理解：

```text
RunLoop 进入 -> push pool
处理事件 -> 产生 autorelease 对象
RunLoop 即将休眠/退出 -> pop pool，批量 release
```

所以很多 autorelease 对象会在一次 RunLoop 迭代后释放。

但注意：不是所有 autorelease 都一定等到 RunLoop 后才释放。你手动写：

```objc
@autoreleasepool {
    // 临时对象
}
```

作用域结束就会 drain。

## 10. 为什么循环里要手动加 autoreleasepool？

例如：

```objc
for (int i = 0; i < 100000; i++) {
    NSString *s = [NSString stringWithFormat:@"%d", i];
    // do something
}
```

如果这些临时对象都进入外层 pool，它们会堆到本轮 RunLoop 结束才释放，内存峰值会很高。

优化：

```objc
for (int i = 0; i < 100000; i++) {
    @autoreleasepool {
        NSString *s = [NSString stringWithFormat:@"%d", i];
        // do something
    }
}
```

这不是为了防泄漏，而是降低内存峰值。

## 11. 对象 dealloc 时发生什么？

对象释放不是简单 free。

大致流程：

1. 引用计数归零。
2. 标记 deallocating。
3. 调用 `dealloc`。
4. 调用 C++ 析构或 `.cxx_destruct`，释放强引用 ivar。
5. 如果有关联对象，清理关联对象表。
6. 如果被 weak 引用，清理 weak 表并置 nil。
7. 回收对象内存。

isa 里的标记位可以帮助 Runtime 快速跳过不需要的步骤。

例如：

- `has_assoc == 0`：不用查关联对象。
- `weakly_referenced == 0`：不用查 weak 表。
- `has_cxx_dtor == 0`：不用走 C++ 析构路径。

## 12. 高频追问

### Q1：ARC 和 GC 的区别？

ARC 是编译期插入引用计数管理代码，释放时机相对确定。GC 是运行时扫描对象图，判断哪些对象不可达再回收。

iOS 使用 ARC，不使用传统 GC。

### Q2：weak 自动置 nil 的底层？

weak 赋值时 Runtime 把 weak 变量地址注册到 weak_table。对象 dealloc 时根据对象地址找到所有 weak 变量地址，逐个置 nil 并清理表。

### Q3：autoreleasepool 解决什么问题？

解决返回值跨作用域存活和临时对象批量释放问题。它不是泄漏修复工具，而是延迟释放和控制内存峰值的机制。

### Q4：为什么 `__block` 不能替代 weak？

`__block` 解决 Block 内修改外部变量的问题。ARC 下 `__block` 对对象仍可能强持有，不能自动打破循环引用。打破循环引用要用 `__weak` 或重新设计持有关系。

### Q5：weak 有性能成本吗？

有。weak 需要 Runtime 注册、查表、加锁和 dealloc 清理。一般业务不用过度担心，但在极高频对象上要知道它不是零成本。

## 13. 工程排查方法

### 泄漏排查

重点看：

- Block 捕获 self。
- Timer / CADisplayLink。
- Notification。
- delegate 是否 strong。
- 单例缓存。
- 异步回调持有页面。

工具：

- Xcode Memory Graph。
- Instruments Leaks。
- Allocations。
- 自定义 dealloc 日志。

### 内存峰值排查

重点看：

- 大图解码。
- 循环临时对象。
- JSON 大对象。
- autorelease 对象堆积。
- WebView / PDF / 视频。

泄漏和峰值不是一回事。泄漏是对象不释放，峰值是对象晚释放或一次性占用太高。

## 易错点

- 把 ARC 说成 Runtime 自动回收。
- 认为 weak 只是 assign。
- 认为 autorelease 一定在函数结束释放。
- 忽略 autoreleasepool 对内存峰值的控制价值。
- 用 `__block` 解决循环引用。


## 深挖追问：ARC 不是魔法，是编译器插 retain/release

ARC 的高分回答要避免“自动管理内存”这种空话。更准确：

> ARC 是 Clang 在编译期根据所有权规则插入 retain、release、autorelease、storeStrong、storeWeak 等调用；Runtime 提供引用计数、weak 表和 autoreleasepool 支撑。

被问到优化时，可以提两个 Runtime/编译器协作点：

1. `objc_retainAutoreleasedReturnValue` / `objc_autoreleaseReturnValue`：调用方和被调方配合，避免返回值先 autorelease 再 retain 的无谓开销。
2. `objc_storeStrong`：strong 赋值不是简单指针替换，而是 retain 新值、release 旧值，并处理自赋值和异常边界。

weak 深挖：

```text
storeWeak
  -> 加 SideTable 锁
  -> 如果旧对象存在，从旧对象 weak_entry 移除 referrer
  -> 如果新对象可 weak 引用，登记当前 weak 变量地址
  -> 如果新对象正在 dealloc，写 nil 或触发安全处理
```

weak 读也不是裸读。Runtime 要避免你读到一个正在释放的对象，所以 weak load 往往会临时 retain/autorelease 或走安全读取路径。这就是 weak 比 unsafe_unretained 贵的原因。

AutoreleasePool 深挖：

- 它不是一个普通数组，而是按 page 链接的栈式结构。
- push 时放哨兵 token。
- autorelease 对象把指针压入当前 page。
- pop 到 token 时，对 token 之后的对象逐个 release。
- 主线程 RunLoop 在进入和休眠前后维护 pool，保证一次事件循环产生的临时对象能被释放。

面试陷阱：

- autorelease 不等于泄漏，只是延迟 release。
- 循环里大量临时对象需要局部 `@autoreleasepool` 降峰值。
- weak 自动置 nil 发生在对象内存回收前，否则 referrer 地址就无法安全写 nil。
- dealloc 里不要让对象“复活”，也不要做复杂异步逻辑。

## 一句话总结

ARC 是编译器负责插入内存管理语义，Runtime 用 isa 和 SideTable 管引用计数与 weak，AutoreleasePoolPage 负责延迟批量释放对象。
