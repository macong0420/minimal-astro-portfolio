---
title: "面试备战 iOS 13：UIKit 事件响应链与手势"
description: "从 hitTest、pointInside、响应链、UIResponder、UIGestureRecognizer 状态机和手势冲突治理深入拆解 UIKit 事件系统。"
publishedAt: "2026-06-08"
tags: ["面试", "iOS", "UIKit", "手势"]
---

# 面试备战 iOS 13：UIKit 事件响应链与手势

UIKit 事件系统要分三层：

```text
命中测试：谁接收触摸
响应链：谁处理事件
手势识别：多个 recognizer 如何竞争
```

很多人把 hitTest 和响应链混在一起，这是面试大坑。

## 1. 事件从哪里来？

大致流程：

```text
硬件触摸 -> SpringBoard / 系统 -> App 进程 -> UIApplication -> UIWindow -> hitTest
```

UIWindow 从根视图开始寻找最合适的 view。

## 2. hitTest 做什么？

核心方法：

```objc
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event;
- (BOOL)pointInside:(CGPoint)point withEvent:(UIEvent *)event;
```

规则：

1. view 必须可交互。
2. 不能 hidden。
3. alpha 不能太低(系统判定 alpha <= 0.01 的 view 不接收事件)。
4. pointInside 返回 YES。
5. 倒序遍历子视图。
6. 找到最深、最上层命中 view。

倒序是因为后添加的子视图视觉层级更靠上。

## 3. 扩大点击区域怎么做？

不要只改 frame。可以重写：

```objc
- (BOOL)pointInside:(CGPoint)point withEvent:(UIEvent *)event {
    CGRect bounds = CGRectInset(self.bounds, -10, -10);
    return CGRectContainsPoint(bounds, point);
}
```

如果要改变事件转发给哪个子 view，重写 hitTest。

## 4. 响应链是什么？

命中 view 找到后，如果它不处理事件，事件沿 responder chain 向上传递。

常见链：

```text
UIView -> UIViewController -> UIWindow -> UIApplication -> UIApplicationDelegate
```

末端是 `UIApplicationDelegate`(若它是 UIResponder 子类)。iOS 13+ 用 SceneDelegate 的工程,链路末端会有差异。

UIViewController 能参与响应链，是因为 view 的 nextResponder 可能指向 controller。

## 5. Gesture Recognizer 如何参与？

手势识别器依附在 view 上，会接收触摸序列并进入状态机。要分清离散手势和连续手势，它们走的状态路径不同：

**离散手势**（如 Tap）：

```text
possible -> recognized   （识别成功，等价于 ended）
possible -> failed        （识别失败）
```

**连续手势**（如 Pan、Pinch）：

```text
possible -> began -> changed -> ended
                            -> cancelled
                            -> failed
```

一个关键细节：`UIGestureRecognizerStateRecognized` 和 `UIGestureRecognizerStateEnded` 是**同一个枚举值**（都等于 3）。所以离散手势不会经历 began/changed，而是从 possible 直接跳到 recognized(=ended)。

手势识别成功后触发 action。

## 6. 手势冲突怎么处理？

delegate 方法：

```objc
gestureRecognizer:shouldRecognizeSimultaneouslyWithGestureRecognizer:
gestureRecognizer:shouldReceiveTouch:
gestureRecognizer:shouldRequireFailureOfGestureRecognizer:
```

典型场景：

- ScrollView 嵌套。
- 左滑返回和横向滚动。
- 地图拖拽和页面滚动。
- Cell 左滑和列表滚动。

原则：

> 不要简单禁用，要定义优先级、方向、边界和失败依赖。

## 高频追问

### Q1：hitTest 和响应链区别？

hitTest 决定最初谁接收触摸；响应链决定事件没被处理时向哪里传。

### Q2：为什么子 view 超出父 view bounds 后点不到？

默认父 view 的 pointInside 返回 NO 后，不再递归子 view。需要重写父 view 的 pointInside/hitTest。

### Q3：手势识别器是不是 UIResponder？

不是。它依附于 view，参与触摸识别，但不在 responder chain 中。

### Q4：如何处理返回手势和横滑冲突？

边缘区域返回优先，内容区域横滑优先；必要时通过 gesture delegate 设置失败依赖或同时识别。

## 6. ScrollView 为什么会影响按钮点击？

UIScrollView 为了判断用户是点击还是滚动，会对 touches 有延迟和取消机制。

相关属性：

- `delaysContentTouches`
- `canCancelContentTouches`

现象：

- 按钮在 ScrollView 中点击有延迟。
- 手指移动后按钮 touch 被 cancel。

这不是按钮问题，而是 ScrollView 为滚动体验做的手势判断。底层链路是:手势识别成功后,因默认 `cancelsTouchesInView = YES`,hitTest 命中的 view 会收到 `touchesCancelled`,所以按钮的高亮被取消。

