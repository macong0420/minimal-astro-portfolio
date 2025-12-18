---
title: "Method Swizzling原理,应用,坑"
description: "Method Swizzling 的本质是在 Runtime 运行时，修改 `objc_class` 结构体中 `method_list` 里的映射关系。"
publishedAt: 2025-12-15
tags:
  - "IOS"
  - "Runtime"
---

![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251215164819149.png)

### 一、 核心原理 (The Underlying Mechanism)

Method Swizzling 的本质是在 Runtime 运行时，修改 `objc_class` 结构体中 `method_list` 里的映射关系。

#### 1. SEL 与 IMP 的映射

在 Runtime 中，方法调用是一个查找过程：

- **SEL (Selector):** 方法的名字（键）。
    
- **IMP (Implementation):** 指向方法具体实现的函数指针（值）。
    

正常情况下：`@selector(viewWillAppear:)` -> `地址 A` Swizzling 后：`@selector(viewWillAppear:)` -> `地址 B (自定义方法)`，同时我们通常会将 `地址 A` 保存到另一个 SEL 中（如 `xxx_viewWillAppear:`）。

#### 2. 修改过程

通常使用 `method_exchangeImplementations`，但严谨的实现包含两个步骤：

1. **Look Up:** 在当前类查找 Method 对象。
    
2. **Add or Exchange:**
    
    - 如果当前类没有该方法（方法在父类中），直接交换会修改父类的 Method List，导致其他继承自该父类的子类也被 Hook（严重副作用）。
        
    - **正确做法：** 先尝试 `class_addMethod`。如果成功，说明原类没有实现，我们将原方法的 IMP 指向父类实现，再用 `class_replaceMethod` 替换；如果失败，说明原类有实现，直接 `method_exchangeImplementations`。
        

---

### 二、 核心坑点与架构隐患 (Critical Pitfalls)

作为架构师，我们在引入 Swizzling 时最担心的是**不可控的副作用**。

#### 1. 类簇 (Class Clusters) 的 Hook

**问题：** `NSArray`、`NSDictionary`、`NSString` 等是类簇。

- `[NSArray array]` 返回的不仅仅是 `NSArray`，可能是 `__NSArrayI` (不可变)、`__NSArrayM` (可变)、`__NSSingleObjectArrayI` 等私有子类。
    
- **坑点：** 如果你只 Hook 了 `NSArray` 的 `objectAtIndex:`，是无效的，因为真正执行代码的是那些私有子类。
    
- **对策：** 必须通过 Runtime 找到真实的私有类名（如 `objc_getClass("__NSArrayI")`）逐个进行 Hook。
    

#### 2. 父类方法 Hook (The Superclass Problem)

**问题：** 如前所述，如果子类没有实现该方法，直接交换会污染父类。 **对策：** 严格遵守 **"先 Add 后 Exchange"** 的标准模板（见后文代码）。

#### 3. 多次 Hook 与 顺序问题 (Multiple Hooks)

**问题：** 如果项目里集成了多个第三方 SDK（如 A 厂商统计 SDK，B 厂商 APM SDK），它们都 Hook 了 `UIViewController` 的 `viewWillAppear:`。

- **现象：** 形成调用链（Chain）。A Hook 原法 -> B Hook A -> ...
    
- **隐患：**
    
    - 如果其中一个 Hook 实现中忘记调用 `xxx_viewWillAppear`（原方法），整个链条断裂，导致其他 SDK 或业务逻辑失效。
        
    - **卸载困难：** Swizzling 很难安全地“取消”。如果中间某个 SDK 试图恢复原状，可能会破坏整个调用链，导致 Crash（IMP 指针悬垂）。
        

#### 4. 原子性与线程安全

**问题：** Swizzling 修改的是全局的类表。如果在多线程环境下并发进行 Swizzling，可能导致访问到不稳定的中间状态。 **对策：** 所有的 Swizzling 操作必须在 `+ (void)load` 方法中进行，并使用 `dispatch_once` 保证只执行一次且线程安全。

#### 5. 命名冲突

**问题：** 如果你给原本的方法起别名为 `original_viewWillAppear:`，万一其他库也用了这个名字，就会覆盖。 **对策：** 必须加以前缀，例如 `bk_viewWillAppear:` (贝壳前缀)。

---

### 三、 工业级应用场景 (Production Scenarios)

#### 1. 无埋点统计 (Codeless Analytics)

这是最典型的 AOP（面向切面编程）应用。

- **页面 PV:** Hook `UIViewController` 的 `viewWillAppear:`。
    
