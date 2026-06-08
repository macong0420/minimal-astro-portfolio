---
title: "面试备战 Flutter 07：Key、Element 复用与状态保持"
description: "从 Element 匹配规则、LocalKey、GlobalKey、ValueKey、ObjectKey、UniqueKey、列表状态错乱和 GlobalKey 成本深入拆解 Flutter Key。"
publishedAt: "2026-06-08"
tags: ["面试", "Flutter", "Key", "Element"]
---

# 面试备战 Flutter 07：Key、Element 复用与状态保持

Key 的本质不是“唯一标识 Widget”，而是参与 Element 匹配，决定状态是否复用。

## 1. Element 复用规则

Flutter 更新子节点时比较：

```text
oldWidget.runtimeType == newWidget.runtimeType
oldWidget.key == newWidget.key
```

满足则复用 Element，不满足则卸载旧节点创建新节点。

## 2. 为什么列表需要 Key？

无 Key 时列表按位置复用。

插入新 item 后：

```text
旧位置 0 的 State 可能给了新位置 0
```

导致 checkbox、输入框、动画状态串位。

正确：

```dart
TodoItem(
  key: ValueKey(todo.id),
  todo: todo,
)
```

## 3. LocalKey

只在同一父节点下比较。

常见：

- ValueKey。
- ObjectKey。
- UniqueKey。

## 4. ValueKey

根据值判断身份。最常用，适合业务 id。

```dart
ValueKey(user.id)
```

## 5. ObjectKey

根据对象身份判断。对象实例稳定时可用。

如果每次 build 都创建新对象，ObjectKey 也会失去稳定性。

## 6. UniqueKey

每次唯一，会强制不复用。

适合明确要重建的场景，不适合普通列表。

## 7. GlobalKey

能力：

- 全局唯一。
- 跨父节点移动保留 State。
- 获取 State/Context。
- Form 校验。

代价：

- 全局注册、维护全局表。
- reparent 时 element 停用/重激活的开销。
- 容易破坏封装。
- 同一个 GlobalKey 不能同时挂在树上两个位置,否则抛 `Multiple widgets used the same GlobalKey`。

## 高频追问

### Q1：Key 为什么能保持状态？

因为 State 由 Element 持有，Key 决定新 Widget 能否复用旧 Element。

### Q2：为什么不用 index 做 Key？

插入、删除、排序后 index 会变，状态仍然可能串。

### Q3：GlobalKey 为什么贵？

成本不在“查找”(走全局注册表哈希,O(1)),而在维护全局表,以及 GlobalKey 对应 Element 在树中移动(reparent)时会触发 deactivate/reactivate,可能引发其子树 RenderObject 重新挂载。

## 8. PageStorageKey 解决什么？

PageStorageKey 常用于保存滚动位置。

例如 TabBarView 里多个列表切换：

```dart
ListView.builder(
  key: const PageStorageKey('order-list'),
  itemBuilder: ...
)
```

它不是普通身份匹配那么简单，而是配合 PageStorage 保存页面状态，例如 scroll offset。

## 9. Key 的作用范围

LocalKey 只在同一个父节点的 children 中比较。

这意味着：

```dart
Column(
  children: [
    Container(child: Item(key: ValueKey(1))),
    Container(child: Item(key: ValueKey(1))),
  ],
)
```

这两个 `ValueKey(1)` 各自的父是不同的 `Container`,不是 siblings,所以不冲突。

但去掉 Container、让它们成为直接 siblings 就会报错(`Duplicate keys found`):

```dart
Column(children: [
  Item(key: ValueKey(1)),
  Item(key: ValueKey(1)), // ❌ 同一组 children 下 key 重复
])
```

## 10. GlobalKey 的典型正确用法

### Form 校验

```dart
final formKey = GlobalKey<FormState>();

formKey.currentState?.validate();
```

### ScaffoldMessenger / Navigator

某些全局导航或消息场景可以使用，但现在更推荐 Router、context 扩展或状态管理封装，避免到处 currentState。

## 11. Key 使用坏味道

- 为所有 Widget 都加 Key。
- 列表使用 index key。
- 每次 build 生成 UniqueKey。
- 用 GlobalKey 做普通数据传递。
- 用 Key 掩盖状态设计混乱。

Key 应该解决身份问题，不应该替代状态管理。


## 深挖追问：Key 参与的是兄弟节点匹配

Key 的作用范围要说准：

> Key 只在同一父 Element 下的同类型兄弟节点匹配中发挥作用。它帮助 Framework 判断旧 Element 能不能复用给新 Widget。

列表插入问题：

```text
无 key:
[A state] [B state] [C state]
插入 X 后按位置复用，状态可能错位

有 ValueKey(id):
Framework 按 key 找到对应旧 Element
状态跟着业务 id 走
```

为什么不用 index 做 key？

- index 不是稳定身份。
- 插入、删除、排序后 index 会变化。
- 状态会跟位置走，不跟数据走。

GlobalKey 深挖：

- 可以跨父节点移动并保留 State。
- Framework 需要全局注册和查找。
- reparent 会触发 deactivate/activate，影响依赖和布局。
- 滥用会增加全局管理成本，也可能隐藏架构问题。

PageStorageKey：

> 它常用于保存滚动位置等页面局部状态，本质是借助 PageStorage bucket 存储状态，不是让 Element 永远不销毁。

AutomaticKeepAliveClientMixin 追问：

- 它解决懒加载列表/tab 中 child 是否保活。
- 保活会增加内存。
- 适合表单、视频、复杂页面状态，不适合所有 item 都 keepAlive。

项目表达：

> 我用 Key 的原则是：业务列表用稳定业务 id；临时强制重建才用 UniqueKey；跨树访问和保状态慎用 GlobalKey，优先通过状态管理或路由传递解决。

## 一句话总结

Key 定义的是 Element 身份；列表用稳定业务 id，GlobalKey 只在确实需要跨层级访问或移动 State 时使用。
