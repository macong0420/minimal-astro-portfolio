---
title: "iOS 内存管理：引用计数存储与 Weak 实现"
description: ""
publishedAt: 2025-11-20
tags:
  - "iOS"
  - "面试"
---

## 1. 引用计数的存储策略

iOS 并不只是用一个简单的整数变量存储引用计数，而是分了三种情况：

1.  **Tagged Pointer**：
    - 针对小对象（如 NSNumber, NSDate）。
    - 指针本身就包含值，**没有** 引用计数（或者说不需要管理），内存分配在栈上或代码段，不走 malloc/free。

2.  **isa.extra_rc**：
    - 大多数普通对象。
    - 引用计数直接存储在 isa 指针的位域中（19位）。

3.  **SideTables**：
    - 当 `extra_rc` 溢出（引用计数过大）时，一半保留在 isa，另一半转移到全局的哈希表 `SideTables` 中。

## 2. SideTables 结构

`SideTables` 是一个全局的哈希映射（StripeMap），包含 64 个 `SideTable` 结构（为了分段锁，提高并发效率）。

```cpp
struct SideTable {
    spinlock_t slock;        // 自旋锁
    RefcountMap refcnts;     // 引用计数表 (Map<Object*, count>)
    weak_table_t weak_table; // Weak 引用表
};

```


## 3. Weak 引用底层实现 (Deep Dive)

Weak 指针具有 "对象销毁时自动置 nil" 的特性。

### 3.1 数据结构

- **weak\_table\_t**：全局 Weak 表。

- **weak\_entry\_t**：某个对象对应的所有 weak 指针集合（类似一个数组）。

### 3.2 初始化 (storeWeak)

当 \_\_weak obj = target 执行时：

- 调用 objc\_storeWeak(\&obj, target)。

- 从 SideTables 中找到 target 对应的 SideTable。

- 取出 weak\_table。

- 以 target 为 key，查找或创建 weak\_entry\_t。

- 将 \&obj (指针的地址) 添加到 entry 数组中。

### 3.3 销毁流程 (dealloc)

当对象引用计数为 0 时，触发 dealloc -> \_objc\_rootDealloc：

- 检查 isa.weakly\_referenced。如果为 false，直接释放内存。

- 如果为 true，调用 object\_dispose -> objc\_destructInstance -> clearDeallocating。

- **clearDeallocating 核心逻辑**：

  - 获取对应的 SideTable 加锁。

  - 在 weak\_table 中找到该对象的 entry。

  - **遍历 entry 中所有的指针地址（weak ptr address），将它们指向的内容置为 nil**。

  - 从表中移除 entry。

  - 释放对象内存。