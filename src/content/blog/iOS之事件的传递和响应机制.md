---
title: "iOS之事件的传递和响应机制"
description: "事件的产生和传递（事件如何从父控件传递到子控件并寻找到最合适的view、寻找最合适的view的底层实现、拦截事件的处理）->找到最合适的view后事件的处理（touches方法的重写，也就是事件的响应）其中重点和难点是：1.如何寻找最合适的view 2.寻找最合适的view的底层实现（hitTest:withEvent:底层实现）"
publishedAt: "2025-12-23"
tags:
  - "iOS"
  - "事件传递与响应者链"
---

![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251223191511461.png)


## 一、 基础概念：响应者对象 (UIResponder)

学习触摸事件首先要理解 **UIResponder**。在 iOS 中，不是任何对象都能处理事件，只有继承了 `UIResponder` 的对象才能接收并处理事件，我们称之为“响应者对象”。

常见子类包括：

- `UIView`
    
- `UIViewController`
    
- `UIApplication`
    
- `UIWindow` (继承自 UIView)
    

---

## 二、 事件的产生与底层源头（RunLoop 视角）

![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251223184125251.png)

这是面试中区分初级和资深开发的一个点：**事件是如何从硬件传到 App 的？**

1. **Source1 (Mach Port)**: 当用户触摸屏幕，系统（IOKit.framework）将触摸事件封装成 `IOHIDEvent` 对象，通过 IPC（进程间通信）机制发送给 App 进程。App 的 RunLoop 中的 `Source1` 回调接收到该消息，并唤醒 RunLoop。
    
2. **Source0**: RunLoop 被唤醒后，`Source1` 会触发 `Source0` 回调，将 `IOHIDEvent` 转化为 `UIEvent`，并由 `UIApplication` 进行分发。
    
3. **事件队列**: `UIApplication` 会管理一个事件队列。
    
    - **为什么是队列？** 队列遵循 FIFO（先进先出）原则，保证用户的操作按顺序被处理（例如先点确定再点取消，不能反过来）。
        

---

## 三、 事件的传递（Hit-Testing）—— 寻找最合适的 View

这是事件处理的第一步：**自上而下**（UIApplication -> Window -> View -> Subview）寻找“靶心”。

### 3.1 传递流程

1. `UIApplication` 从事件队列取出事件，发送给 `keyWindow`。
    
2. `keyWindow` 判断自己能否响应，并判断点是否在自己身上。
    
3. **倒序遍历**子控件（从后往前，即 `subviews.lastObject` 开始），重复上述步骤。
    
    - _原因_：后添加的 View 在视觉上覆盖在先添加的 View 之上，优先响应最上面的 View 符合视觉逻辑，同时能减少循环次数。
        
4. 一旦找到符合条件的子 View，就将其作为 `fitView` 返回，停止遍历。
    
5. 如果没有符合条件的子控件，但自己满足条件，则自己就是最合适的 View。
    

### 3.2 核心方法与源码模拟

寻找过程由两个核心方法实现：

- `- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event;`
    
- `- (BOOL)pointInside:(CGPoint)point withEvent:(UIEvent *)event;`
    

**`hitTest:withEvent:` 的伪代码实现：**


```objc
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    // 1. 判断是否允许交互：不允许交互、被隐藏、透明度极低均不能响应
    if (self.userInteractionEnabled == NO || self.hidden == YES || self.alpha < 0.01) {
        return nil;
    }

    // 2. 判断触摸点是否在当前 View 内部
    if ([self pointInside:point withEvent:event] == NO) {
        return nil;
    }

    // 3. 从后往前遍历子控件（深度优先，视觉顶层优先）
    NSInteger count = self.subviews.count;
    for (NSInteger i = count - 1; i >= 0; i--) {
        UIView *childView = self.subviews[i];
        
        // 关键：坐标系转换，将当前点的坐标转换到子控件的坐标系上
        CGPoint childPoint = [self convertPoint:point toView:childView];
        
        // 递归调用子控件的 hitTest
        UIView *fitView = [childView hitTest:childPoint withEvent:event];
        
        // 如果子控件找到了最合适的 View，直接返回，不再继续遍历
        if (fitView) {
            return fitView;
        }
    }

    // 4. 如果子控件都没有返回，且通过了步骤1和2，则自己就是最合适的 View
    return self;
}
```

### 3.3 拦截与Hack技巧

通过重写 `hitTest:withEvent:` 可以实现特殊需求：

1. **扩大点击区域**：重写 `pointInside`，判断点在 bounds 向外延伸的范围内即返回 YES。
    
2. **穿透点击**：让下层的 View 响应事件。在顶层 View 的 `hitTest` 中返回 `nil`，事件就会自动传递给被遮挡的 View（前提是父 View 继续寻找）。
    
