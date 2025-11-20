---
title: "Objective-C Category 高阶技术点深度剖析"
description: "Category（分类）机制是 Objective-C 语言的一大特色，它允许在不修改或不知道原有类源码的情况下，动态地为类添加新的方法。其底层实现涉及 Runtime 的核心机制，是衡量 iOS 工程师技术深度的重要考察点。"
publishedAt: 2025-11-20
tags:
  - "iOS"
  - "面试"
---


![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251120174541852.png)

https://gemini.google.com/share/0acc473f5a27

# Objective-C Category 高阶技术点深度剖析

Category（分类）机制是 Objective-C 语言的一大特色，它允许在不修改或不知道原有类源码的情况下，动态地为类添加新的方法。其底层实现涉及 Runtime 的核心机制，是衡量 iOS 工程师技术深度的重要考察点。

***

## 1. Category 的加载时机与方法合并机制

Category 的加载并非简单地覆盖，而是复杂的运行时合并。

### 1.1 +load 与 +initialize 的差异

| 特性       | +load (定义在 Category 中)                                          | +initialize (定义在 Category 中)                         |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| **时机**   | Runtime 加载阶段（Load Time）。在程序启动时，所有类和 Category 都会调用，早于 `main` 函数。 | 首次消息发送时（First Message）。延迟加载，当类或其子类首次收到消息时调用。         |
| **覆盖性**  | 不会覆盖。主类和所有 Category 的 +load 方法都会被调用，顺序由编译器决定。                   | 会覆盖。Runtime 只调用优先级最高的（通常是 Category 中定义的）+initialize。 |
| **调用次数** | 进程生命周期内只调用一次。                                                   | 进程生命周期内只调用一次（针对某个类）。                                 |
| **继承性**  | 不具备继承性。子类不会调用父类的 +load。                                         | 具备继承性。子类首次使用时，如果子类没有实现，会调用父类的 +initialize。           |

**补充：+load 调用顺序规则**

1. 先调用父类的 +load
2. 再调用子类的 +load
3. 最后调用 Category 的 +load（按编译单元的顺序）

> 如果 Category 分布在不同的编译单元（.m 文件），链接器会按目标文件的顺序调用，顺序可能因编译环境不同而变化。

***

### 1.2 方法列表的“倒插”机制

Category 方法并非“替换”主类方法，而是“提前”。

**实现原理**

- 在 Runtime 的 `_objc_init` 阶段，通过 `map_2_data` 或 `attachCategories` 函数，Runtime 会将 Category 的方法列表、协议列表和属性列表，插入到主类 `class_rw_t` 结构体的最前面。
- `class_rw_t` 是类的运行时可写部分，`class_ro_t` 是只读部分（编译期确定）。Category 不会修改 `class_ro_t`。

**Mach-O 文件结构补充**

- Category 信息存储在 `__DATA,__objc_catlist` 段中。
- Runtime 初始化时会遍历这个段，将 Category 元数据合并到对应类的 `class_rw_t`。

**查找顺序**

- 当 `objc_msgSend` 查找方法时，它会从 `class_rw_t` 的方法列表数组（methods）的第一个元素开始遍历。
- 由于 Category 的方法被插入在数组头部，因此会先于主类方法被找到，造成了 Category 方法“覆盖”主类方法的假象。

***

### 1.3 Category 与元类（Meta-Class）

- 类方法实际上存储在元类（Meta-Class）的方法列表中。
- Category 添加的类方法会插入到元类的 `class_rw_t` 方法列表前面，覆盖主类的类方法。
- 元类的加载顺序与实例方法一致，只是作用对象是元类。

***

## 2. 关联对象（Associated Objects）与运行时属性

Category 无法直接添加实例变量（Ivars），因为类对象的内存布局在编译期已经固定。解决方式是使用关联对象。

### 2.1 关联对象的工作原理

**数据结构**

- 关联对象并非存储在实例对象内存中，而是存储在一个全局的 C++ 容器中，通常是 `AssociationsManager`（键值对的哈希表）。
- 结构链路：\
  `AssociationsManager` → `AssociationsHashMap`（Key: 对象地址, Value: 另一个 HashMap） → `ObjectAssociationMap`（Key: 关联键, Value: ObjcAssociation）。

