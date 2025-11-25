---
title: "iOS 底层原理：KVO (Key-Value Observing)"
description: ""
publishedAt: 2025-11-20
tags:
  - "iOS"
  - "面试"
---

## 1. 实现机制：ISA Swizzling

KVO 是通过 Runtime 动态生成子类实现的。

当 `[obj addObserver:...]` 被调用时：

1.  **动态子类化**：Runtime 动态生成一个 `NSKVONotifying_OriginalClass` 类，该类继承自原类。
2.  **修改 ISA**：将 `obj` 的 `isa` 指针指向这个新生成的中间类。
3.  **重写 Setter**：在子类中重写被观察属性的 setter 方法。

## 2. Setter 重写逻辑

重写后的 setter 伪代码大致如下：

```objc
- (void)setName:(NSString *)name {
    [self willChangeValueForKey:@"name"];
    
    // 调用父类（原类）的 setter 实现
    // 或者是通过 handle 获取原 setter imp
    [super setName:name]; 
    
    [self didChangeValueForKey:@"name"];
}
```

didChangeValueForKey 内部会触发 observeValueForKeyPath 回调。

## 3. 其它覆盖的方法

除了 setter，NSKVONotifying\_xxx 类还重写了：

- **class**：返回父类的 Class 对象。

  - 目的：欺骗开发者。调用 \[obj class] 依然返回 OriginalClass，隐藏 KVO 的底层实现。

- **dealloc**：处理收尾工作。

- **\_isKVOA**：返回 YES，标记这是个 KVO 类。

## 4. 面试题：手动触发 KVO？

可以。

- 关闭自动触发：+ (BOOL)automaticallyNotifiesObserversForKey:(NSString \*)key 返回 NO。

- 手动调用：

```objc
[self willChangeValueForKey:@"name"];
_name = name;
[self didChangeValueForKey:@"name"];
```


