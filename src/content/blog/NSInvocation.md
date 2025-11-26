---
title: "NSInvocation 详解"
description: "Objective-C Runtime 中非常强大、但也容易让人晕头转向的一个类。理解了它，你就理解了 Objective-C 动态消息发送的核心机制。"
publishedAt: "2025-11-24"
tags:
  - "iOS"
  - "面试"
  - "NSInvocation"
---
![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251124161146484.png)


### 1. 什么是 NSInvocation？

**一句话定义：**\
NSInvocation 是一个**被“冷冻”的方法调用对象**。

**普通调用（热调用）：**\
当你写 \[object method:arg] 时，程序运行到这行代码，就像开枪一样，子弹（消息）立刻飞出去，击中目标，事情马上发生。

**NSInvocation（冷调用）：**\
想象你把一把枪（Target）、装什么子弹（参数）、瞄准哪里（Selector）全部设置好，然后**按下暂停键**，把它封存进一个盒子里。\
这个盒子就是 NSInvocation。

- 你可以把盒子传给别人。

- 你可以过一小时再打开盒子开枪（\[invocation invoke]）。

- 你可以修改瞄准的目标（修改 target）。

***

### 2. 为什么需要它？

普通的 \[obj method] 必须在**编译写代码时**就知道你要调什么方法、传什么参数。\
但在很多高级场景（比如路由组件、撤销/重做、消息转发）中，我们在写代码时**根本不知道**将来要调哪个对象的哪个方法，参数也是动态的。

这时候就需要 NSInvocation 来动态组装。

***

### 3. 核心三部曲：签名、组装、触发

使用 NSInvocation 就像是**手动填报销单**，步骤非常严格。

#### 第一步：搞到“蓝图” (NSMethodSignature)

你要调用一个方法，必须先知道这个方法长什么样：返回值是啥？有几个参数？参数类型是啥？\
这就是**方法签名**。



```objc
// 假设我们要调用的目标方法是：
// - (void)printName:(NSString *)name age:(int)age;

SEL selector = @selector(printName:age:);
// 从目标类里拿到这个方法的签名（蓝图）
NSMethodSignature *signature = [TargetClass instanceMethodSignatureForSelector:selector];

// 蓝图里包含了类型编码，比如 "v@:@i" 
// v: void (返回)
// @: self (隐参数1)
// :: _cmd (隐参数2)
// @: NSString* (参数3)
// i: int (参数4)
```

#### 第二步：根据蓝图制造盒子 (invocationWithMethodSignature)

有了蓝图，就能制造出一个能容纳这些参数的空盒子。


```objc
NSInvocation *invocation = [NSInvocation invocationWithMethodSignature:signature];
```

#### 第三步：手动填空（设置 Target, Selector, Arguments）

这是最容易出错的地方，有两个铁律：

**铁律 1：索引从 2 开始**\
Objective-C 的任何方法，底层实际上都有两个**隐藏参数**：

- Index 0: self (方法调用者)

- Index 1: \_cmd (当前方法的 Selector)

- Index 2: **这才是你定义的第一个参数！**

**铁律 2：传递指针的指针**\
setArgument:atIndex: 这个方法非常底层，它不管你传的是对象还是整数，它只负责**从内存地址拷贝数据**。\
所以，你必须传值的**地址 (&)**。



```objc
// 设置目标和方法
[invocation setTarget:myTargetObj];
[invocation setSelector:selector];

// 准备参数
NSString *argName = @"Jack";
int argAge = 18;

// 注意：这里传的是 &argName，即“指针的地址”
// 因为 argName 本身是个指针，我们要把这个指针的值拷贝进 invocation
[invocation setArgument:&argName atIndex:2]; 

// 注意：这里传的是 &argAge，即“整数的地址”
[invocation setArgument:&argAge atIndex:3];
```

#### 第四步：开火 (invoke)

这一步才是真正执行代码。

codeObjective-C

```
[invocation invoke]; 
// 此时，myTargetObj 的 printName:age: 方法被调用
```

#### 第五步：拿战利品 (getReturnValue)

如果有返回值，也得去内存地址里取。

codeObjective-C

```
int result;
[invocation getReturnValue:&result];
```

***

### 4. 内存模型图解 (为什么传参数要用 &?)

这是 NSInvocation 最难理解的点。让我们看看底层内存发生了什么。

假设方法是 - (void)setAge:(int)age。

- **准备阶段**：\
  你定义了 int age = 18;\
  在内存里，age 占了 4 个字节，存着二进制的 18。

- **设置参数**：\
  \[invocation setArgument:\&age atIndex:2];

  - NSInvocation 内部有一个缓冲区（Buffer）。

  - 你把 \&age（地址）传进去。

  - NSInvocation 根据签名知道 Index 2 是个 int（4字节）。

  - 它跑到 \&age 这个地址，**把这 4 个字节的数据 memcpy（复制）到它自己的缓冲区里**。

**如果是对象呢？**\
假设方法是 - (void)setName:(NSString \*)name。

- **准备阶段**：\
  你定义了 NSString \*name = @"Jack";

  - @"Jack" 这个对象在堆内存 0xFF00。

  - 变量 name 是一个指针，它存的值是 0xFF00。
- **设置参数**：\
  \[invocation setArgument:\&name atIndex:2];

  - 注意：这里传的是 \&name（指针变量的地址），而不是 name（对象的地址）。

  - NSInvocation 根据签名知道 Index 2 是个对象指针 @（8字节）。

  - 它跑到 \&name 这个地址，**把 0xFF00 这个地址值复制到它自己的缓冲区里**。

**结论**：NSInvocation 只管拷贝内存。所以无论参数是什么类型，你都要把存着那个数据的变量的**地址**给它。

***

### 5. retainArguments 的坑

默认情况下，NSInvocation **不会**持有（Retain）你传给它的对象参数。它只是傻傻地复制了指针地址。

- 如果你 invoke 完马上就释放 invocation，没问题。

- **但是**，如果你把 invocation 存起来（比如做成一个 Operation 放到队列里过会儿执行），而在执行前，原来的参数对象 argName 被释放了，那么 invocation 里存的指针就变成了**野指针**，一调就 Crash。

**解决方法**：\
调用 \[invocation retainArguments];。\
这会强制 NSInvocation 把所有对象类型的参数都 retain 一次，把 C 字符串复制一份，确保延时执行是安全的。