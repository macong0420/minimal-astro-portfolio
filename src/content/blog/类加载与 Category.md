---
title: "Runtime 深度剖析：类加载机制与 Category"
description: ""
publishedAt: 2025-11-20
tags:
  - "iOS"
  - "面试"
---

## 1. 类加载过程 (Dyld & Objc Setup)

App 启动时，`dyld` 加载动态库，通知 Runtime (`_objc_init`) 进行初始化。

### 1.1 realizeClass
Runtime 会解析 Mach-O 文件中的数据，将磁盘上的 `class_ro_t` (Read Only) 转换为内存中的 `class_rw_t` (Read Write)。
- `ro`：编译期确定，包含 ivars, base methods。
- `rw`：运行时生成，包含 methods, properties, protocols (可动态添加)。

### 1.2 +load 方法
- **调用时机**：ImageLoader 加载镜像到内存时（main 函数之前）。
- **调用顺序**：
  1.  父类先于子类。
  2.  类先于 Category。
  3.  多个 Category 之间取决于编译顺序。
- **特点**：
  - 线程安全。
  - 不走消息转发（直接通过函数指针调用），因此子类不会自动调用父类的 load。
  - 可以在此进行 Method Swizzling。

### 1.3 +initialize 方法
- **调用时机**：类**第一次**接收到消息时（懒加载）。
- **特点**：
  - 走完整的消息发送流程 (`objc_msgSend`)。
  - 线程安全（Runtime 内部加锁）。
  - 如果子类没实现，会调用父类的（可能导致父类的 initialize 跑多次）。

## 2. Category 底层原理

Category 允许我们在不继承的情况下给类添加方法。

### 2.1 实现原理
编译后，Category 的数据被存放在 `category_t` 结构体中。在 Runtime 加载阶段（`attachCategories`）：
1.  获取类原本的方法列表。
2.  获取所有 Category 的方法列表。
3.  **重新分配内存**：创建一个新的大数组。
4.  **数据移动**：
    - 将 Category 的方法拷贝到新数组的**前面**。
    - 将类原本的方法拷贝到新数组的**后面**。
5.  将新数组赋值给 `class_rw_t`。

### 2.2 为什么 Category 方法会"覆盖"原类方法？
实际上并没有覆盖（Overwrite）。Category 的方法被放到了方法列表的**头部**。
消息发送时，遍历方法列表，一旦找到匹配的方法就返回。因此，处于头部的 Category 方法被优先执行了。

### 2.3 Category 能添加成员变量吗？
- **直接添加**：不能。因为类的内存布局 (`instanceSize`) 在编译期和 `ro` 阶段已经确定。
- **间接实现**：使用 **关联对象 (Associated Objects)** 技术。