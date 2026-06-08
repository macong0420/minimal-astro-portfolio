---
title: "OC Runtime 中 weak、isa、SideTable 与对象内存结构"
description: ""
publishedAt: 2026-06-05
tags:
  - "iOS"
  - "Runtime"
---
![9ebfb0c6-9900-46a1-9fb7-cbacfae4aa3a.png](https://img.yc0501.online/i/{year}/{month}/{md5}.{extName}/20260605170808427.png)

![](https://img.yc0501.online/i/{year}/{month}/{md5}.{extName}/20260605170458399.png)

# OC Runtime 中 weak、isa、SideTable 与对象内存结构

## 1. 先记住一张大图

Objective-C 对象相关的内存，可以先分成三层：

```text
变量槽位                  对象本体                    runtime 旁路账本
strong / weak / ivar  ->  heap object  ----------->   SideTable / weak_table
```

比如：

```objc
Person *p = [[Person alloc] init];
__weak Person *w = p;
```

可以粗略理解成：

```text
栈上变量
┌──────────────┐
│ p = 0x1000   │ strong 指针槽位
│ w = 0x1000   │ weak 指针槽位
└──────────────┘

堆上对象
0x1000:
┌────────────────────┐
│ isa                │
│ ivar1              │
│ ivar2              │
└────────────────────┘

runtime 旁路表
SideTable:
┌────────────────────────────┐
│ refcnts                    │ 引用计数补充表
│ weak_table                 │ weak 反向登记表
└────────────────────────────┘
```

这里最重要的一句话：

```text
weak 指针本身只是一个普通指针槽位；
weak 的安全性来自 runtime 在旁边维护的 weak_table。
```

---

## 2. iOS 进程里常见的内存区域

从更大的角度看，一个 iOS App 进程里通常有这些内存：

```text
__TEXT          代码段，方法实现、只读常量等
__DATA          全局变量、静态变量、类元数据等
Heap            malloc 分配的内存，ObjC 对象通常在这里
Stack           函数调用栈，局部变量、参数、返回地址等
VM / mmap       映射文件、动态库、图片、数据库、缓存文件等
AutoreleasePool 不是独立内存区，而是一套自动释放对象的管理机制
```

日常讲 `isa`、引用计数、`weak`、`SideTable`，主要是在讲：

```text
Heap 上的 ObjC 对象 + runtime 为对象维护的旁路数据结构
```

---

## 3. 一个 ObjC 对象本体里有什么

最基础的 ObjC 对象结构可以理解成：

```cpp
struct objc_object {
    isa_t isa;
};
```

如果类有实例变量，实例变量会跟在 `isa` 后面。

例如：

```objc
@interface Person : NSObject
@property (nonatomic, strong) NSString *name;
@property (nonatomic, weak) id delegate;
@end
```

对象内存大致是：

```text
Person object
┌────────────────────────────┐
│ isa                        │
│ _name      strong 指针槽位  │
│ _delegate  weak 指针槽位    │
└────────────────────────────┘
```

注意：

```text
strong ivar 和 weak ivar 在对象本体里都是一个指针大小的槽位。
它们真正的区别不在槽位形状，而在编译器调用的 runtime 函数不同。
```

strong 赋值通常会变成：

```objc
objc_storeStrong(&_name, value);
```

weak 赋值通常会变成：

```objc
objc_storeWeak(&_delegate, value);
```

---

## 4. isa 是什么

早期可以把 `isa` 简单理解为：

```text
对象的 isa 指向类对象
```

比如：

```text
person object
┌────────────┐
│ isa ───────┼──> Person class
└────────────┘
```

类对象里有方法、属性、协议、父类、方法缓存等信息：

```text
Class object
┌────────────────────┐
│ superclass         │
│ method cache       │
│ method list        │
│ property list      │
│ protocol list      │
│ ivar layout        │
└────────────────────┘
```

所以方法调用：

```objc
[p sayHello];
```

大致是：

```text
通过 p 的 isa 找到 Person 类
先查方法缓存
缓存没有再查方法列表
找到 IMP 后调用
```

---

## 5. nonpointer isa 是什么

现代 64 位 iOS runtime 中，`isa` 通常不是一个单纯的类指针，而是 `nonpointer isa`。

可以把它理解成：

```text
isa = 类信息 + 对象状态位 + 一小段引用计数
```

为什么能这么做？

因为 64 位指针并不总是把所有 bit 都用满，而且对象地址、类地址有对齐要求，低位或部分高位可以被 runtime 拿来存状态。

概念上，`isa` 里可能包含这些信息：

```text
isa_t
┌──────────────────────────┐
│ nonpointer               │ 是否是打包 isa
│ has_assoc                │ 是否有关联对象
│ has_cxx_dtor             │ 是否有 C++ / ARC 析构逻辑
│ shiftcls                 │ 真正的 Class 信息
│ magic                    │ runtime 校验位
│ weakly_referenced        │ 是否曾经被 weak 指向
│ deallocating             │ 是否正在释放
│ has_sidetable_rc         │ 引用计数是否溢出到 SideTable
│ extra_rc                 │ 存在 isa 里的引用计数
└──────────────────────────┘
```

不同 iOS 版本、不同 CPU 架构，具体 bit 分布会变。面试和理解 runtime 时，重点记概念，不要死记固定 bit 位置。

---

## 6. 引用计数放在哪里

现代 runtime 的引用计数大致分两层：

```text
小引用计数：优先放在 isa.extra_rc
放不下时：溢出到 SideTable.refcnts
```

也就是：

```text
对象本体
┌────────────────────────────┐
│ isa.extra_rc               │ 存一部分引用计数
│ isa.has_sidetable_rc       │ 是否还有 SideTable 引用计数
└────────────────────────────┘

SideTable
┌────────────────────────────┐
│ refcnts[object] = 额外计数  │
└────────────────────────────┘
```

为什么不全部放 SideTable？

因为大多数对象引用计数都很小，放在 `isa` 里更快，不需要额外查表和加锁。

什么时候需要 SideTable？

```text
1. isa.extra_rc 放不下了
2. 对象被 weak 引用，需要 weak_table
3. 某些需要旁路记录的 runtime 状态
```

---

## 7. SideTable 是什么

`SideTable` 可以理解成 runtime 给对象准备的“旁路账本”。

它不是每个对象一个，而是 runtime 维护一组全局分片表。对象地址会通过哈希映射到某一个 `SideTable`。

概念结构：

```cpp
SideTable {
    lock;
    refcnts;
    weak_table;
}
```

也就是：

```text
SideTable
┌────────────────────────────┐
│ lock                       │ 多线程保护
│ refcnts                    │ 引用计数补充账本
│ weak_table                 │ weak 反向登记表
└────────────────────────────┘
```

`refcnts` 记录：

```text
某对象额外的引用计数是多少
```

`weak_table` 记录：

```text
某对象被哪些 weak 指针槽位指着
```

---

## 8. weak_table 记录的到底是什么
![](https://img.yc0501.online/i/{year}/{month}/{md5}.{extName}/20260605171827456.png)
假设：

```objc
Person *p = [[Person alloc] init];
__weak Person *w1 = p;
__weak Person *w2 = p;
```

很多人容易以为 weak 表是：

```text
w1 -> object
w2 -> object
```

但 runtime 真正需要的是反向表：

```text
object -> &w1, &w2
```

也就是：

```text
weak_table
┌──────────────────────────────┐
│ key: object 0x1000           │
│ value: [&w1, &w2]             │
└──────────────────────────────┘
```

为什么记录的是 `&w1`，不是 `w1`？

因为对象释放时，runtime 要做的是：

```objc
w1 = nil;
w2 = nil;
```

要修改 `w1`、`w2` 的值，就必须知道它们这些变量槽位自己的地址。

所以：

```text
w1  = 对象地址
&w1 = w1 这个变量槽位的地址
```

对象释放时本质上是：

```text
*&w1 = nil
*&w2 = nil
```

---

## 9. weakly_referenced 什么时候被设置

先看代码：

```objc
__weak id w;
```

这行只是声明了一个 weak 变量槽位，还没有指向具体对象，所以不会让某个对象设置 `weakly_referenced`。

真正触发的是：

```objc
w = obj;
```

编译器会生成类似：

```objc
objc_storeWeak(&w, obj);
```

runtime 在 weak 存储过程中会做几件事：

```text
1. 找到 obj 对应的 SideTable
2. 加锁
3. 在 weak_table 中登记 object -> &w
4. 设置 obj.isa.weakly_referenced = 1
5. 把 obj 的地址写入 w
6. 解锁
```

所以结论是：

```text
weakly_referenced 不是 alloc 时设置的；
不是声明 __weak 变量时设置的；
而是在某个非 nil 对象真正被 weak 指向时设置的。
```

这个 bit 可以理解成：

```text
这个对象曾经被 weak 指向过。
```

它的作用主要是让对象释放时知道：

```text
我可能需要去 weak_table 清理 weak 指针。
```

即使后来 weak 被改成 `nil` 或指向别的对象，这个 bit 也不一定需要改回 0。它偏向于作为释放时的快速判断标志。

---

## 10. weak 赋值的完整过程

代码：

```objc
__weak id w = obj;
```

可以理解成：

```text
objc_storeWeak(&w, obj)
```

流程大致是：

```text
如果 w 原来指向 oldObj：
    从 oldObj 的 weak_table 里移除 &w

如果 obj 非 nil：
    检查 obj 是否正在 deallocating
    如果对象已经在释放，weak 赋值可能得到 nil

    在 obj 的 weak_table 记录里加入 &w
    设置 obj.isa.weakly_referenced = 1
    w = obj
```

所以 weak 赋值不是普通的：

```text
w = obj
```

而是：

```text
注销旧登记
登记新 weak 槽位
设置 weakly_referenced
最后写入指针值
```

---

## 11. 对象释放时 weak 怎么被清 nil

代码：

```objc
Person *p = [[Person alloc] init];
__weak Person *w1 = p;
__weak Person *w2 = p;

p = nil;
```

当最后一个 strong 引用消失，流程大概是：

```text
objc_release(obj)
  ↓
引用计数减到 0
  ↓
设置 obj.isa.deallocating = 1
  ↓
进入 dealloc 流程
  ↓
如果 obj.isa.weakly_referenced == 1
    去 SideTable.weak_table 找 obj
    找到所有 weak 槽位地址
    把这些槽位全部写成 nil
  ↓
移除 weak_table 中 obj 对应的记录
  ↓
释放关联对象、strong ivar、C++ 成员等
  ↓
free 对象内存
```

weak 清理的核心逻辑可以简化成：

```cpp
for (location in weak_table[obj]) {
    *location = nil;
}
```

所以：

```text
对象释放前：
w1 = 0x1000
w2 = 0x1000

对象释放后：
w1 = nil
w2 = nil
对象内存被 free
```

这就是 zeroing weak。

---

## 12. deallocating 是什么

`deallocating` 表示：

```text
对象已经进入释放流程。
```

这个状态很重要，因为 weak 读取可能发生在多线程环境。

例如：

```objc
id strongObj = weakObj;
```

weak 读取不是简单读指针。runtime 通常会做类似：

```text
读取 weak 槽位
尝试临时 retain 对象
如果对象已经 deallocating，返回 nil
如果 retain 成功，返回一个临时强引用
```

所以 weak 的安全性不只是“对象死后清 nil”，还包括：

```text
读 weak 时如果发现对象正在死，直接返回 nil。
```

---

## 13. weak 变量所在对象先释放怎么办

还有一种容易忽略的情况：

```objc
@interface A : NSObject
@property (nonatomic, weak) id target;
@end

A *a = [[A alloc] init];
NSObject *obj = [[NSObject alloc] init];

a.target = obj;
a = nil;
```

这里不是 `obj` 先死，而是 weak 槽位所在的对象 `a` 先死。

`a.target` 的 weak 槽位地址曾经被登记在 `obj` 的 weak_table 里：

```text
weak_table[obj] = [&a->_target]
```

当 `a` 释放时，`a->_target` 这个 weak 槽位也要销毁。

runtime 会做类似：

```text
objc_destroyWeak(&a->_target)
```

它的作用是：

```text
从 obj 的 weak_table 中移除 &a->_target
```

所以 weak 有两条清理路径：

```text
1. 被 weak 指向的对象死了：
   runtime 找到所有 weak 槽位，把它们置 nil

2. weak 槽位自己死了：
   runtime 把这个槽位从目标对象的 weak_table 里注销
```

---

## 14. has_assoc 是什么

关联对象代码：

```objc
objc_setAssociatedObject(obj, key, value, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
```

一旦对象有关联对象，runtime 会设置：

```text
obj.isa.has_assoc = 1
```

这样对象释放时，runtime 看到这个 bit，就知道：

```text
不能直接 free；
还要去关联对象表里清理 associated objects。
```

---

## 15. has_cxx_dtor 是什么

`has_cxx_dtor` 表示这个对象释放时有额外析构逻辑。

可能来自：

```text
C++ 成员变量
ARC strong ivar
ARC weak ivar
其他需要析构的成员
```

对象释放时，如果有这些内容，runtime 不能直接 free，而是要先执行析构流程：

```text
释放 strong ivar
注销 weak ivar
执行 C++ destructor
然后再释放对象本体
```

---

## 16. weak 和 unsafe_unretained 的区别

```objc
__unsafe_unretained id u = obj;
__weak id w = obj;
```

对象释放后：

```text
u 仍然保存旧对象地址，可能变成野指针
w 会被 runtime 自动置 nil
```

所以：

```objc
[u doSomething]; // 可能崩溃
[w doSomething]; // 安全，等价于 [nil doSomething]
```

区别本质是：

```text
weak 会进入 weak_table 登记；
unsafe_unretained 不登记，不清零。
```

---

## 17. 最后用口诀记

```text
对象本体：
isa + ivars

isa：
类信息 + 状态位 + 小引用计数

nonpointer isa：
把 Class 指针和对象状态压进一个 isa 里

extra_rc：
存在 isa 里的小引用计数

SideTable：
runtime 旁路账本

refcnts：
引用计数溢出后的补充记录

weak_table：
对象 -> weak 槽位地址列表

weakly_referenced：
第一次有 weak 真正指向对象时设置

deallocating：
对象引用计数归零，进入释放流程时设置

weak 的本质：
不拥有对象，只登记槽位；
对象将死，查表清零。
```

最短版：

```text
strong 保命
weak 登记
对象将死
查表清零

isa 管身份和状态
SideTable 管放不下的账本
weak_table 管谁 weak 指向我
```
![6cb1ab4d-7ce3-4986-b47a-ed21ac043af6.png](https://img.yc0501.online/i/{year}/{month}/{md5}.{extName}/20260605170458399.png)
