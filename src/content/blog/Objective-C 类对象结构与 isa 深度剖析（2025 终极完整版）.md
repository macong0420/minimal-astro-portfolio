---
title: "Objective-C 类对象结构与 isa 深度剖析（2025 终极完整版）"
description: "熟悉 objc-runtime 源码、ARM64 汇编、指针位操作"
publishedAt: 2025-11-20
tags:
  - "iOS"
  - "面试"
  - "Runtime"
  - "底层原理"
---



![header](https://raw.githubusercontent.com/macong0420/Image/main/20251120162430504.png)

> **阅读门槛**：熟悉 objc-runtime 源码、ARM64 汇编、指针位操作
> **当前日期**：2025-11-20
> **原则**：原文档 100% 保留，所有代码、表格、原话一句不删，仅补充更狠的细节 + 精准插图

---

# 第一部分：宏观架构与对象模型

在深入底层之前，我们需要先构建上帝视角，理解 OC 对象世界的运行法则。

## 1.1 基本概念与对象分类

在 Objective-C 中，万物皆对象，对象分为三类：

1.  **实例对象（Instance Object）**：通过 alloc/init 创建的对象。
2.  **类对象（Class Object）**：描述实例对象的对象（单例）。
3.  **元类对象（Meta-class Object）**：描述类对象的对象（单例）。

它们的底层结构在 `objc-runtime-new.h` 中定义为 `objc_class` 结构体。

## 1.2 经典 isa + superclass 指向图（必背！）

这是 Runtime 的基石，请务必印在脑海里。

![isa flow chart 1](https://yx61ee29nhc.feishu.cn/space/api/box/stream/download/asynccode/?code=MzRkYzNkYmM5ZTFhZjhhYmEyNDgzYWQ1MTcxYjg4NDlfRGRBN0I3amNtQ3VyejNjMkhwbUx3WW83dGw5SnY5OExfVG9rZW46SVF3WmJRczRTb2VPdjV4czhCVmNlRFVVbmJiXzE3NjM2MjY5Mjk6MTc2MzYzMDUyOV9WNA)

![isa flow chart 2](https://yx61ee29nhc.feishu.cn/space/api/box/stream/download/asynccode/?code=MGQ2NDljMGU1NjdlYzc1YWE0Y2ZiZWIxNGJjOThiYjNfbmN1Tkx0WFJYWTlqb1ozUnliZkdzT1Q0bjNSQUpQeUFfVG9rZW46RFNtRWJZWE1Fb3lucFN4UUNnQ2NCdmd4bnFlXzE3NjM2MjY5Mjk6MTc2MzYzMDUyOV9WNA)

![isa flow chart 3](https://yx61ee29nhc.feishu.cn/space/api/box/stream/download/asynccode/?code=YmQ2NDZmZTcwZTVmNzgwZjIyZDFlNDJkNTk5MzNhZDRfYWVDbEtwc0FLbmlHQWFFTEVnb2VSbXNzUUNsVTNFeUNfVG9rZW46T01ZY2JtdWNLb3U3eFd4MzBIcGM5eGk0bmdOXzE3NjM2MjY5Mjk6MTc2MzYzMDUyOV9WNA)

### isa 链（Chain of Identity）完整规则
1.  实例对象 isa → 类对象
2.  类对象 isa → 元类对象
3.  元类对象 isa → 根元类对象
4.  **根元类 isa → 指向自己（形成闭环）**

### superclass 链
1.  类对象 superclass → 父类对象
2.  元类对象 superclass → 父元类对象
3.  **根元类 superclass → 根类 NSObject**（保证类方法能回退到 NSObject 实例方法）

### 深度剖析：为什么要设计元类？
> **【Why】设计哲学**

* **统一消息机制（Uniformity）**：
    * **设计目标**：复用 `objc_msgSend` 逻辑。
    * **实现**：无论是调用 `[obj method]` 还是 `[Class method]`，底层逻辑完全一致——**“找 isa 指向的结构体，查 cache 和方法列表”**。类方法本质上就是“元类的实例方法”。
* **根元类的特殊闭环**：
    * **现象**：根元类的 `superclass` 指向根类（NSObject）。
    * **意义**：这是一个兜底机制。当调用一个不存在的类方法时，查找链会回退到 NSObject 的实例方法中。这解释了为什么类对象可以响应 `respondsToSelector:` 或 `retain` 等实例方法。

---

# 第二部分：类对象的微观结构

有了宏观视角，我们拆解核心结构体 `objc_class`。

## 2.1 objc_class 结构体详解

```cpp
struct objc_class : objc_object {    
    isa_t isa;              // 指向元类对象（实例中指向类对象）  
    Class superclass;       // 指向父类对象    
    cache_t cache;          // 方法缓存    
    class_data_bits_t bits; // 类的核心数据（方法列表、属性、协议等） 
  
    class_rw_t *data() { return bits.data(); }
};
````

### 核心字段解析

1. **isa**：连接实例、类、元类的纽带。

2. **superclass**：定义继承关系。

3. **cache\_t（方法缓存）**

   C++

   ```
   struct cache_t {   
       bucket_t *_buckets;   // 方法缓存数组   
       mask_t _mask;         // 哈希掩码    
       mask_t _occupied;     // 已占用槽位数
   };
   ```

   - **查找流程**：先查 cache（O(1)），找不到再查方法列表（O(n)）。

   - > **【Why】架构思考：为什么 cache\_t 放在结构体的前面？**

     - **局部性原理（Locality）**：`objc_msgSend` 的汇编指令中，读取完 `isa` 紧接着就要读取 `cache`。将它们物理内存相邻，能利用 CPU 的 L1 Cache Line，减少内存访问延迟（Cache Miss）。

     - **开放寻址法（Open Addressing）**：OC 使用开放寻址而非链地址法，因为连续内存对 CPU 预取（Prefetching）更友好，速度极快。

4. **class\_data\_bits\_t bits**

   - 利用指针对齐的低位存标志位，高位存 `class_rw_t*` 真实地址（通过 `FAST_DATA_MASK` 提取）。

## 2.2 class\_data\_bits\_t：Clean vs Dirty Memory

为了极致的内存优化，Apple 将类数据拆分为两部分：

- **class\_ro\_t (Read Only)**：

  - **内容**：编译期生成，包含原始 ivars、methods、protocols。

  - **内存属性**：**Clean Memory**。存放在 Mach-O 只读段，可被多个 App 进程共享，被 Page Out 后无需回写磁盘。
- **class\_rw\_t (Read Write)**：

  - **内容**：运行时生成（RealizeClass），包含 `ro` 的拷贝 + Category 的方法/属性。

  - **内存属性**：**Dirty Memory**。进程独占，内存开销大。

> 【Why】架构思考：为什么拆分 ro 和 rw？
>
> 内存优化：绝大多数类在运行时不会动态修改。Apple 推迟 rw 的创建，或仅在需要时（如动态添加方法、Category 合并）才创建，极大降低了系统整体的内存足迹（Memory Footprint）。

***

# 第三部分：Isa 指针的极致压榨 (核心)

`isa` 不再只是一个单纯的指针，它是 Apple **空间换时间**哲学的巅峰之作。我们将结合 Tagged Pointer 一起理解这种“指针即数据”的设计。

## 3.1 isa\_t 位域结构（ARM64 Non-pointer isa）

Apple 从 64 位时代引入 Non-pointer isa，不再是纯指针，而是位域，利用 64 位指针的冗余位存元数据。

**最新 ARM64 位分布（iOS 17+/macOS 14+，含 PAC 影响）**：

| **位域**                 | **位范围** | **含义**        | **深度解析 (Why?)**                                             |
| ---------------------- | ------- | ------------- | ----------------------------------------------------------- |
| **nonpointer**         | 0       | 0=纯指针, 1=开启优化 | 必须为1，标记这是位域优化过的 isa。                                        |
| **has\_assoc**         | 1       | 是否有关联对象       | **去配优化**：如果为 0，dealloc 时直接跳过清理关联对象的步骤。                      |
| **has\_cxx\_dtor**     | 2       | 是否有 C++ 析构函数  | **去配优化**：如果为 0，跳过 .cxx\_destruct 调用。                        |
| **shiftcls**           | 3\~35   | **类对象真实地址**   | **空间压缩**：33 位足够存储类地址，利用指针对齐的低位和未用的高位存状态。(arm64e 会额外 PAC 签名) |
| **magic**              | 36\~41  | 魔数 0x3B       | **安全调试**：用于检测野指针或缓冲区溢出攻击。                                   |
| **weakly\_referenced** | 42      | 是否有弱引用        | **去配优化**：如果为 0，dealloc 时跳过 WeakTable 的加锁查找和置 nil 操作。        |
| **deallocating**       | 43      | 是否正在 dealloc  | 状态标记。                                                       |
| **has\_sidetable\_rc** | 44      | 引用计数是否溢出      | **分层存储**：配合 extra\_rc 使用，溢出时才查 SideTable。                   |
| **extra\_rc**          | 45\~63  | 引用计数-1        | **性能核心**：19 位，最多存约 52 万。绝大多数对象的 RC 很小，存这里无需锁竞争，原子操作即可完成。    |

## 3.2 另一种“Isa”：Tagged Pointer 特殊优化

有些对象甚至连 `isa` 都不需要指向堆内存，比如 `NSNumber`。

### A. 核心颠覆：它不是指针，它就是值

- **普通对象**：你去酒店前台（指针），前台给你一张房卡（地址），你拿房卡去房间（堆内存）里拿东西。

- **Tagged Pointer**：你去酒店前台，前台直接把东西塞你手里了。根本没有房间。

### B. 内存结构对比 (ARM64)

- **Non-pointer isa**：虽然是位域，但 `shiftcls` 确实指向堆内存。

- **Tagged Pointer**：利用 64 位指针的**最高位 (MSB)** 标记。

  - **`0xb00000000000000a` (示例: NSNumber 存 10)**

  - **63位**：1 (标志位)。

  - **60-62位**：Tag Index (类标识，如 3 表示 NSNumber)。

  - **0-55位**：Payload (真实数值，直接存 10)。

### C. 灵魂拷问：如果它没有 isa，怎么调用方法？

Runtime 在 `objc_msgSend` 时会进行特殊判断：

1. **检查标志位**：发现是 Tagged Pointer。

2. **提取 Tag Index**：从指针中提取类标识。

3. **查表**：从 `objc_tag_classes` 全局数组中获取对应的类对象（如 NSNumber 类）。

4. **伪装**：后续流程和普通对象一样，模拟出它有 isa 的行为。

### D. NSNumber 优化细节

`NSNumber` 利用 **Extended Tag** 区分数据类型：

- 存 `char`：Payload 存 char。

- 存 `int`：Payload 存 int。

- **自动降级**：当数值太大，56 bits 存不下时，会自动降级为普通堆对象。

***

# 第四部分：内存管理系统的分层设计

了解了 `isa`，我们来看看 Runtime 如何利用 `isa` 和 `SideTable` 配合，构建高效的内存管理系统。

## 4.1 引用计数：双层存储策略

引用计数并不只存在一个地方，而是分层处理：

1. **第一层：extra\_rc (isa)**

   - **优势**：极快，CPU 寄存器级别的原子操作。

   - **场景**：满足 99% 的普通对象引用计数需求。
2. **第二层：SideTable (溢出处理)**

   - 当 `extra_rc` 满位（19位，约52万）时，一半的值会搬运到全局 `SideTable` 中的 `RefcountMap`，并将 `has_sidetable_rc` 置为 1。

## 4.2 SideTable 深度详解——Runtime 的"外部仓库"

`SideTable` 是 Runtime 应对复杂情况的兜底方案。

### A. 宏观架构：StripedMap（分段哈希映射）

系统维护了一个全局静态数组 `SideTables[8]`（iOS 真机）。

> 【Why】为什么要设计成分段数组？
>
> 解决锁竞争 (Lock Contention)。如果全 App 只有一个表，所有线程操作对象都要抢同一把锁。分段锁设计让不同哈希槽位的对象操作并行，锁竞争降低 87.5%。

### B. 微观结构

C++

```
struct SideTable {
    spinlock_t slock;           // 1. 锁 (保护整个 Table)
    RefcountMap refcnts;        // 2. 引用计数溢出表
    weak_table_t weak_table;    // 3. 弱引用表
};
```

### C. 深度场景：弱引用 (Weak Reference)

这是面试必问的 **Weak 原理**。当 `isa.weakly_referenced` 为 1 时，说明数据存在 `SideTable` 的 `weak_table` 中。

**销毁流程 (Dealloc) 中 Weak 的处理**：

1. 通过对象地址找到对应的 `SideTable`。

2. 加锁 `slock`。

3. 在 `weak_table` 中查找该对象对应的 `weak_entry_t`（存放了所有指向该对象的 weak 指针地址数组）。

4. **遍历数组，将所有 `*referrer = nil`**。

5. 解锁。

## 4.3 dealloc 的极致性能优化

Apple 利用 `isa` 位域实现了 Dealloc 的**快速通道**。

### 快速通道 (Fast Path)

Objective-C

```
// 真正的零成本释放
if (isa.nonpointer && 
    !isa.weakly_referenced && // 没有弱引用
    !isa.has_assoc &&         // 没有关联对象
    !isa.has_cxx_dtor &&      // 没有C++析构
    !isa.has_sidetable_rc) {  // 引用计数没溢出
    
    free(this); // 直接释放内存！
    return;
}
```

> **【Why】**：绝大部分对象符合此条件，仅需一次位运算检查（AND 指令），耗时 1-2 个时钟周期。

### 慢速通道 (Slow Path)

任意标志位为 1，则进入慢速流程：

1. 清理关联对象（AssociationsManager）。

2. 清理弱引用表（SideTable.WeakTable）。

3. 调用 C++ 析构。

4. 处理引用计数溢出。

***

# 第五部分：Runtime 运行机制与高级特性

## 5.1 方法查找与缓存

- **查找顺序**：

  - 实例方法：cache → 本类方法列表 → superclass 链 → NSObject

  - 类方法：元类 cache → 元类方法列表 → 父元类 → 根元类 → **根类 NSObject 的实例方法列表**

## 5.2 Category 方法"覆盖"原理

- **机制**：运行期把 Category 方法列表**插入到最前面**（memmove 原列表后移）。

- **真相**：原方法并未丢，只是顺序变后。`objc_msgSend` 查找时优先命中 Category 方法，造成"覆盖"假象。

- **注意**：多个 Category 顺序由编译顺序决定，未定义。

## 5.3 关联对象（Associated Objects）

- **存储**：不在对象内存里，而是在全局 `AssociationsManager` 的 HashMap 中。

- **标识**：`isa.has_assoc=1` 用于快速判断对象释放时是否需要清理关联对象。

***

# 第六部分：面试终极答题策略与记忆法

最后，我们将所有知识点浓缩，助你面试通关。

## 6.1 核心记忆法：Isa 就是一个"智能背包"

面试时脑海中要有这个比喻：

- **32位时代**：Isa 是\*\*"纸条"\*\*（只存地址）。

- **64位时代**：Isa 是\*\*"背包"\*\*（既有地址，又有口袋存状态）。

### 三区记忆法 (一证、两数、两灯)

1. **一张证 (`shiftcls`)**：**类地址**。拿到它才知道我是谁。

2. **两个数 (引用计数)**：

   - **`extra_rc`**：**背包自带**的计数器（快）。

   - **`has_sidetable_rc`**：**仓库借条**。背包满了，去外面的 `SideTable` 查。

3. **两盏灯 (清理优化)**：

   - **`weakly_referenced`**：有没有 **Weak** 指向我？(红灯亮=死得慢，要去查表置 nil)

   - **`has_assoc`**：有没有 **关联对象**？(红灯亮=死得慢，要清理 HashMap)

   - **灯全灭**：**Dealloc 极速释放**。

## 6.2 面试必备要点（直接背）

1. **先画图**：isa + superclass 全图（本文 1.2 节）。

2. **讲结构**：`objc_class` 的四个字段，重点区分 `ro` (Clean) 和 `rw` (Dirty)。

3. **讲 Isa**：Non-pointer isa 的 64 位分布，重点讲 `extra_rc` 和 `shiftcls`。

4. **讲内存**：引用计数的分层存储（isa -> SideTable）+ Weak 指针自动置 nil 原理。

5. **讲特例**：Tagged Pointer 如何利用高位标记和 Payload 存值，不走 isa 逻辑。

6. **升华**：**"这就是 Apple 空间换时间 + 分层处理（Fast Path / Slow Path）的极致哲学。"**