- **点击事件:**
    
    - Hook `UIControl` 的 `sendAction:to:forEvent:` (覆盖 UIButton, UISwitch 等)。
        
    - Hook `UIGestureRecognizer` 的 `initWithTarget:action:` 及后续触发流程 (处理手势点击)。
        
    - Hook `UITableView` / `UICollectionView` 的 `setDelegate:`，通过 **"动态代理 (Proxy)"** 或 **"ISA Swizzling"** 拦截 `didSelectRowAtIndexPath`。
        

#### 2. APM (应用性能监控)

- **网络监控:** Hook `NSURLSession` 或 `NSURLConnection` 的相关代理方法，或者使用 `NSURLProtocol` (虽然 `NSURLProtocol` 不是 Swizzling，但也是拦截思路) 来统计流量、耗时、成功率。
    
- **卡顿监控:** 虽然卡顿主要靠 RunLoop 监控，但 Swizzling 可以辅助获取上下文。
    
- **启动耗时:** Hook `+load` 方法（极其危险，一般通过分析 Mach-O 数据段实现，而非运行时 Hook）或 `UIApplication` 的生命周期代理。
    

#### 3. 容错与防 Crash (Safety Shield)

大厂必备的“大底”逻辑。

- **集合类防越界:** Hook `NSArray`, `NSMutableArray`, `NSDictionary` 的 `objectAtIndex:`, `setObject:forKey:` 等。当参数非法（如 nil key 或 index越界）时，捕获异常并上报，而不是让 App 崩溃。
    
- **Unrecognized Selector:** Hook `NSObject` 的 `forwardingTargetForSelector:`，将无法响应的消息转发给一个桩对象 (Stub Object)，吞掉异常。
    

#### 4. 处理系统差异与热修复

- **字体/UI全局修正:** 在某些 iOS 版本出现 UI 渲染 Bug 时，可以通过 Hook 对应的布局方法进行统一修正。
    
- **热修复 (HotFix):** 虽然 JSPatch 被封禁，但其原理核心就是利用 Swizzling 将 OC 方法替换为 `_objc_msgForward`，转而执行 JS 下发的逻辑。
    

---

### 四、 标准化代码模板 (Standard Implementation)

这是在 Code Review 中能通过的严谨写法：


```objc
#import <objc/runtime.h>

+ (void)bk_swizzleInstanceMethod:(SEL)originalSel with:(SEL)swizzledSel {
    Class class = [self class];
    
    Method originalMethod = class_getInstanceMethod(class, originalSel);
    Method swizzledMethod = class_getInstanceMethod(class, swizzledSel);
    
    // 1. 尝试添加方法 (处理子类没有实现该方法的情况)
    BOOL didAddMethod = class_addMethod(class,
                                        originalSel,
                                        method_getImplementation(swizzledMethod),
                                        method_getTypeEncoding(swizzledMethod));
    
    if (didAddMethod) {
        // 2. 如果添加成功，说明原类没有这个方法，现在 originalSel 指向了 swizzledImplementation。
        // 我们需要把 swizzledSel 替换为 originalImplementation (即父类的实现)。
        class_replaceMethod(class,
                            swizzledSel,
                            method_getImplementation(originalMethod),
                            method_getTypeEncoding(originalMethod));
    } else {
        // 3. 如果添加失败，说明原类已经实现了该方法，直接交换。
        method_exchangeImplementations(originalMethod, swizzledMethod);
    }
}

// 调用示例
+ (void)load {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        [self bk_swizzleInstanceMethod:@selector(viewWillAppear:) 
                                  with:@selector(bk_viewWillAppear:)];
    });
}
```

### 总结

Method Swizzling 是一把双刃剑。

- **优点：** 极低侵入性，黑盒修改，AOP 的基石。
    
- **缺点：** 调试困难（堆栈混乱），版本升级风险（Apple 修改内部实现可能导致 Hook 失效），多库冲突。
    

**给架构师的建议：** 在团队内部，最好封装统一的 Swizzling 管理库（类似 RSSwizzle），引入“切面”概念，统一管理 Hook 的顺序和开关，严禁业务线随意手写 Swizzling 代码。

辅助记忆
我们将 Method Swizzling 拆解为三个形象的维度：**机制（换门牌）、流程（先礼后兵）、防坑（三个鬼）。**

---

### 一、 原理记忆： “换门牌号” (The Switch)

不要去背 `objc_method` 结构体，想象 **SEL 是门牌号**，**IMP 是屋里的具体的人**。

- **正常情况：** 敲门 `viewWillAppear` (SEL) -> 找到屋里的 `原生实现` (IMP)。
    