**关联键**

- 必须是唯一的 `void *` 类型，通常使用静态变量地址 `static char key;` 或 `@selector(methodName)` 作为键。

**内存管理策略**

- 提供五种不同的策略：\
  `OBJC_ASSOCIATION_ASSIGN`\
  `OBJC_ASSOCIATION_RETAIN_NONATOMIC`\
  `OBJC_ASSOCIATION_COPY_NONATOMIC`\
  `OBJC_ASSOCIATION_RETAIN`\
  `OBJC_ASSOCIATION_COPY`

**性能与线程安全补充**

- 关联对象存储在全局哈希表中，访问需要加锁（spinlock），频繁访问会有性能损耗。
- `objc_setAssociatedObject` 内部使用锁机制保证线程安全，但如果关联对象本身是可变对象，仍需额外同步。

***

## 3. Category 的弊端与潜在问题

### 3.1 多个 Category 冲突问题

**方法冲突**

- 如果两个 Category 为同一个类添加了同名方法，Runtime 将以编译器链接（Link）顺序为准，将最后一个链接的 Category 方法插入到最前面。

**顺序不确定性**

- 链接顺序在不同编译环境下可能发生变化，导致程序行为不确定（Bad Practice）。

**解决方案**

- 在 Category 中定义的方法应该带有前缀，以防止与主类或其他 Category 产生命名冲突。

**调试技巧补充**

- 使用 `class_copyMethodList` 遍历方法列表，检查是否有重复的 SEL。
- 使用 `nm` 或 `otool -ov` 查看 Mach-O 文件中方法符号的定义位置，判断哪个 Category 最终覆盖了方法。

***

### 3.2 动态性与 Ivars 限制

- Category 只能添加方法和协议，不能添加实例变量。
- 实例变量决定了对象的内存布局（size），必须在编译期确定。

**Protocol Conformance**

- Category 可以添加协议，但不能直接实现协议中的 Required 实例方法（如果需要 Ivars 支持）。
- 在 Swift 中，Extension 可以实现协议方法，但不能添加存储属性。

***

## 4. 高级应用与运行时调试

### 4.1 动态添加协议和属性

- Category 中声明的协议会在加载时合并到主类的 `class_rw_t` 中，可以通过 `class_copyProtocolList` 查看到。
- Category 中声明的 `@property` 也会被合并。但由于没有对应的 Ivar，访问这些属性时，需要自己实现 getter/setter，并在其中调用 `objc_getAssociatedObject` 和 `objc_setAssociatedObject`。

***

### 4.2 运行时 Hook（Method Swizzling）

- Category 是实现 Method Swizzling 最常用的载体。
- 在 Category 的 +load 方法中（保证在 App 启动前执行），使用 `method_exchangeImplementations` 或 `class_replaceMethod` 等 Runtime API，交换 Category 中新方法的实现和主类中老方法的实现。

**安全性补充**

- 虽然 +load 是线程安全的，但 Swizzling 内部最好用 `dispatch_once` 保证只执行一次。
- Swizzling 时最好保留原方法实现（IMP），避免多次交换导致逻辑混乱。

***

## 5. Category 与 Extension 的区别

- **Objective-C Extension（匿名分类）**\
  可以添加实例变量，因为它在编译期与类一起编译。
- **Objective-C Category**\
  不能添加实例变量，只能添加方法、协议、属性（需关联对象实现）。
- **Swift Extension**\
  类似于 Objective-C Category，但不能添加存储属性，只能添加计算属性。

***

## 6. 最佳实践建议

1. 方法命名加前缀，避免冲突（如 `xxx_methodName`）。
2. 避免在 Category 中重写系统类的核心方法（如 `UIView` 的 `layoutSubviews`），除非明确知道覆盖的影响。
3. 对于需要添加状态的 Category，优先考虑关联对象，但注意性能和内存管理策略。
4. Swizzling 操作必须保证原子性和可控性，避免全局副作用。