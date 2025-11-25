---
title: "iOS 内存管理：Associated Objects (关联对象)"
description: ""
publishedAt: 2025-11-20
tags:
  - "iOS"
  - "面试"
---

## 1. 概述
关联对象（Associated Objects）允许我们在运行时给对象动态添加 "成员变量"。常用于 Category 中添加属性。

- `objc_setAssociatedObject`
- `objc_getAssociatedObject`
- `objc_removeAssociatedObjects`

## 2. 底层存储结构

关联对象**不是**存储在对象本身的内存中（对象的内存布局在编译期固定），而是存储在全局的 `AssociationsManager` 中。

```cpp
class AssociationsManager {
    static SpinLock _lock;
    static AssociationsHashMap *_map; // 全局哈希表
};
```


### 存储层级

- **AssociationsHashMap**：全局单例。

  - Key: DisguisedPtr\ (即对象的地址)。

  - Value: ObjectAssociationMap。
- **ObjectAssociationMap**：属于某个对象的所有关联对象表。

  - Key: const void \*key (设置时的 key)。

  - Value: ObjcAssociation (包含 value 和 policy)。
- **ObjcAssociation**：

  - uintptr\_t \_policy (如 COPY, RETAIN\_NONATOMIC)。

  - id \_value (实际值)。

## 3. 核心逻辑

### 3.1 设置值

- 获取全局锁。

- 根据对象地址找到对应的 ObjectAssociationMap。

- 根据 key 找到对应的 ObjcAssociation。

- 根据 policy 对旧值 release，对新值 retain/copy。

- 更新表。

### 3.2 释放对象

当对象销毁时 (dealloc)：

- Runtime 调用 objc\_destructInstance。

- 检查 isa.has\_assoc 标记位。

- 如果有，调用 \_object\_remove\_assocations。

- 从全局 Map 中移除该对象的所有关联数据，并对 Value 发送 release。

**总结**：关联对象不会造成内存泄漏，它们会随着宿主对象的销毁而自动释放。