- **Swizzling：** 我们趁夜深人静，把两个房间的 **门牌号互换了**。
    
    - 敲 `viewWillAppear` (SEL) -> 进屋发现是 `自定义拦截代码` (IMP)。
        
    - 敲 `bk_viewWillAppear` (SEL) -> 进屋发现是 `原生实现` (IMP)。
        

> **核心点：** 改的是 **映射关系 (Mapping)**，不是改代码本身。

---

### 二、 写法记忆： “先礼后兵” (The Protocol)

这是最难记的代码逻辑（Add? Replace? Exchange?），用这个成语就通了：

1. **时机：天还没亮就行动**
    
    - **`+load`**: 必须在这里，因为 `main` 函数之前类被加载时就要搞定。
        
    - **`dispatch_once`**: 必须只干一次，不能手抖换来换去。
        
2. **动作：先礼后兵**
    
    - **先礼 (Check & Add):** `class_addMethod`
        
        - _含义：_ “哥们，你自己有这个方法吗？没有我就帮你加上。”
            
        - _场景：_ 防止子类没实现该方法，直接交换会把 **父类** 的实现给换了（污染父类）。
            
    - **后兵 (Exchange):**
        
        - **情况 A (Add 成功):** 说明子类原本没这个方法（用的是父类的）。那我们用 `class_replaceMethod` 把刚才加上去的那个方法的实现，指向父类的原实现。
            
        - **情况 B (Add 失败):** 说明子类自己实现了。那就简单粗暴，直接 `method_exchangeImplementations` **正面硬刚**。
            

> **口诀：** **Load 里 Once，先 Add 后 Exchange。**

---

### 三、 坑点记忆： “三个鬼” (The 3 Demons)

面试或做架构设计时，想到这三个“鬼”，就能把坑点说全：

#### 1. 替死鬼 (Class Clusters / 类簇)

- **记忆点：** 你以为你 Hook 的是 `NSArray`，其实干活的是 `__NSArrayI`。
    
- **场景：** `NSArray`、`NSDictionary`、`NSString`。
    
- **后果：** Hook 无效。
    
- **对策：** 必须 Hook **真身** (私有子类)。
    

#### 2. 捣蛋鬼 (Naming Conflict / 命名冲突)

- **记忆点：** 大家都叫 `new_viewWillAppear`。
    
- **场景：** 引入了两个 SDK（比如友盟和Bugly），它们如果都用了通用的命名。
    
- **后果：** 互相覆盖，甚至死循环。
    
- **对策：** 必须加 **前缀** (如 `bk_`)。
    

#### 3. 连环鬼 (Chain of Responsibility / 顺序与恢复)

- **记忆点：** 一条绳上的蚂蚱。
    
- **场景：** A Hook 了原方法，B 又 Hook 了 A。
    
- **后果：** 如果 B 在实现里忘了调 `super` (即 B 的原方法)，A 的 Hook 就失效了；或者如果 B 想卸载 Hook，很容易把 A 的指针弄丢，导致 Crash。
    
- **对策：** 尽量别去“卸载” Swizzling，一旦 Hook，终身生效。
    

---

### 四、 场景记忆： “保姆、医生、保安”

把应用场景对应到三个角色：

1. **保姆 (无埋点统计 AOP)**
    
    - _工作：_ 只要主人动了（点击、跳转），就默默记下来。
        
    - _Hook：_ `viewWillAppear` (页面), `sendAction:to:forEvent:` (点击)。
        
2. **医生 (APM / 性能监控)**
    
    - _工作：_ 检查身体指标（网络、流量）。
        
    - _Hook：_ `NSURLSession`, `NSURLConnection`。
        
3. **保安 (防 Crash / 容错)**
    
    - _工作：_ 遇到有人捣乱（数组越界、调错方法），拦住不让炸。
        
    - _Hook：_ `objectAtIndex:` (数组), `forwardingTargetForSelector:` (消息转发)。
        

---

### 总结一张图 (Mental Map)

如果你在脑海里画一张图，应该是这样的：

- **左边是“操作台”：** 在 `+load` 里，遵循“先礼后兵”的操作。
    
- **中间是“雷区”：** 避开“替身类簇”，防止“父类污染”，加上“唯一前缀”。
    
- **右边是“功能区”：** 站着保姆（统计）、医生（APM）、保安（防Crash）。
    

这样分类后，是否感觉逻辑清晰了很多？不需要死记硬背代码，只需要记住 **“先礼后兵”** 和 **“三个鬼”** 就能应对 90% 的面试追问。