## 7. exclusiveTouch 和多点触控

`exclusiveTouch` 可以限制一个 view 响应触摸时，其他 view 不响应触摸。

`multipleTouchEnabled` 控制一个 view 是否接收多点触摸。

这些在支付按钮、防重复点击、复杂手势区域中会用到。

## 8. Flutter 混合栈里的事件问题

FlutterView 是 UIView，所以 iOS hitTest 会先决定触摸是否进入 FlutterView。

如果外层 Native 手势先拦截，比如侧滑返回，Flutter 内部 Gesture Arena 根本拿不到完整触摸序列。

所以混合手势排查顺序应该是：

```text
Native hitTest
-> Native UIGestureRecognizer
-> FlutterView
-> Flutter Gesture Arena
```


## 深挖追问：事件链要区分 hit-test、responder 和 gesture arena

UIKit 事件处理可以拆三层：

```text
硬件触摸
  -> IOKit / SpringBoard / app event queue
  -> UIApplication 分发 UIEvent
  -> UIWindow hitTest 找到 view
  -> Gesture Recognizer 参与识别
  -> UIResponder 链处理 touches/action
```

`hitTest:withEvent:` 解决的是“事件最初落到哪个 view”；响应链解决的是“这个对象不处理时往哪里传”。两者不是一回事。

hit-test 继续追问：

- 从 window 开始，逆序遍历 subviews，优先最上层。
- `hidden`、`userInteractionEnabled = NO`、`alpha` 很低、`pointInside` 为 NO 都会影响命中。
- 子 view 超出父 view bounds 后点不到，通常是父 view 的 `pointInside` 先返回 NO。
- 扩大点击区域常重写 `pointInside`，而不是只改 frame。

---

## 🔬 深度扩展：hitTest递归与手势识别器状态机

### 扩展1：hitTest的完整递归流程

**源码级实现：**
```objc
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    // 1. 基本条件检查
    if (self.hidden || !self.userInteractionEnabled || self.alpha < 0.01) {
        return nil;
    }
    
    // 2. pointInside 检查
    if (![self pointInside:point withEvent:event]) {
        return nil;
    }
    
    // 3. 逆序遍历子视图（后添加的在上层）
    for (UIView *subview in [self.subviews reverseObjectEnumerator]) {
        // 坐标转换到子视图
        CGPoint convertedPoint = [self convertPoint:point toView:subview];
        
        // 递归调用
        UIView *hitView = [subview hitTest:convertedPoint withEvent:event];
        
        if (hitView) {
            return hitView;  // 找到最上层的
        }
    }
    
    // 4. 子视图都没命中，返回自己
    return self;
}
```

**关键点：**
- 逆序遍历（后加的先判断）
- 递归到叶子节点
- 坐标系转换

### 扩展2：扩大点击区域的实现

**重写 pointInside：**
```objc
@implementation UIButton (HitTest)

- (BOOL)pointInside:(CGPoint)point withEvent:(UIEvent *)event {
    // 扩大 20pt
    CGRect expandedBounds = CGRectInset(self.bounds, -20, -20);
    return CGRectContainsPoint(expandedBounds, point);
}

@end
```

**为什么不改frame？**
- 改 frame 影响布局
- 可能和兄弟视图重叠
- pointInside 只影响响应区域

### 扩展3：手势识别器的状态机

**UIGestureRecognizerState：**
```objc
typedef NS_ENUM(NSInteger, UIGestureRecognizerState) {
    UIGestureRecognizerStatePossible,      // 初始状态
    UIGestureRecognizerStateBegan,         // 识别开始（连续手势）
    UIGestureRecognizerStateChanged,       // 识别变化中
    UIGestureRecognizerStateEnded,         // 识别结束
    UIGestureRecognizerStateCancelled,     // 被取消
    UIGestureRecognizerStateFailed,        // 识别失败
    UIGestureRecognizerStateRecognized = UIGestureRecognizerStateEnded  // 识别成功（离散手势）
};
```

**状态转换：**
```text
Possible（初始）
  ↓
  触摸开始
  ↓
判断是否满足条件
  ├→ 满足（连续手势）→ Began → Changed → Ended/Cancelled
  ├→ 满足（离散手势）→ Recognized
  └→ 不满足 → Failed
```

### 扩展4：手势冲突的解决策略

**1. delegate方法控制：**
```objc
// 是否允许同时识别
- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer {
    return YES;  // 允许同时识别
}

// 是否应该接收touch
- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
       shouldReceiveTouch:(UITouch *)touch {
    // 点击在某个子视图上就不响应
    if ([touch.view isKindOfClass:[UIButton class]]) {
        return NO;
    }
    return YES;
}
```

**2. require依赖：**
```objc
// doubleTap 失败后才识别 singleTap
[singleTap requireGestureRecognizerToFail:doubleTap];
```

