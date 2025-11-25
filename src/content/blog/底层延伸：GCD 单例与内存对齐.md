---
title: "底层延伸：GCD 单例与内存对齐"
description: ""
publishedAt: 2025-11-20
tags:
  - "iOS"
  - "面试"
---

## 1. dispatch_once 底层原理

`dispatch_once` 常用于单例，保证代码只执行一次且线程安全。

### 实现逻辑
它依赖于一个 `dispatch_once_t` 类型的 token（本质是长整型）。

1.  **检查标记**：判断 token 的值。
    - 如果是 `Done` (通常是 ~0)，直接返回。
2.  **加锁/信号量**：如果是初始化状态，利用原子操作（Atomic）或信号量阻塞其他线程。
3.  **执行 Block**：执行初始化代码。
4.  **修改标记**：将 token 标记为 `Done`，唤醒等待的线程。

*核心点：利用底层原子指令 CAS (Compare And Swap) 保证状态切换的原子性。*

## 2. 内存对齐 (Memory Alignment)

### 2.1 对齐原则
为了提高 CPU 的读取效率（CPU 通常按字长读取，如 8 字节），内存需要遵循对齐规则。

- **数据成员对齐**：结构体中每个数据成员的偏移量（offset）必须是该成员大小的整数倍。
- **结构体整体对齐**：结构体的总大小必须是其**最大成员**大小的整数倍。

### 2.2 示例分析

```c
struct MyStruct {
    char a;   // 1 byte. offset 0.
    double b; // 8 bytes. offset 必须是 8 的倍数 -> 8. (1-7 补齐)
    int c;    // 4 bytes. offset 16. (16 是 4 的倍数)
    char d;   // 1 byte. offset 20.
}
// 总大小：21 -> 必须是最大成员(8)的倍数 -> 24 bytes.
```



### 2.3 iOS 对象对齐

- **成员变量重排**：Apple 的编译器会自动重排对象的成员变量顺序，将相同类型的变量放在一起，以减少内存空隙，优化空间。

- **对象大小**：

  - class\_getInstanceSize：实际占用的内存（经过对齐）。

  - malloc\_size：系统实际分配的内存（通常是 16 的倍数，iOS 对象至少分配 16 字节）。
