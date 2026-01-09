---
title: "深入解析：我们项目的 Flutter 引擎管理与通信机制"
description: "本文将详细剖析我们移动端项目中 Flutter 引擎的管理策略、通信机制以及内存模型。基于代码深度分析，带你了解底层的实现细节。"
publishedAt: "2026-01-06"
tags:
  - "flutter"
  - "引擎管理"
---


## 一、Flutter 引擎管理架构

我们的项目采用了 **Flutter 2.0+ 官方推荐的多引擎复用模式**，核心目标是实现轻量级的混合开发体验。

### 1.1 核心管理类：`BKRunnerShared`

引擎管理的中枢是位于 `flutter_runner` 库中的 `BKRunnerShared` 单例。它负责协调引擎的创建、复用和插件注册。

- **多引擎组 (`FlutterEngineGroup`)**： 我们并没有维护一个单独的全局单例 Engine，而是维护了一个 `FlutterEngineGroup` 实例（名为 `beike_engine_group`）。
    
    > **为什么使用 Group?** `FlutterEngineGroup` 允许创建多个轻量级的 `FlutterEngine` 实例。这些实例并非完全隔离，而是共享了极其昂贵的底层资源（如 Skia 上下文、字体管理器、Dart VM 代码段内存映射）。这使得创建新引擎的内存开销降低了约 99%（从 ~20MB 降至 ~180KB），且启动速度只需几毫秒。
    
- **初始化时机**： `BKRunnerShared` 采用**懒加载 (Lazy Loading)** 策略。
    
    - **App 启动时 (`didFinishLaunching`)**：仅配置了插件注册的回调 (`configRegisterBlock`)，**不创建引擎，不启动 Dart VM**。
    - **页面跳转时 (`open router`)**：当业务侧明确需要打开 Flutter 页面时，通过 `BKFlutterPlatformRouterImp` 触发引擎创建流程。

### 1.2 引擎创建流程

当用户点击一个按钮跳转 Flutter 页面时，发生了以下步骤：

1. **资源完整性检查 (Resource Check)** 调用 `[[LJBeikeFlutterManager sharedManager] checkProductData]`。
    
    - **Thin Mode（瘦身模式）支持**：我们的 Flutter 产物（`assets`, `web_snapshot` 等）被从主二进制剥离，打包为 `flutter_resource.zip`。
    - 如果本地资源版本不一致或缺失，会显示 Loading 提示，并在后台线程解压资源。
2. **获取/创建引擎 (Request Engine)** 调用 `[[BKRunnerShared sharedInstance] getNewEngineEntryPoint:...]`。
    
    - 内部调用 `_engineGroup makeEngineWithOptions:` 创建一个新的轻量级 Engine。
    - **插件注册**：立即执行预设的 `pluginRegisterBlock`，为这个新引擎注册所有原生插件（如 `OneNotificationPlugin` 等）。
3. **容器绑定** 将新创建的 Engine 注入到 `BKFlutterViewController` 中，推入导航栈显示。
    

---

## 二、通信机制：OneNotification

项目使用自研的 **OneNotification** 框架实现 Native 与 Flutter 的全双工通信。

### 2.1 架构设计

OneNotification 是一个基于 **MethodChannel** 的三层架构方案：

Layer 1: 业务 API (Observer Mode)

Layer 2: 桥接层 (NSNotificationCenter)

Layer 3: 传输层 (MethodChannel)

### 2.2 通信流程

- **Flutter → iOS**： Flutter 调用 `OneNotification.post()` -> `MethodChannel` 传递给 Native Plugin -> Plugin 通过 `NSNotificationCenter` 分发给 iOS 原生业务模块。
    
- **iOS → Flutter**： iOS 业务调用 `[[OneNotification shared] post:...]` -> `NSNotificationCenter` 通知 Plugin -> Plugin 通过 `MethodChannel` 调用 Flutter 端方法 -> Flutter 触发订阅回调。
    
- **多引擎同步**： 为了支持多引擎场景，`OneNotificationPlugin` 内部维护了一个 Plugin 实例的弱引用表。当从 Native 发送通知时，会遍历所有活跃的 Plugin（即所有活跃的 Flutter 页面），确保所有页面都能收到通知。
    

---

## 三、内存与生命周期

关于大家关心的 **"打开一次 Flutter 页面是否永久占用内存"** 的问题，答案是：**大部分释放，少量常驻。**

### 3.1 引擎生命周期

- **创建**：打开页面时即时创建。
- **销毁**：关闭页面（ViewController dealloc）时，对应的 `FlutterEngine` 实例及该页面内的 Dart 堆内存（变量、Widget 树）**会被完全销毁**。我们没有缓存具体的 Engine 实例。

### 3.2 常驻内存（Group Overhead）

- 一旦 `FlutterEngineGroup` 初始化（即打开过一次 Flutter 页面），为了保证后续页面的"秒开"体验，它持有的共享底层资源（VM Snapshot Mapping, Skia Cache）**会常驻内存**。
- 这部分开销是固定的（Foundational Cost），不会随着页面开关次数累积。

### 总结

我们的管理机制在**启动速度**、**内存占用**和**开发灵活性**之间取得了很好的平衡：

- **无预热**：不拖慢 App 启动速度。
- **多引擎 + Group**：解决状态污染问题，同时保持低内存开销。
- **瘦身模式**：减小安装包体积，支持动态更新。