**3. cancelsTouchesInView：**
```objc
gesture.cancelsTouchesInView = NO;  // 识别成功不取消view的touch
```

### 扩展5：响应链的action传递

**target-action机制：**
```objc
[button addTarget:nil action:@selector(buttonTapped:) forControlEvents:UIControlEventTouchUpInside];
```

**target为nil时的查找顺序：**
```text
button
  → button.nextResponder（可能是superview）
  → ... 沿响应链向上
  → viewController
  → viewController.nextResponder（可能是navigationController）
  → window
  → UIApplication
  → appDelegate
```

**第一个实现该方法的响应者处理**

### 扩展6：子视图超出父视图bounds的处理

**问题场景：**
```objc
UIView *parent = [[UIView alloc] initWithFrame:CGRectMake(0, 0, 100, 100)];
parent.clipsToBounds = NO;  // 不裁剪

UIButton *button = [[UIButton alloc] initWithFrame:CGRectMake(80, 80, 50, 50)];
[parent addSubview:button];
// button 右下角超出了 parent
```

**为什么点不到超出部分？**
```text
hitTest 流程：
1. parent.pointInside(点击位置) → 超出部分返回 NO
2. 直接返回 nil，不会递归到 button
```

**解决方案：**
```objc
@implementation UIView (HitTest)

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    if (self.hidden || !self.userInteractionEnabled || self.alpha < 0.01) {
        return nil;
    }
    
    // 遍历子视图，不检查 pointInside
    for (UIView *subview in [self.subviews reverseObjectEnumerator]) {
        CGPoint convertedPoint = [self convertPoint:point toView:subview];
        UIView *hitView = [subview hitTest:convertedPoint withEvent:event];
        if (hitView) {
            return hitView;
        }
    }
    
    // 自己的 pointInside 检查
    if ([self pointInside:point withEvent:event]) {
        return self;
    }
    
    return nil;
}

@end
```

### 扩展7：ScrollView的delaysContentTouches

**问题：**
```objc
UIButton *button = ...;
[scrollView addSubview:button];
// 点击button有延迟
```

**原因：**
```text
ScrollView 需要判断是点击还是滚动
delaysContentTouches = YES（默认）
→ 延迟 150ms 把 touch 传给子视图
→ 如果手指移动，判定为滚动，取消子视图的 touch
```

**解决：**
```objc
scrollView.delaysContentTouches = NO;  // 立即传递

// 或者重写
- (BOOL)touchesShouldCancelInContentView:(UIView *)view {
    if ([view isKindOfClass:[UIButton class]]) {
        return YES;  // button 可以被滚动打断
    }
    return [super touchesShouldCancelInContentView:view];
}
```

---

## 补充总结

响应链与手势的深度记忆点：

1. **hitTest递归**：逆序遍历子视图，坐标转换，返回最上层命中view
2. **pointInside**：扩大点击区域重写这个方法，不改frame
3. **手势状态机**：Possible → Began/Recognized/Failed
4. **手势冲突**：delegate控制、require依赖、cancelsTouchesInView
5. **响应链传递**：target为nil时沿nextResponder查找
6. **超出bounds**：父视图pointInside返回NO会阻止递归
7. **ScrollView延迟**：delaysContentTouches控制touch传递时机

面试追问时要能讲出：
- hitTest的完整递归流程（逆序、转换、递归）
- 手势识别器的状态转换（Possible → Began/Recognized/Failed）
- 为什么子视图超出bounds点不到（父视图pointInside先检查）
- ScrollView点击延迟的原因（delaysContentTouches判断滚动）

手势识别继续追问：

- Gesture Recognizer 不是 UIResponder。
- 它观察 touch 序列，状态从 possible 到 began/changed/ended/failed/cancelled。
- `cancelsTouchesInView` 会影响 touch 是否继续给 view。
- `delaysContentTouches`/`canCancelContentTouches` 会影响 ScrollView 内按钮体验。
- 冲突处理靠 require-to-fail、delegate 同时识别、优先级和业务状态。

混合栈追问：

> Flutter 页面嵌在 Native 栈里时，iOS edge pop、Flutter 内部横滑、ScrollView 横滑可能同时竞争。不能只靠关闭某个手势，要根据页面栈状态、滑动方向、contentOffset、Flutter 是否可 pop，建立统一仲裁。

典型项目表达：

> 我会把手势冲突抽象成“谁拥有本次 touch 序列”。Native 返回手势只在 Flutter 内部不可返回且横向起点满足边缘条件时生效；Flutter 内部滚动根据 arena 和页面状态决定是否让出。

## 一句话总结

UIKit 事件系统先 hitTest 找目标 view，再通过响应链处理事件，手势识别器则在触摸序列中独立竞争识别权。
