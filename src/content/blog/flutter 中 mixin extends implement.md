---
title: "flutter 中 mixin extends implement"
description: "这三个关键字是 Dart 面向对象编程的三驾马车。在 Flutter 开发中，你几乎每天都会用到它们。"
publishedAt: 2025-12-10
tags:
  - "flutter"
  - "mixin"
---

![Google Gemini Image (5).png](https://raw.githubusercontent.com/macong0420/Image/main/20251212132237835.png)

![Gemini Generated Image (10).png](https://raw.githubusercontent.com/macong0420/Image/main/20251210171420833.png)


这三个关键字是 Dart 面向对象编程的三驾马车。在 Flutter 开发中，你几乎每天都会用到它们。

为了让你一听就懂，我们用\*\*“游戏角色设计”**或者是**“职场”\*\*来打比方。

***

### 1. `extends` (继承) —— “拼爹”

核心概念：单继承，全盘接收。

关系描述：Is-a (是一个...)

想象你正在设计一个游戏角色。

- 你有一个基础类叫 `普通人` (Human)，他有名字、会走路、会吃饭。

- 现在你要造一个 `战士` (Warrior)。

- `战士` **就是** `普通人`，所以你用 `extends`。

**特点：**

1. **不劳而获**：`战士` 自动拥有 `普通人` 所有的代码（走路、吃饭），不需要重写。

2. **独生子女**：Dart 是单继承语言。一个类只能有一个亲爹。`战士` 不能同时 `extends 普通人` 和 `extends 神仙`。

3. **甚至更强**：子类可以重写（Override）父类的方法。比如 `战士` 的“吃饭”可以改成“吃得更多”。



```Dart
class Human {
  void eat() => print("吃饭");
}

// 战士“是”普通人，直接拥有吃饭的能力
class Warrior extends Human {
  void fight() => print("打架");
}
```

***

### 2. `implements` (接口实现) —— “考证”

核心概念：契约，从头实现。

关系描述：Can-do (能做...，必须符合标准)

现在你要让你的 `战士` 去开车。

- 开车不是人类天生的能力（不能 extends）。

- 你需要考一张 `驾照` (DriverLicense)。

- `驾照` 只是一个**空壳标准**（接口），它规定了“必须会踩油门”、“必须会刹车”，但它**没教你**怎么踩（没有代码实现）。

**特点：**

1. **从零开始**：当你 `implements` 一个类时，你必须把里面所有的方法**全部重写一遍**。你拿不到任何现成的代码逻辑。

2. **技多不压身**：你可以拥有多个证。`implements Driver, Chef, Coder`（多实现）。

3. **标准化**：它保证了所有持有这个证的人，都有同样的对外接口。



```Dart
// 这是一个接口（或者是抽象类），它只有要求，没有具体做法
class Driver {
  void drive() {} 
}

// 战士要考驾照，必须自己学会怎么开车
class Warrior extends Human implements Driver {
  @override
  void drive() {
    print("踩油门，转方向盘..."); // 必须自己写实现
  }
}
```

***

### 3. `mixin` (混入) —— “装备/插件”

核心概念：代码复用，即插即用。

关系描述：With (具有...能力)

这是 Flutter/Dart 最灵活的地方。

假设你希望你的 战士 拥有“医疗兵”的治愈能力，同时你还希望一个“怪物”也有治愈能力。

- `战士` 的爹是 `普通人`。

- `怪物` 的爹是 `怪兽`。

- 它们没有共同的祖先，不能用 `extends`。

- 如果你用 `implements`，你得给战士写一遍治愈代码，给怪物再写一遍，太累了。

这时 mixin 登场了。它就像一个\*\*“外挂包”或者“医疗包”\*\*。

只要定义好一个 Healer (治疗者) mixin，里面写好治愈的代码。谁拿来用（with），谁就直接获得了这个能力，既不用认爹，也不用自己重写代码。

**特点：**

1. **剪贴板**：相当于把 mixin 里的代码“复制粘贴”到了你的类里。

2. **多功能**：你可以 `with` 多个 mixin。`with Healing, Flying, Invisible`（同时拥有治疗、飞行、隐身）。

3. **打破层级**：不关心你爹是谁，只要你需要这个功能，这就给你。



```Dart
// 定义一个能力包
mixin Healing {
  void heal() => print("释放治疗术！血量+100");
}

// 战士直接拥有了治疗能力，不需要自己写
class Warrior extends Human with Healing {}

// 怪物也能直接用，代码复用率极高
class Monster extends Beast with Healing {}
```

***

### 总结与图解

为了更直观地理解，我们可以看这个简单的关系图：

| **关键字**        | **别名** | **核心作用** | **代码复用**      | **数量限制** | **现实比喻**                  |
| -------------- | ------ | -------- | ------------- | -------- | ------------------------- |
| **extends**    | 继承     | 建立家族血统   | **全盘复用**      | **只能一个** | **亲爹** (你的基因主要来自他)        |
| **implements** | 实现     | 强制行为规范   | **无复用** (需重写) | **可以多个** | **考证/合同** (必须按规定干活，但得自己干) |
| **mixin**      | 混入     | 跨类别共享能力  | **直接复用**      | **可以多个** | **外挂/工具包** (捡起一把枪，马上就会开枪) |

### 在 Flutter 中的经典应用

在 Flutter 代码中，你最常看到的一句代码完美体现了这三者的关系：



```Dart
class _MyPageState extends State with SingleTickerProviderStateMixin {
  ...
}
```

这里发生了什么？

1. **`extends State`**: 它是亲爹。你的页面**是**一个 State，必须继承 State 所有的生命周期（`initState`, `dispose` 等）。

2. **`with SingleTickerProviderStateMixin`**: 这是一个外挂。你的页面需要做动画，需要一个“时钟滴答器”（Ticker）。你不想自己从头写怎么管理时钟（太难了），也不想改变继承关系。所以直接 **混入（with）** 这个官方写好的工具包，你的页面瞬间就拥有了管理动画帧的能力。

### 怎么选？

- **extends**: 当两者是强烈的“属于”关系，且需要复用大量基础逻辑时。（Cat extends Animal）

- **implements**: 当你只需要对方的“外壳”或者“标准”，不需要它的内部实现时。（Phone implements Camera - 手机有拍照功能，但它内部构造和单反完全不同）。

- **mixin**: 当你需要多个类共用同一套代码，但这些类又不在同一个父类下面时。（Duck with FlyAbility, Plane with FlyAbility）。