3. **子视图超出父视图范围响应**：默认情况下，子视图超出父视图部分无效（因为父视图 `pointInside` 返回 NO，根本不会遍历子视图）。解决方案是重写父视图的 `hitTest` 或 `pointInside`。
    

---

## 四、 事件的响应（The Responder Chain）

找到最合适的 View（Initial View）后，如果没有手势拦截，系统会调用该 View 的 `touches` 系列方法。

### 4.1 四大核心方法



```objc
- (void)touchesBegan:(NSSet *)touches withEvent:(UIEvent *)event;
- (void)touchesMoved:(NSSet *)touches withEvent:(UIEvent *)event;
- (void)touchesEnded:(NSSet *)touches withEvent:(UIEvent *)event;
- (void)touchesCancelled:(NSSet *)touches withEvent:(UIEvent *)event;
```

> **注意 `touchesCancelled`**：不仅仅是电话呼入，**最常见的情况是手势识别器（UIGestureRecognizer）识别成功后，会取消触摸事件**，导致 View 收到此回调。

### 4.2 响应者链条传递规则

响应链是**自下而上**（View -> Superview -> Controller -> Window -> App）传递的。

1. **Initial View** 处理事件（调用 touches 方法）。
    
2. 如果 View 没有重写 touches 方法，或者在 touches 方法中调用了 `[super touchesBegan/Moved/Ended...]`，事件会传递给 `nextResponder`。
    
3. **Next Responder 查找规则**：
    
    - **UIView**: 若是 VC 的 Root View，下一个是 VC；否则是 `superview`。
        
    - **UIViewController**: 下一个是其 View 的 `superview` (通常是 Window 或其他 VC 的 View)。
        
    - **UIWindow**: 下一个是 `UIApplication`。
        
    - **UIApplication**: 下一个是 `AppDelegate` (如果它是 UIResponder)。
        
4. 如果传递到最后都没人处理，事件被丢弃。!

---

## 五、 高阶难点：事件响应的冲突与特殊处理

这部分内容是资深工程师必须掌握的细节。

### 5.1 手势识别器 (Gesture Recognizer) vs 触摸事件 (Touches)

这是最容易混淆的地方。`UIGestureRecognizer` 也是通过 Hit-Testing 绑定到 View 上的，但它的优先级通常**高于** View 自身的 `touches` 方法。

- **默认行为**：
    
    1. 当触摸发生，系统同时将事件发送给 View (touchesBegan) 和 绑定在 View (及父视图) 上的 GestureRecognizer。
        
    2. 如果 GestureRecognizer **识别失败**，View 继续接收 touchesEnded。
        
    3. 如果 GestureRecognizer **识别成功**：
        
        - 它会独占该事件。
            
        - 系统会向 View 发送 `touchesCancelled`，终止 View 的事件处理。
            
        - View 不会再收到 touchesEnded。
            
- **关键属性**：
    
    - `cancelsTouchesInView` (默认 YES)：识别成功后取消 View 的触摸。设为 NO 则两者共存（View 能收到 touchesEnded）。
        
    - `delaysTouchesBegan` (默认 NO)：只有手势识别失败后，才把 touchesBegan 发送给 View。用于解决点击态闪烁问题。
        

### 5.2 UIControl (Target-Action) 的特殊性

`UIButton`、`UISlider` 等继承自 `UIControl`。

- **现象**：点击 Button，其父 View 的 `touchesBegan` 不会被触发。
    
- **原因**：`UIControl` 内部重写了 touches 方法来处理 Target-Action 逻辑。它默认**阻断**了响应链的向上传递（没有调用 super）。
    
- **区别**：
    
    - `UILabel`/`UIView`：默认不处理，透传给父控件。
        
    - `UIButton`：处理并吞掉事件，父控件收不到。
        

### 5.3 总结：事件处理的优先级排序

在大多数情况下，事件响应的优先级如下：

1. **手势识别器 (UIGestureRecognizer)**：优先级最高，识别成功会 Cancel 其他。
    
2. **UIControl (Target-Action)**：次之，通常会阻断响应链。
    
3. **UIResponder (Touches)**：优先级最低，通过响应链传递。
    

---

## 六、 总结

iOS 的事件机制是一个精密设计的流程：

1. **硬件层**：Source1 -> RunLoop -> Source0 -> UIApplication。
    
2. **寻找层 (Hit-Test)**：自上而下，倒序遍历，利用 `pointInside` 和坐标转换找到最合适的 `fitView`。
    
3. **响应层 (Responder Chain)**：自下而上，`nextResponder` 传递。
    
4. **干扰项**：注意手势识别器对标准响应链的“拦截”和“取消”机制。
    

掌握这套逻辑，不仅能应对面试中的“如何扩大按钮点击范围”、“父视图如何拦截子视图事件”、“手势冲突解决”等问题，也能在实际开发中处理复杂的交互场景。


