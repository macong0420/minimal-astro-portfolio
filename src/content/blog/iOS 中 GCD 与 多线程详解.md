---
title: "iOS 中 GCD 与 多线程详解"
description: "iOS 的多线程开发主要依赖 **Grand Central Dispatch (GCD)**，这是一个由 Apple 提供的框架（从 iOS 4 开始引入），它简化了并发编程。GCD 不是直接管理线程，而是通过“任务”（block 或 closure）提交到队列，由系统调度执行。下面我用通俗比喻（像“餐厅订单系统”）来解释每个概念，好记又易懂。每个部分我会先给核心定义、原理，再举代码示例和注意点。基于 2025 年 iOS 19+ 的最新实践，这些机制稳定，没大变化。"
publishedAt: 2025-11-28
tags:
  - "iOS"
  - "GCD"
---


***

### 一、 核心世界观：线程 vs 队列

在深入 GCD 之前，必须厘清两个层面的概念：
![Gemini Generated Image (7).png](https://raw.githubusercontent.com/macong0420/Image/main/20251128163905770.png)

1. **操作系统层面 (Kernel & Hardware)**：

   - **线程 (Thread)**：CPU 调度的基本单位。创建、销毁、上下文切换（Context Switch）都有昂贵的系统开销（寄存器保存、栈切换、内核态用户态切换）。

   - **多线程痛点**：如果开启 1000 个线程，CPU 大部分时间都在做上下文切换，而不是执行代码。
2. **GCD 层面 (User Space Library - libdispatch)**：

   - **队列 (Queue)**：开发者用来组织任务的管道。

   - **任务 (Block)**：一段要执行的代码闭包。

   - **GCD 的魔法**：GCD 维护了一个**线程池 (Thread Pool)**。它根据系统的负载（CPU 核数、内存占用），自动把队列里的任务分配给线程池中的线程去执行。

   - **结论**：**Queue $\\neq$ Thread**。你只管把任务丢进队列，GCD 负责决定用哪个线程。

***

### 二、 GCD 的原子概念：同步/异步 & 串行/并发

这是面试和实战中最容易混淆的地方，必须用“行为”来定义：

#### 1. 任务的执行方式 (Function)

决定了**是否开启新线程**，以及**是否阻塞当前线程**。

- **同步 (`dispatch_sync`)**：

  - **不**具备开启新线程的能力。

  - **阻塞**当前线程，直到 Block 执行完毕，代码才能继续往下走。

  - *隐喻：你亲自去送信，送不到不回来。*
- **异步 (`dispatch_async`)**：

  - **具备**开启新线程的能力（但不一定非要开，看队列类型）。

  - **不阻塞**当前线程，不用等 Block 执行完，代码直接往下走。

  - *隐喻：你找了个快递员送信，你转头就去干别的事了。*

#### 2. 队列的类型 (Queue)

决定了**任务的执行顺序**。

- **串行队列 (Serial Queue)**：

  - 一次只拿出一个任务执行，执行完这个才能拿下一个。

  - *特点：严格有序，线程安全（单一线程访问）。*
- **并发队列 (Concurrent Queue)**：

  - 可以同时拿出多个任务执行。

  - *特点：执行顺序不可预测，效率高，但需注意线程安全。*

***

### 三、 深度排列组合与死锁 (OC 实例)

#### 1. 经典的“死锁” (Deadlock)

**场景**：在主线程中，同步向主队列添加任务。



```objc
- (void)deadlockExample {
    NSLog(@"1");
    // 获取主队列（这是一个串行队列）
    dispatch_queue_t mainQueue = dispatch_get_main_queue();
    
    // ❌ 崩溃/死锁发生处
    dispatch_sync(mainQueue, ^{
        NSLog(@"2");
    });
    
    NSLog(@"3");
}
```

**深刻解析**：

- **主队列是串行队列**：意味着任务必须一个接一个做。当前正在执行 `deadlockExample` 这个任务。

- **dispatch\_sync**：意味着“把 Block 里的任务插队进来，并且**我要立刻等到它执行完**我才继续往下走”。

- **矛盾**：主队列说：“你不执行完 `deadlockExample`，我没法腾出资源执行 Block”；`dispatch_sync` 说：“你不执行完 Block，我不让 `deadlockExample` 继续”。

- **结果**：互相等待，死锁。

#### 2. 异步 + 串行 (Async + Serial)

**场景**：保证顺序，但不阻塞当前线程。

```objc
- (void)serialAsync {
    // 创建串行队列
    dispatch_queue_t queue = dispatch_queue_create("com.demo.serial", DISPATCH_QUEUE_SERIAL);
    
    for (int i = 0; i < 5; i++) {
        dispatch_async(queue, ^{
            NSLog(@"任务 %d - 线程: %@", i, [NSThread currentThread]);
        });
    }
}
```

底层行为：

GCD 会开启一条新线程（因为是异步，所以能开；因为是串行，所以只开一条够用了），任务严格按 0,1,2,3,4 顺序执行。

#### 3. 异步 + 并发 (Async + Concurrent)

**场景**：火力全开，效率最高。


```objc
- (void)concurrentAsync {
    dispatch_queue_t queue = dispatch_queue_create("com.demo.concurrent", DISPATCH_QUEUE_CONCURRENT);
    
    for (int i = 0; i < 5; i++) {
        dispatch_async(queue, ^{
            NSLog(@"任务 %d - 线程: %@", i, [NSThread currentThread]);
        });
    }
}
```

底层行为：

GCD 会开启多条新线程（具体几条由 OS 决定）。任务开始顺序大致是 0,1,2,3,4，但结束顺序不确定。

***

### 四、 进阶：GCD 的高级调度 (Barrier & Group)

#### 1. 读写分离锁 (The Reader-Writer Lock) - `dispatch_barrier`

这是 GCD 解决“多读单写”线程安全问题的优雅方案。

- **需求**：读取数据可以并发（快），写入数据必须互斥（安全）。


```objc
@interface SafeDictionary : NSObject
@property (nonatomic, strong) NSMutableDictionary *dict;
@property (nonatomic, strong) dispatch_queue_t concurrentQueue;
@end

@implementation SafeDictionary

- (instancetype)init {
    self = [super init];
    _dict = [NSMutableDictionary dictionary];
    // 必须自己创建并发队列
    _concurrentQueue = dispatch_queue_create("com.demo.rw_queue", DISPATCH_QUEUE_CONCURRENT);
    return self;
}

// 读取：并行 (Read)
- (id)objectForKey:(NSString *)key {
    __block id obj;
    // 使用 sync 是为了立刻拿到返回值，但在并发队列中，多个读操作可以同时进行
    dispatch_sync(self.concurrentQueue, ^{
        obj = self.dict[key];
    });
    return obj;
}

// 写入：栅栏 (Write)
- (void)setObject:(id)obj forKey:(NSString *)key {
    // 栅栏函数：它执行时，队列里其他的任务（包括读和其他写）都被挡住，它是唯一执行者
    dispatch_barrier_async(self.concurrentQueue, ^{
        self.dict[key] = obj;
    });
}
@end
```

**原理**：`barrier` 就像一个关卡。当队列执行到 barrier block 时，它会等待前面所有的并发任务完成，然后**独占**执行 barrier block，执行完后，再恢复后面的并发执行。

#### 2. 任务依赖与通知 - `dispatch_group`

**场景**：先并发下载 3 张图片，等 3 张都下载完了，再合成一张大图。

```objc
- (void)groupExample {
    dispatch_group_t group = dispatch_group_create();
    dispatch_queue_t queue = dispatch_get_global_queue(0, 0);
    
    // 任务 A
    dispatch_group_enter(group);
    dispatch_async(queue, ^{
        NSLog(@"下载图片 A");
        dispatch_group_leave(group);
    });
    
    // 任务 B
    dispatch_group_enter(group);
    dispatch_async(queue, ^{
        NSLog(@"下载图片 B");
        dispatch_group_leave(group);
    });
    
    // 汇总通知
    dispatch_group_notify(group, dispatch_get_main_queue(), ^{
        NSLog(@"所有图片下载完毕，合成大图");
    });
}
```

***

### 五、 深刻：从 Kernel (XNU) 视角看 GCD

要理解“深刻”，必须往下挖到内核层。

#### 1. 线程池的本质：Workqueues

GCD 的底层并不直接操作 `pthread_create` 来频繁开关线程。它依赖于 XNU 内核提供的 **Workqueue** 机制。

- 当用户态的 GCD 队列中有任务时，它会请求内核。

- 内核的 `workqueue` 子系统会维护一组线程，根据当前的 CPU 使用率决定是否唤醒现有线程或创建新线程。

- **优势**：这是内核级支持的线程池，避免了用户态自己管理线程池的开销。

#### 2. 优先级与 QoS (Quality of Service)

GCD 实际上将任务分级，映射到 CPU 的不同优先级。

- `User Interactive` (UI 交互，优先级最高，对应主线程)

- `User Initiated` (用户急需结果，高优先级)

- `Utility` (耗时操作，低优先级)

- `Background` (用户不可见，最低优先级，甚至可能被 IO 节流)

优先级反转 (Priority Inversion)：

如果一个高优先级的任务（如 UI）在等待一个低优先级的任务（如后台计算持有锁），GCD/内核会自动临时提升那个低优先级任务的等级，防止 UI 卡死。这就是优先级继承。

#### 3. 信号量 (Semaphore) 的内核等待

`dispatch_semaphore_wait` 是非常高效的。

- 当信号量大于 0 时，它只是简单的原子操作（减 1），不进内核，极快。

- 只有当信号量为 0 需要等待时，它才会发起系统调用，让线程进入内核态休眠（主动让出 CPU），而不是忙等（Spin Lock）。

### 六、 iOS 中的锁
 
 #### OSSpinLock 与 优先级反转 (The Trap of Speed)

`OSSpinLock` 曾被誉为 iOS 上性能最高的锁，因为它是一个**自旋锁 (Spinlock)**。

#### 1. 自旋锁的本质 (User Space)

普通的锁（如 `NSLock`, `pthread_mutex`）如果获取不到锁，线程会**进入休眠 (Sleep)**，这涉及到：

- **用户态 -> 内核态** 的切换。

- **上下文切换 (Context Switch)**：保存当前寄存器，加载别的线程寄存器。

- **开销**：这些操作非常昂贵（耗时）。

`OSSpinLock` 的逻辑是：如果锁被占用，我不睡，我在一个 `while` 循环里死循环（忙等，Busy-wait），一直问“锁好了吗？锁好了吗？”。

- **优势**：如果等待时间极短，它避免了昂贵的上下文切换，性能极高。

- **劣势**：忙等期间，CPU 是满负荷运转的（空转）。

#### 2. 致命缺陷：优先级反转 (Priority Inversion)

在 iOS 9 之前，它活得很好。但随着 iOS 系统调度算法的优化（特别是引入 QoS 后），`OSSpinLock` 发生了严重的死锁问题。

**场景复现**：

1. **低优先级线程 (Low Priority, LP)** 先获取了锁，正在执行代码。

2. **高优先级线程 (High Priority, HP)** 来了，也想获取这个锁。

3. 因为是自旋锁，**HP** 线程不会休眠，而是一直占用 CPU `while` 循环。

4. **关键点**：iOS 的调度器发现 **HP** 处于 Runnable 状态（它在忙等），于是把 CPU 时间片几乎全部分配给 **HP**。

5. **结果**：

   - **HP** 拿着 CPU 不干正事（在空转）。

   - **LP** 因为优先级低，抢不到 CPU 时间片，导致无法继续执行，也就无法释放锁。

   - **造成死锁 (Livelock)**：HP 等 LP 放锁，LP 等 CPU 时间片（被 HP 抢走了）。

> **结论**：`OSSpinLock` 在 iOS 10.0 中正式被标记为 Deprecated。

***

### 七、 os\_unfair\_lock (The Modern Hero)

苹果为了解决 `OSSpinLock` 的问题，推出了 `os_unfair_lock`（在 `` 中）。它是互斥锁，不是自旋锁。

#### 1. 为什么叫 "Unfair" (不公平)？

这涉及到锁的**唤醒策略**。

- **公平锁**：严格排队。线程 A 先来，线程 B 后来。锁释放时，一定是 A 先拿到。

- **不公平锁**：锁释放时，如果刚好有个线程 C 过来抢，内核可能会把锁直接给 C，而不是唤醒还在睡的 A。

- **优势**：唤醒沉睡的线程（A）需要上下文切换，成本高。直接给正在运行的线程（C）可以利用 **CPU 缓存 (Cache Locality)**，大幅提升吞吐量。

- **代价**：可能导致某些线程“饥饿”（迟迟抢不到锁），但在移动端这种微观场景下，性能收益远大于饥饿风险。

#### 2. 它是如何解决优先级反转的？

os\_unfair\_lock 是系统内核级的锁。当高优先级线程等待锁时，它不会忙等，而是进入内核等待。

内核机制 - 优先级继承 (Priority Inheritance)：

- 当 HP 线程被 os\_unfair\_lock 挡住时，内核识别到持有锁的是 LP 线程。

- 内核会**临时**将 LP 线程的优先级提升到和 HP 一样高。

- 这样 LP 就能拿到 CPU 时间片，尽快跑完代码释放锁。

- 锁释放后，LP 恢复原来的低优先级。


```c
#import 

os_unfair_lock_t unfairLock = &(OS_UNFAIR_LOCK_INIT);
os_unfair_lock_lock(unfairLock);
// Critical section
os_unfair_lock_unlock(unfairLock);
```

***

### 八、 @synchronized 底层实现 (The Magic & Heavyweight)

`@synchronized(obj)` 是 OC 程序员最爱用的语法糖，简单、安全，但它背后的实现相当复杂且“沉重”。我们深入 `objc4` 源码（`objc-sync.mm`）。

#### 1. 核心问题：锁存在哪里？

你随便传一个 `NSObject`，它甚至没有专门的成员变量存锁，锁怎么和对象关联起来的？

答案：全局哈希表 (StripeMap)。

系统维护了一个全局的 Hash 表，里面存着很多锁。

#### 2. 数据结构：StripeMap (条纹锁/分段锁)

系统并没有为每个对象分配一个锁（太费内存），也没有只用一个全局锁（性能太差）。而是使用了一个包含 64 个（不同系统可能不同）节点的数组，每个节点是一个链表。


```c++
// 伪代码逻辑
struct SyncList {
    SyncData *data;
    spinlock_t lock; // 用于保护链表的自旋锁
}
// 全局数组，大小通常是 16 或 64
static StripeMap sDataLists; 
```

#### 3. 核心流程 (`objc_sync_enter`)

当代码执行 `@synchronized(obj)` 时：

1. **判空**：如果 `obj` 是 `nil`，直接返回，不加锁。这就是为什么 `@synchronized(nil)` 不会崩溃但也锁不住。

2. **Hash 映射**：根据 `obj` 的内存地址，计算 Hash 值，找到 `sDataLists` 中对应的那个槽位（Stripe）。

3. **查找/创建 SyncData**：

   - 遍历该槽位的链表，看有没有已经关联 `obj` 的 `SyncData` 节点。

   - 如果有，引用计数 +1（支持递归锁）。

   - 如果没有，创建一个新的 `SyncData`，由于 `obj` 的地址存进去，并挂载一个**递归互斥锁 (recursive\_mutex\_t)**。

4. **加锁**：对 `SyncData` 中的 `mutex` 进行 `lock()`。

#### 4. 为什么说它性能较差？

- **查找开销**：每次加锁都要把 `obj` 地址 Hash，然后去全局表里遍历链表查找。

- **缓存不友好**：这种全局查找容易导致 CPU Cache Miss。

- **内部锁**：为了操作这个全局 Hash 表本身，内部还需要自旋锁来保证 Hash 表的线程安全。

#### 5. 源码级简化流程图



```
Object Pointer (0x123456) 
      ⬇
Hash Algorithm (计算哈希)
      ⬇
StripeMap Index (比如第 5 号槽位)
      ⬇
[SpinLock lock] (锁住第 5 号槽位的链表)
      ⬇
遍历链表 -> 找到/新建 (obj, recursive_mutex) 结构体
      ⬇
[recursive_mutex lock] (真正的加锁)
      ⬇
[SpinLock unlock]
      ⬇
执行你的代码块
```


#### StripeMap的底层实现
![Gemini Generated Image (9).png](https://raw.githubusercontent.com/macong0420/Image/main/20251128172200123.png)

`StripeMap` 是 `objc4` 源码中 `objc-sync.mm` 文件里的核心数据结构，它的官方定义可以被称为：**一种基于地址哈希的、条带化的、自旋锁保护的链表映射表**。

为了让你彻底理解，我们分三个层次来拆解：**设计哲学**、**数据结构**、**工作流程**。

***

### 一、 设计哲学：为什么要搞这么复杂？

当你在 Objective-C 中写 `@synchronized(obj)` 时，Runtime 面临一个巨大的难题：**把锁存在哪里？**

1. **方案 A：存在对象里**

   - 给每个 `NSObject` 增加一个 `lock` 成员变量。

   - **缺点**：太浪费！App 里成千上万个对象，真正被 `@synchronized` 锁住的可能只有几个。这会极大地增加所有对象的内存体积。
2. **方案 B：存在一个全局 Map 里**

   - 搞一个全局 `Dictionary`。

   - **缺点**：太慢！这意味着全 App 所有的 `@synchronized` 都要去抢**同一把**保护这个 Dictionary 的锁。多线程并发时，这里会成为超级瓶颈。

**方案 C：StripeMap (分段锁/条带化)** 这是 Runtime 的选择。它把“一把全局大锁”拆成了“N 把局部小锁”。

- 它不像方案 A 那样浪费内存（只存储被锁的对象）。

- 它不像方案 B 那样竞争激烈（不同的对象可能落在不同的“条带”里，互不干扰）。

***

### 二、 核心数据结构：解剖 StripeMap

请把 `StripeMap` 想象成一个**只有 64 个抽屉的柜子**（在真机上通常是 64，模拟器可能是 8 或 16）。

#### 1. 顶层结构：固定数组


```c++
// 简化后的伪代码逻辑
class StripeMap {
    enum { StripeCount = 64 }; // 条带数量，通常是 64
    struct SyncList array[StripeCount]; // 静态数组
    
    // 根据对象地址计算去哪个抽屉
    static unsigned int indexForPointer(const void *p) {
        uintptr_t addr = (uintptr_t)p;
        // 核心哈希算法：位移去零 + 取模
        return ((addr >> 5) ^ (addr >> 9)) % StripeCount; 
    }
}
```

#### 2. 中层结构：抽屉 (SyncList)

每个“抽屉”里存放着两样东西：

1. **一把自旋锁 (SpinLock)**：只为了保护当前这个抽屉里的链表操作（增删查）。

2. **一个链表头指针 (data)**：指向具体的锁数据。


```c++
struct SyncList {
    SyncData *data;  // 链表头
    spinlock_t lock; // 保护这个链表的自旋锁（极其轻量）
};
```

#### 3. 底层结构：真正的锁 (SyncData)

这才是真正存放“对象”和“递归锁”的地方。


```c++
struct SyncData {
    struct SyncData* nextData; // 指向下一个节点（链表结构）
    const void* object;        // 被锁的对象 (key)
    
    // 真正的锁！也就是 @synchronized 等待的那把锁
    recursive_mutex_t mutex;   
    
    int threadCount;           // 多少个线程在使用它
};
```

***

### 三、 完整工作流程：从 `@synchronized(obj)` 开始

假设你有两个对象 `objA` 和 `objB`，以及两个线程。

#### 场景 1：无冲突（理想情况）

1. **计算 Hash**：

   - 线程 1 对 `objA` 加锁。Runtime 算出 `objA` 对应 **第 3 号抽屉**。
2. **锁住抽屉**：

   - Runtime 获取 **第 3 号抽屉** 的 `SyncList.lock` (自旋锁)。因为操作链表非常快，这个锁持有时间极短。
3. **查找/创建**：

   - 遍历第 3 号抽屉的链表。发现是空的。

   - 创建一个新的 `SyncData` 节点，把 `objA` 和一把新的 `recursive_mutex` 存进去。

   - 把这个节点挂到链表上。
4. **解锁抽屉**：

   - 释放 **第 3 号抽屉** 的自旋锁。其他线程现在可以访问第 3 号抽屉了。
5. **真正加锁**：

   - Runtime 对 `SyncData` 里的 `mutex` (递归互斥锁) 进行 `lock()`。

   - **注意**：这才是你的代码块开始执行、别的线程会被阻塞的地方。

#### 场景 2：哈希冲突（StripeMap 的精髓）

假设 `objB` 的地址经过计算，居然也对应 **第 3 号抽屉**（虽然概率只有 1/64，但会发生）。

1. **锁住抽屉**：

   - 线程 2 想锁 `objB`。它尝试获取 **第 3 号抽屉** 的自旋锁。

   - 如果此时线程 1 刚好在第 3 号抽屉里**创建节点**（步骤 3），线程 2 会短暂忙等（Spin）。但因为步骤 3 只是内存操作，极快，所以几乎瞬间就能拿到。
2. **遍历链表**：

   - 线程 2 拿到了抽屉锁。遍历链表，发现了 `objA` 的节点，但地址不匹配。

   - 继续找，没找到。

   - 创建 `objB` 的 `SyncData` 节点，挂在 `objA` 节点的后面。
3. **解锁抽屉**：

   - 释放抽屉锁。
4. **真正加锁**：

   - 线程 2 对 `objB` 的 `mutex` 进行 `lock()`。

   - **关键点**：虽然 `objA` 和 `objB` 在同一个“抽屉”里，但它们拥有**独立的** `mutex`。所以线程 1 锁 `objA` 完全不会阻塞线程 2 锁 `objB`。它们可以并行执行！

***

### 四、 性能优化的极致：TLSCache (线程局部缓存)

你可能会问：*“每次加锁都要去查全局表、抢抽屉锁、遍历链表，这不是很慢吗？”*

没错。所以 Apple 在 `StripeMap` 之上加了一层 **TLSCache (Thread Local Storage Cache)**。

**逻辑如下**：

1. 当线程第一次锁 `objA` 时，走上面的完整流程。

2. 拿到 `SyncData` 后，Runtime 会把这个 `SyncData` 的指针偷偷存到当前线程的 **TLS（线程私有数据区）** 里。

3. **第二次锁同一个对象时**（比如递归调用，或者同一个线程短时间内多次锁）：

   - Runtime 先去读 TLS。

   - 发现：“咦，我刚才好像锁过这个 `objA`，缓存里有 `SyncData`”。

   - **直接跳过** `StripeMap` 的查找过程，直接对缓存里的 `mutex` 引用计数 +1。

   - **性能爆炸**：完全没有全局竞争，变成了纯粹的线程内部操作。

***

### 五、 StripeMap 总结（面试话术）

如果面试官问你 `@synchronized` 的 `StripeMap`，你可以这样总结：

1. **定义**：它是一个**分段锁哈希表**，用于管理对象与锁的映射关系。

2. **结构**：它包含一个固定大小（如 64）的数组，数组元素是链表。

3. **双层锁设计**：

   - 外层有 **SpinLock** 保护链表本身的增删查（极短时间的自旋）。

   - 内层有 **RecursiveMutex** 真正保护用户的代码逻辑（长时间的阻塞）。

4. **解决的问题**：通过 Hash 将竞争分散到 64 个 Bucket 中，解决了全局大锁的性能瓶颈，同时避免了给每个对象增加额外内存消耗。

5. **优化**：配合 **TLS (线程局部存储)** 缓存最近使用的锁，在递归或高频加锁场景下，能绕过 StripeMap 查找，实现极高效率。

一张图总结：

Plaintext

```
Object Addr -> Hash() -> Index 3
                            ⬇
                  [ Stripe 3 (SpinLock) ]
                            ⬇
                  Link List: Node A -> Node B -> Node C
                                         ⬆
                                    Object: objB
                                    Lock: RecursiveMutex (真正干活的锁)
```

#### 自旋锁不是被废弃了吗 苹果还在用吗?
这是一个非常敏锐且专业的问题！你发现了源码命名与官方文档之间的“矛盾”。

**一句话答案：** `OSSpinLock`（那个 API）确实被彻底废弃了，甚至被视为“毒药”。 但是，在 `objc4` 源码里你看到的 `spinlock_t`，**只是披着“自旋锁”名字的马甲，它的内核其实已经偷偷换成了 `os_unfair_lock`。**

我们深入源码（`objc-os.h`）来把这个“案子”破了。

***

### 一、 源码里的“挂羊头卖狗肉”

如果你打开 Apple 开源的 `objc4-818` (或更新版本) 的源码，找到 `objc-os.h` 文件，你会看到这样的定义：


```c++
// 简化后的源码逻辑展示
#if defined(__APPLE__) && !defined(OS_UNFAIR_LOCK_INLINE)
    // ... 一些环境判断
#endif

// 重点在这里！！！
using spinlock_t = mutex_tt;
```

再往下挖 `mutex_tt` 的实现：


```c++
template 
class mutex_tt : nocopy_t {
    os_unfair_lock mLock; // <--- 凶手找到了！它里面包的是 os_unfair_lock
    
public:
    void lock() {
        // 调用的是 os_unfair_lock_lock
        os_unfair_lock_lock(&mLock); 
    }
    
    void unlock() {
        os_unfair_lock_unlock(&mLock);
    }
    // ...
};
```

**真相大白**： Runtime 内部虽然变量名叫 `spinlock_t`，虽然注释里可能还写着 Spinlock，但它底层调用的全是 **`os_unfair_lock`**。

***

### 二、 为什么要保留 `spinlock_t` 这个名字？

这更多是**历史包袱**和**语义表达**的原因：

1. **历史原因**：Objective-C Runtime 的代码历史非常悠久。以前它确实用的是真的自旋锁。为了不重构几千行代码里的类型声明，苹果工程师选择直接修改 `spinlock_t` 的定义，把底层替换掉。

2. **语义原因**：在 `StripeMap` 这种场景下，开发者意图是“**极短时间的锁定**”。叫它 `spinlock` 能提醒维护者：**“这里只能做极简单的内存操作，千万别在这里面做耗时操作（比如 IO）！”**

***

### 三、 真的完全不“自旋”了吗？

这也是一个深度的细节。`os_unfair_lock` 虽然是互斥锁（会休眠），但它在内核层面的实现非常智能。

1. **纯粹的 OSSpinLock (已死)**：

   - 获取失败 -> `while(1)` 死循环空转 -> 浪费 CPU -> 导致优先级反转。
2. **现在的 os\_unfair\_lock**：

   - 获取失败 -> **可能**会在用户态尝试几次（Bounded Spin，有限自旋） -> 还没拿到？ -> **立即进入内核休眠 (Wait)**。

**苹果的策略是：** 既然 `StripeMap` 的操作仅仅是“从链表里取个节点”这么快（纳秒级），那么使用 `os_unfair_lock` 带来的开销（即使发生内核休眠）也是完全可以接受的，而且彻底解决了优先级反转造成的死锁风险。

### 四、 总结

- **官方态度**：`OSSpinLock` 确实不能用了，谁用谁 Crash（死锁）。

- **内部实现**：`@synchronized` 内部的 `StripeMap` 依然在使用名为 `spinlock_t` 的类型，但它**不是** `OSSpinLock`。

- **实质**：它是封装了 `os_unfair_lock` 的 C++ 类。

所以，Apple 并没有打脸，它只是通过一次“偷天换日”的底层替换，既保留了代码结构，又修复了致命 Bug。

***

###  深度总结与对比

| **锁类型**              | **底层实现**           | **优先级反转**      | **性能**  | **特点**                               |
| -------------------- | ------------------ | -------------- | ------- | ------------------------------------ |
| **OSSpinLock**       | `while` 忙等 (用户态)   | **严重** (导致死锁)  | 极高 (曾是) | 已废弃。仅适用于极短临界区。                       |
| **os\_unfair\_lock** | 互斥锁 (内核态等待)        | **解决** (优先级继承) | 很高      | OSSpinLock 的官方替代品，不保证 FIFO，C 语言 API。 |
| **pthread\_mutex**   | 互斥锁 (Unix 标准)      | 无特殊处理          | 高       | 跨平台通用，支持递归/非递归配置。                    |
| **NSLock**           | 封装 `pthread_mutex` | 同上             | 中       | OC 对象封装，使用方便。                        |
| **@synchronized**    | 全局 Hash 表 + 递归锁    | 无特殊处理          | **低**   | 语法最简单，支持递归，**自动处理异常解锁**，性能最差但一般场景够用。 |

#### 架构师视角的建议：

1. **追求极致性能**：使用 `os_unfair_lock`。

2. **跨平台/通用 C++ 混编**：使用 `std::mutex` 或 `pthread_mutex`。

3. **业务层快速开发**：`@synchronized` 依然是首选，除非 instruments 分析出它是瓶颈（99% 的 UI 业务逻辑中，锁的开销不是瓶颈）。

4. **面试加分项**：提到 `@synchronized` 的 **StripeMap** 设计，以及 `OSSpinLock` 死锁的 **QoS 调度**背景。

### 九、 总结与建议

1. **心法**：不要思考“线程”，要思考“任务”和“队列”。

2. **死锁铁律**：永远不要在当前串行队列中同步 (`sync`) 添加任务到本队列。

3. **性能优化**：

   - 尽量使用 `DISPATCH_QUEUE_CONCURRENT` 配合 `barrier` 来处理资源竞争（比 `@synchronized` 高效）。

   - 控制并发数量。如果你用 `dispatch_apply` 遍历一个 10000 次的数组，GCD 可能会尝试开几十个线程，导致内存爆炸（Thread Explosion）。此时应该配合信号量控制并发数。

GCD 是 iOS 开发者的内功。理解了它，你实际上就理解了现代操作系统如何高效地处理并行计算。