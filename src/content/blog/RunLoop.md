---
title: "iOS RunLoop 深入解析：机制、模式与实战"
description: "从 Core Foundation 实现出发，系统梳理 RunLoop 的数据结构、事件调度流程、线程关系与高频面试问题。"
publishedAt: 2025-11-24
tags:
  - "iOS"
  - "面试"
  - "RunLoop"
---

# iOS RunLoop 深入解析

RunLoop 是 iOS 事件驱动模型的核心基础设施。它并不是“让线程一直空转”的死循环，而是一个“有事件就处理、无事件就休眠”的调度循环。

如果只记住一句话：

> RunLoop 的本质是线程上的事件分发器，它协调 Input Source、Timer、Observer，并通过内核消息机制实现低功耗等待。

---

## 1. RunLoop 解决了什么问题

在移动端，线程若持续轮询会带来两个直接问题：

- CPU 无效占用，功耗上升
- 线程生命周期难以控制，事件调度分散

RunLoop 的设计目标就是解决这两个问题：

1. 统一事件入口：把触摸、端口消息、定时任务、主队列回调等纳入同一调度循环
2. 空闲休眠：没有事件时进入内核态等待，不消耗 CPU 时间片
3. 可控唤醒：由 Timer、Port、`CFRunLoopWakeUp` 等机制唤醒后继续处理

---

## 2. 与线程的关系：不是“所有线程自动运行”

### 2.1 一线程一 RunLoop

从模型上看，一个线程最多对应一个 RunLoop。主线程 RunLoop 在应用启动过程中创建并启动；子线程默认不会自动运行 RunLoop。

### 2.2 子线程为什么“看起来没有 RunLoop”

子线程可以“拥有” RunLoop 对象，但如果不显式启动（如 `run` / `runMode:beforeDate:` / `CFRunLoopRun`），它不会进入事件循环。

因此常见结论应精确表达为：

- 子线程默认**不启动** RunLoop
- 需要长期存活的工作线程，必须显式配置输入源并启动 RunLoop

### 2.3 生命周期与清理

Core Foundation 内部通过线程相关存储（TSD）维护线程到 RunLoop 的映射。线程退出时，相关 RunLoop 资源会被系统回收。

---

## 3. 两套 API：NSRunLoop 与 CFRunLoopRef

- `CFRunLoopRef`：Core Foundation 层实现，C API，能力完整、语义底层
- `NSRunLoop`：Foundation 封装，Objective-C/Swift 访问更友好

它们本质上对应同一个运行实体。工程实践中：

- 业务层通常使用 `RunLoop` / `NSRunLoop`
- 分析底层行为与诊断问题时常回到 `CFRunLoop` 语义

---

## 4. Mode 机制：RunLoop 的任务隔离核心

RunLoop 在任意时刻只运行在一个 Mode。Mode 可以理解为“事件集合视图”：当前 Mode 之外的 Source/Timer 不会被处理。

高频模式：

- `kCFRunLoopDefaultMode` / `NSDefaultRunLoopMode`
- `UITrackingRunLoopMode`（滚动、手势跟踪阶段）
- `kCFRunLoopCommonModes` / `NSRunLoopCommonModes`（标记集合，不是独立 Mode）

### 4.1 为什么滑动时普通 Timer 会暂停

`UIScrollView` 滚动时主线程 RunLoop 切换到 `UITrackingRunLoopMode`。若 `NSTimer` 仅加入 Default Mode，则当前阶段不会触发。

解决方案：

- 将 Timer 加入 `NSRunLoopCommonModes`，使其在被标记为 Common 的多个 Mode 下都可调度。

注意：`CommonModes` 是“集合标签”，不是一个实际执行 Mode。

---

## 5. 事件源分类：Source0、Source1、Timer、Observer

### 5.1 Source0（非 Port）

- 典型来源：应用层主动投递事件（如 `performSelector:onThread:`）
- 特点：不会自动唤醒休眠中的 RunLoop，必要时需显式 `CFRunLoopWakeUp`

### 5.2 Source1（基于 Mach Port）

- 典型来源：内核/系统端口消息、跨线程或跨进程通信
- 特点：消息到达可触发 RunLoop 从休眠态唤醒

### 5.3 Timer

- `NSTimer`、`CFRunLoopTimer`
- 本质是“到期事件”，触发时间受 RunLoop 调度点与 Mode 影响，不保证实时硬中断级精度

### 5.4 Observer

Observer 不处理业务事件，而是监听 RunLoop 状态变化。常见状态点：

- `kCFRunLoopEntry`
- `kCFRunLoopBeforeTimers`
- `kCFRunLoopBeforeSources`
- `kCFRunLoopBeforeWaiting`
- `kCFRunLoopAfterWaiting`
- `kCFRunLoopExit`

Autorelease Pool 的 push/pop 也与这些阶段关联，这是理解内存峰值行为的关键。

---

## 6. 一次标准循环发生了什么

可将 `__CFRunLoopRun` 的核心路径抽象为：

1. 进入循环并通知 `Entry`
2. 处理即将到期的 Timer
3. 处理非 Port 事件（Source0）
4. 若无可立即处理事件，进入 `BeforeWaiting`
5. 通过 `mach_msg` 等机制陷入内核等待
6. 被 Timer、Port 消息或显式唤醒后进入 `AfterWaiting`
7. 处理唤醒原因对应的事件
8. 重复下一轮，直至满足退出条件

这个流程解释了 RunLoop 如何同时满足：

- 事件响应能力
- 线程常驻能力
- 空闲期低功耗

---

## 7. 与 GCD 的关系：常被误解的边界

常见误解是“GCD 任务都由 RunLoop 驱动”。准确说法是：

- 全局并发队列或自建串行队列上的任务执行，不依赖目标线程的 RunLoop 常驻
- 主队列任务与主线程事件循环存在桥接关系，主线程 RunLoop 会在特定时机处理主队列回调

因此：

- 子线程是否有 RunLoop，不决定该线程能否执行 `dispatch_async`
- 但某些依赖 RunLoop 的 API（如 `Timer`、`Port`、部分线程通信模式）确实要求线程 RunLoop 处于运行状态

---

## 8. 三个高频实战问题

### 8.1 列表滚动时定时器不触发

- 根因：Mode 切换导致 Timer 不在当前 Mode
- 处理：将 Timer 加入 Common Modes

### 8.2 大量临时对象导致短时内存峰值

在单次 RunLoop 周期内执行大批量对象创建（例如长循环构建中间对象）时，自动释放对象可能要到合适的池清理点才释放。

可选优化：

- 在循环内部显式使用 `@autoreleasepool` 分段释放，降低峰值

### 8.3 子线程回调不执行

如果在子线程上依赖 `performSelector:afterDelay:`、`Timer`、`Port` 回调，但线程未启动 RunLoop，则回调不会按预期触发。

排查顺序：

1. 是否真的启动了该线程 RunLoop
2. Source/Timer 是否加入了正确 Mode
3. 线程是否在回调前已退出

---

## 9. 面试表达模板（可直接复用）

可以用 4 句话概括：

1. RunLoop 是线程级事件循环，核心目标是事件分发与空闲休眠。
2. 一个线程对应一个 RunLoop，主线程自动启动，子线程通常需手动启动。
3. Mode 决定当前可处理的事件集合，`CommonModes` 是模式集合标签。
4. RunLoop 通过 Source/Timer/Observer 协同调度，并借助内核消息等待实现低功耗。

---

## 10. 总结

理解 RunLoop 的关键不在“记概念”，而在建立一套因果链：

- 为什么线程能常驻而不忙等
- 为什么同一任务在不同交互阶段表现不同（Mode）
- 为什么某些 API 在子线程“失效”
- 为什么内存峰值与 RunLoop 周期有关

把这条链路讲清楚，RunLoop 就不再是“面试黑盒”，而是可以指导实际性能优化与问题定位的基础能力。
