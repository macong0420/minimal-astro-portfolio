---
title: "flutter provider全解析"
description: "provider仍然是 2026 年中型项目及初学者最常用的状态管理框架之一。它基于 Flutter 原生的 `InheritedWidget` 进行封装，极大地简化了数据跨组件共享的复杂度。 "
publishedAt: "2026-01-06"
tags:
  - "flutter"
  - "provider"
---

# Flutter Provider 与 InheritedWidget 源码原理

> 源码版本：Flutter 3.38.9，provider 6.1.5+1。  
> 阅读入口：
> - Flutter: `/Users/macongcong/fvm/versions/stable/packages/flutter/lib/src/widgets/framework.dart`
> - Provider: `/Users/macongcong/.pub-cache/hosted/pub.dev/provider-6.1.5+1/lib/src/`

面试官问：“InheritedWidget 和 Provider 的原理是什么？”

  你可以这样说：

  > InheritedWidget 是 Flutter 官方提供的依赖向下传递机制，但真正负责依赖登记和通知的不是 Widget，而是它对应的 InheritedElement。
  >
  > 当子组件通过 context.dependOnInheritedWidgetOfExactType<T>() 获取数据时，Flutter 会找到最近的 InheritedElement，并把当前子组件的 Element 登记为它的依
  > 赖者。之后如果这个 InheritedWidget 更新，并且 updateShouldNotify 返回 true，对应的 InheritedElement 就会通知这些依赖者调用 didChangeDependencies，最终
  > 触发 rebuild。
  >
  > Provider 本质上就是对 InheritedWidget / InheritedElement 的封装。context.watch<T>() 底层相当于 Provider.of<T>(context)，会建立依赖；context.read<T>()
  > 相当于 Provider.of<T>(context, listen: false)，只读取不订阅。
  >
  > 如果是 ChangeNotifierProvider，它还会监听 ChangeNotifier.notifyListeners()，然后调用 Provider 内部 Element 的通知逻辑，让依赖它的组件重建。select 则是
  > 在通知时先比较选中的字段，字段没变就不 rebuild。

  这个回答已经比较完整。

  3 分钟展开版

  如果面试官继续问细节，可以这样展开：

  > 我会把它分成两层看：Flutter 原生的 InheritedWidget 机制，以及 Provider 在它上面的封装。
  >
  > 原生机制里，InheritedWidget 本身只是一个配置类，它会创建 InheritedElement。真正保存依赖关系的是 InheritedElement，里面维护了一个 dependents 集合，记录
  > 哪些后代 Element 依赖了自己。
  >
  > 子组件读取 inherited 数据有两种方式。
  > 第一种是 dependOnInheritedWidgetOfExactType，这个方法不仅查找最近的 inherited 节点，还会建立依赖关系，所以之后 inherited 数据变化时，当前组件会被通知
  > 重建。
  > 第二种是 getElementForInheritedWidgetOfExactType，它只是查找，不建立依赖，所以后续变化不会触发当前组件 rebuild。
  >
  > 这也是 Provider 里 watch 和 read 的核心区别。watch 会订阅，read 只读一次。
  >
  > 当 InheritedWidget 被父组件重新构建时，Flutter 会调用 updateShouldNotify(oldWidget) 判断是否需要通知依赖者。如果返回 true，InheritedElement 就遍历之前
  > 登记过的 dependent elements，调用它们的 didChangeDependencies，而 didChangeDependencies 内部会标记当前 Element 需要 rebuild。
  >
  > Provider 的实现本质上还是这套机制。Provider 内部有一个类似 _InheritedProviderScope 的 InheritedWidget，以及自定义的 _InheritedProviderScopeElement。它
  > 在原生 inherited 机制上增加了几个能力：对象创建、懒加载、自动 dispose、监听 Listenable / ChangeNotifier、以及 select 精细化更新。
  >
  > 例如 ChangeNotifierProvider 会在 value 第一次被读取时创建对象，并给这个 ChangeNotifier 添加 listener。当业务代码调用 notifyListeners() 时，Provider 内
  > 部 listener 会触发 markNeedsNotifyDependents，再通知依赖它的组件 rebuild。
  >
  > context.select 更精细一些。它不是订阅整个对象，而是保存一个 selector，比如只关心 user.name。当 provider 通知时，它会重新执行 selector，只有前后结果不
  > 一样，才让这个组件 rebuild。

  更有条理的回答模板

  你可以记这个顺序：

  1. 先定义
  InheritedWidget 是 Flutter 的依赖向下传递机制，Provider 是它的工程化封装。

  2. 再说核心对象
  真正干活的是 Element，不是 Widget。

  3. 再说读取差异
  dependOn = 读取并订阅
  getElement = 只读取不订阅

  4. 再说更新链路
  updateShouldNotify / notifyListeners
    -> notify dependents
    -> didChangeDependencies
    -> markNeedsBuild
    -> rebuild

  5. 最后说 Provider 增强
  read / watch / select
  create / dispose / lazy
  ChangeNotifierProvider 监听 notifyListeners

  面试里比较加分的一句话

  > 我理解 Provider 不是魔法，它只是把 Flutter 原生的 InheritedElement 依赖登记机制，和 ChangeNotifier 这类状态变化通知机制连接起来了。

  这句话很关键，能体现你知道 Provider 的边界：
  Provider 负责“暴露和订阅”，真正的状态变化来源可能是 ChangeNotifier、Stream、Future、ValueNotifier，或者父组件 rebuild。

--- 

## 1. 先建立一个正确心智模型

Flutter 的依赖传播不是发生在 Widget 对象之间，而是发生在 Element 树上。

```text
Widget: 配置，短生命周期，可频繁创建
Element: Widget 在树上的实例位置，长期存在，BuildContext 本质就是 Element
InheritedElement: 记录哪些 Element 依赖了自己，并负责通知它们
```

所以 `InheritedWidget` 的本质不是“全局变量”，而是：

```text
在 Element 树中放一个可被后代按类型查找的节点；
后代读取时可以选择是否登记依赖；
当该节点的数据变化时，只通知登记过依赖的后代 Element。
```

Provider 不是绕开这套机制，而是在这套机制上做工程化封装：

```text
InheritedWidget / InheritedElement
  -> Provider.of / context.watch / context.read / context.select
  -> create / dispose / lazy / ChangeNotifier 监听 / Selector 过滤更新
```

## 2. InheritedWidget 源码：Widget 层只负责声明

Flutter 源码里 `InheritedWidget` 非常小：

```dart
abstract class InheritedWidget extends ProxyWidget {
  const InheritedWidget({super.key, required super.child});

  @override
  InheritedElement createElement() => InheritedElement(this);

  @protected
  bool updateShouldNotify(covariant InheritedWidget oldWidget);
}
```

关键点：

- `InheritedWidget` 继承 `ProxyWidget`，本身只有一个 `child`。
- `createElement()` 创建的是 `InheritedElement`。
- `updateShouldNotify(oldWidget)` 只负责判断“新旧配置变化后，要不要通知依赖者”。

这说明 `InheritedWidget` 本身不保存订阅者。真正的依赖登记和通知在 `InheritedElement`。

## 3. 查找为什么快：Element 上缓存了可见的 InheritedElement

Element 内部有一个按类型索引的 `_inheritedElements`。

`InheritedElement._updateInheritance()` 的核心逻辑：

```dart
final incomingWidgets =
    _parent?._inheritedElements ?? const PersistentHashMap.empty();
_inheritedElements = incomingWidgets.put(widget.runtimeType, this);
```

含义是：

```text
当前 Element 继承父节点可见的所有 InheritedElement
如果当前节点自己就是 InheritedElement，就用自己的 runtimeType 覆盖同类型入口
```

所以后代查找 `Theme`、`MediaQuery`、`Provider<User>` 这类 inherited 信息时，不需要每次从当前节点一路向上遍历父链，而是直接查当前 Element 持有的 `_inheritedElements[type]`。

这也是为什么同类型 provider 嵌套时，子树读到的是“最近的那个”：

```dart
Provider<User>(value: outerUser,
  child: Provider<User>(value: innerUser,
    child: Child(),
  ),
)
```

`Child` 看到的 `_inheritedElements[Provider<User>对应的InheritedWidget类型]` 已经被内层覆盖。

## 4. read 与 watch 的源码差别：是否登记依赖

Flutter 原生有两个关键 API。

### 4.1 只查找，不订阅

```dart
InheritedElement? getElementForInheritedWidgetOfExactType<T extends InheritedWidget>() {
  return _inheritedElements?[T];
}
```

这只是拿到最近的 inherited element，不把当前 Element 记为依赖者。

所以它对应 Provider 里的 `read`：

```text
context.read<T>()
  -> Provider.of<T>(context, listen: false)
  -> getElementForInheritedWidgetOfExactType
  -> 不订阅，后续变化不 rebuild
```

### 4.2 查找，并订阅

```dart
T? dependOnInheritedWidgetOfExactType<T extends InheritedWidget>({Object? aspect}) {
  final InheritedElement? ancestor = _inheritedElements?[T];
  if (ancestor != null) {
    return dependOnInheritedElement(ancestor, aspect: aspect) as T;
  }
  return null;
}
```

继续看 `dependOnInheritedElement`：

```dart
InheritedWidget dependOnInheritedElement(InheritedElement ancestor, {Object? aspect}) {
  (_dependencies ??= HashSet<InheritedElement>()).add(ancestor);
  ancestor.updateDependencies(this, aspect);
  return ancestor.widget as InheritedWidget;
}
```

这里有两个方向的记录：

```text
当前 Element._dependencies 添加 ancestor
ancestor._dependents 添加当前 Element
```

所以 `watch` 的本质是：

```text
读取值 + 把当前 Element 登记到 provider 对应 InheritedElement 的依赖者列表里
```

## 5. InheritedElement 如何保存依赖者

`InheritedElement` 里有：

```dart
final Map<Element, Object?> _dependents = HashMap<Element, Object?>();
```

默认登记依赖时：

```dart
void updateDependencies(Element dependent, Object? aspect) {
  setDependencies(dependent, null);
}
```

默认通知时：

```dart
void notifyDependent(InheritedWidget oldWidget, Element dependent) {
  dependent.didChangeDependencies();
}
```

`Element.didChangeDependencies()` 又会：

```dart
markNeedsBuild();
```

所以完整链路是：

```text
子组件调用 dependOnInheritedWidgetOfExactType
  -> 当前 Element 被加入 InheritedElement._dependents

InheritedWidget 重新 build
  -> InheritedElement.updated(oldWidget)
  -> updateShouldNotify(oldWidget) 返回 true
  -> notifyClients(oldWidget)
  -> 遍历 _dependents
  -> dependent.didChangeDependencies()
  -> dependent.markNeedsBuild()
  -> 下一轮 build
```

这解释了两个现象：

- 调了 `dependOn...` / `watch` 的组件会被通知。
- 只调 `getElement...` / `read` 的组件不会被通知。

## 6. Provider.of 的源码：Provider 如何接入 InheritedWidget

Provider 的核心读取入口是：

```dart
static T of<T>(BuildContext context, {bool listen = true}) {
  final inheritedElement = _inheritedElementOf<T>(context);

  if (listen) {
    context.dependOnInheritedWidgetOfExactType<_InheritedProviderScope<T?>>();
  }

  final value = inheritedElement?.value;
  return value as T;
}
```

它分三步：

```text
1. _inheritedElementOf<T>(context)
   找到 _InheritedProviderScope<T?> 对应的 Element

2. listen == true 时
   调 dependOnInheritedWidgetOfExactType，建立依赖

3. 读取 inheritedElement.value
   触发 Provider 的懒创建、监听启动，然后返回值
```

Provider 的扩展方法只是语法糖：

```dart
T read<T>() => Provider.of<T>(this, listen: false);
T watch<T>() => Provider.of<T>(this);
```

所以：

```text
read: 找 provider，取 value，不登记依赖
watch: 找 provider，取 value，登记依赖
```

## 7. Provider 真正放进树里的不是 Provider Widget，而是 _InheritedProviderScope

`InheritedProvider<T>` 的 `buildWithChild` 会返回：

```dart
_InheritedProviderScope<T?>(
  owner: this,
  child: child,
)
```

`_InheritedProviderScope<T>` 继承 `InheritedWidget`：

```dart
class _InheritedProviderScope<T> extends InheritedWidget {
  final InheritedProvider<T> owner;

  @override
  bool updateShouldNotify(InheritedWidget oldWidget) {
    return false;
  }

  @override
  _InheritedProviderScopeElement<T> createElement() {
    return _InheritedProviderScopeElement<T>(this);
  }
}
```

注意这里 `updateShouldNotify` 永远返回 `false`。

这看起来反直觉，但很关键：Provider 没有直接依赖 Flutter 默认的 `InheritedWidget.updateShouldNotify`。它把通知逻辑放到了自定义 Element：`_InheritedProviderScopeElement`。

原因是 Provider 要支持更多能力：

- `select` 只监听对象的一部分字段。
- `ChangeNotifier` 通过 `notifyListeners()` 主动触发更新。
- `create` 懒加载。
- `dispose` 生命周期管理。
- `update` / `ProxyProvider` 依赖其他 provider 更新。

## 8. Provider 的 Element：_InheritedProviderScopeElement

Provider 自己的 Element 继承自 `InheritedElement`：

```dart
class _InheritedProviderScopeElement<T> extends InheritedElement
    implements InheritedContext<T> {
  bool _shouldNotifyDependents = false;
  late final _DelegateState<T, _Delegate<T>> _delegateState =
      widget.owner._delegate.createState()..element = this;
}
```

它实现了两个重要能力。

### 8.1 暴露 value

```dart
T get value => _delegateState.value;
```

Provider 的值不直接放在 widget 上，而是交给 `_DelegateState` 管。

### 8.2 主动通知依赖者

```dart
void markNeedsNotifyDependents() {
  markNeedsBuild();
  _shouldNotifyDependents = true;
}
```

然后在 `build()` 里：

```dart
if (_shouldNotifyDependents) {
  _shouldNotifyDependents = false;
  notifyClients(widget);
}
```

这意味着 Provider 可以绕过 `updateShouldNotify`，由外部事件主动触发通知，例如 `ChangeNotifier.notifyListeners()`。

## 9. Provider 的懒创建：create 不是立刻执行

Provider 的 `_CreateInheritedProviderState.value` 里有：

```dart
if (!_didInitValue) {
  _didInitValue = true;
  _value = delegate.create!(element!);
}

_removeListener ??= delegate.startListening?.call(element!, _value as T);
return _value as T;
```

含义：

```text
Provider(create: ...)
  -> 插入树时不一定立刻 create
  -> 第一次有人读 value 时才 create
  -> 第一次读 value 后才 startListening
```

这就是 `lazy` 的来源。

如果设置 `lazy: false`，Provider 的 Element 在 build 里会强制读一次：

```dart
if (widget.owner._lazy == false) {
  value;
}
```

于是 `create` 会提前执行。

## 10. ChangeNotifierProvider 的源码链路

`ChangeNotifierProvider` 继承 `ListenableProvider`：

```dart
class ChangeNotifierProvider<T extends ChangeNotifier?>
    extends ListenableProvider<T> {
  ChangeNotifierProvider({
    required Create<T> create,
  }) : super(
          create: create,
          dispose: _dispose,
        );
}
```

`ListenableProvider` 传入了 `startListening`：

```dart
static VoidCallback _startListening(
  InheritedContext<Listenable?> e,
  Listenable? value,
) {
  value?.addListener(e.markNeedsNotifyDependents);
  return () => value?.removeListener(e.markNeedsNotifyDependents);
}
```

完整更新链路：

```text
context.watch<CounterModel>()
  -> Provider.of(listen: true)
  -> 当前 Element 登记为 _InheritedProviderScopeElement 的依赖者

CounterModel.increment()
  -> notifyListeners()
  -> ListenableProvider 注册的 listener 被调用
  -> e.markNeedsNotifyDependents()
  -> Provider Element markNeedsBuild
  -> build 时 notifyClients()
  -> 对每个 dependent 执行 notifyDependent()
  -> dependent.didChangeDependencies()
  -> markNeedsBuild()
  -> UI rebuild
```

所以 `ChangeNotifierProvider` 的本质是：

```text
用 InheritedElement 管订阅者；
用 ChangeNotifier/Listenable 管变化事件；
把 notifyListeners 转换成 InheritedElement.notifyClients。
```

## 11. select 的源码：把 aspect 用起来

Flutter 原生的 `dependOnInheritedWidgetOfExactType` 有个参数：

```dart
Object? aspect
```

普通 `InheritedWidget` 默认不使用它；`InheritedModel` 和 Provider 的 `select` 会用。

Provider 的 `context.select` 核心逻辑：

```dart
final selected = selector(value);

dependOnInheritedElement(
  inheritedElement,
  aspect: (T? newValue) {
    return !DeepCollectionEquality().equals(
      selector(newValue),
      selected,
    );
  },
);
```

这里的 `aspect` 不是普通数据，而是一个函数：

```text
给我新 value，我重新执行 selector；
如果 selector 结果和旧 selected 不一样，返回 true；
否则返回 false。
```

Provider 的 Element 重写了 `updateDependencies`：

```dart
if (aspect is _SelectorAspect<T>) {
  selectorDependency.selectors.add(aspect);
  setDependencies(dependent, selectorDependency);
} else {
  setDependencies(dependent, const Object());
}
```

也重写了 `notifyDependent`：

```dart
if (dependencies is _Dependency<T>) {
  for (final updateShouldNotify in dependencies.selectors) {
    shouldNotify = updateShouldNotify(value);
    if (shouldNotify) break;
  }
} else {
  shouldNotify = true;
}

if (shouldNotify) {
  dependent.didChangeDependencies();
}
```

所以：

```text
watch<T>()
  -> 订阅整个 T
  -> T 通知时一定 rebuild

select<T, R>()
  -> 订阅 T 的某个投影 R
  -> T 通知时重新算 selector
  -> R 变了才 rebuild
```

这也是为什么 `select` 可以显著降低重建范围。

## 12. Consumer 和 Selector 的源码意义

`Consumer<T>` 没有什么魔法：

```dart
Widget buildWithChild(BuildContext context, Widget? child) {
  return builder(
    context,
    Provider.of<T>(context),
    child,
  );
}
```

它只是创建一个更小的 Widget 边界，并在这个边界里 `watch`。

```dart
Column(
  children: [
    ExpensiveHeader(),
    Consumer<User>(
      builder: (_, user, __) => Text(user.name),
    ),
  ],
)
```

当 `User` 变化时，主要重建 `Consumer` 这一小块，而不是把读取逻辑放在外层大组件里。

`Selector` 则更进一步：缓存上一次 `selector` 的结果，只有结果变化时才刷新 builder。

## 13. Provider.value 与 create 的生命周期差别

Provider 有两种典型构造方式：

```dart
Provider(create: (_) => UserRepository())
Provider.value(value: existingRepository)
```

源码上：

- `create` 使用 `_CreateInheritedProvider`，支持 `create`、`dispose`、`update`。
- `value` 使用 `_ValueInheritedProvider`，只暴露现有对象，不负责创建它。

`_CreateInheritedProviderState.dispose()`：

```dart
_removeListener?.call();
if (_didInitValue) {
  delegate.dispose?.call(element!, _value as T);
}
```

所以：

```text
create 创建的对象，Provider 是 owner，Provider 卸载时负责 dispose。
value 传入的对象，外部是 owner，Provider 一般只负责取消自己加上的监听。
```

这就是官方一直强调的规则：

```text
新建对象用 create。
复用已有对象用 value。
不要用 value 创建新对象。
不要用 create 传入会变化的外部现有对象。
```

## 14. 为什么 initState 里不能 watch

Provider 的源码里有保护：

```dart
if (_debugInheritLocked) {
  throw FlutterError(...);
}
```

错误信息会提示：

```text
不要在 initState 或 provider create 回调中 listen: true。
```

原因不是“拿不到值”，而是生命周期不匹配：

```text
watch 会建立依赖；
依赖变化后需要有一个能处理更新的生命周期；
initState 只执行一次，后续不会再执行；
所以在 initState 里订阅没有意义。
```

正确选择：

```dart
// 只读一次
final repo = context.read<Repo>();

// 需要响应依赖变化
@override
void didChangeDependencies() {
  super.didChangeDependencies();
  final theme = context.watch<AppTheme>();
}

// 更常见：直接在 build 里 watch/select
Widget build(BuildContext context) {
  final userName = context.select((User u) => u.name);
  return Text(userName);
}
```

## 15. 一条完整源码路径复盘

以这段代码为例：

```dart
ChangeNotifierProvider(
  create: (_) => Counter(),
  child: CounterText(),
)

class CounterText extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final count = context.select((Counter c) => c.count);
    return Text('$count');
  }
}
```

首次 build：

```text
ChangeNotifierProvider
  -> InheritedProvider
  -> _InheritedProviderScope
  -> _InheritedProviderScopeElement
```

`CounterText` 读取：

```text
context.select
  -> Provider._inheritedElementOf<Counter>
  -> getElementForInheritedWidgetOfExactType<_InheritedProviderScope<Counter?>>()
  -> inheritedElement.value
  -> 第一次触发 create Counter()
  -> startListening: counter.addListener(markNeedsNotifyDependents)
  -> dependOnInheritedElement(..., aspect: selector comparison function)
```

`Counter.increment()`：

```text
count++
notifyListeners()
  -> markNeedsNotifyDependents()
  -> Provider Element markNeedsBuild
  -> build()
  -> notifyClients()
  -> notifyDependent()
  -> 执行 select 保存的 selector
  -> count 变了，didChangeDependencies()
  -> markNeedsBuild()
  -> CounterText rebuild
```

如果 `Counter` 通知了，但 `count` 没变，只是 `name` 变了：

```text
selector(c) => c.count 的结果不变
  -> notifyDependent 不调用 didChangeDependencies
  -> CounterText 不 rebuild
```

## 16. 最容易混淆的点

### 16.1 Provider 不是状态变化源

普通 `Provider<T>` 不会自动知道 `T` 内部字段变了。

```dart
Provider<User>(create: (_) => User())
```

如果你改了：

```dart
user.name = 'new name';
```

UI 不会自动更新，除非：

- 上层 rebuild 并换了 Provider 的 value；
- 使用 `ChangeNotifierProvider` 并调用 `notifyListeners()`；
- 使用 `ValueListenableProvider`、`StreamProvider`、`FutureProvider` 等有事件源的 provider。

### 16.2 watch 不是“监听对象字段”

`watch<T>()` 监听的是 provider 的通知，不是自动监听 `T` 的所有字段。

```text
对象字段变了 + 没有通知事件 = UI 不知道
对象发通知了 + watch 了整个对象 = UI rebuild
对象发通知了 + select 字段没变 = UI 不 rebuild
```

### 16.3 BuildContext 是 Element

`context.watch` 能登记依赖，是因为 `context` 实际是当前 Widget 对应的 Element。

不是 Widget 自己在订阅，而是 Element 在订阅。

### 16.4 updateShouldNotify 不是 Provider 的唯一通知入口

原生 `InheritedWidget` 主要靠 `updateShouldNotify`。

Provider 的 `_InheritedProviderScope.updateShouldNotify` 永远 `false`，但它可以通过：

```text
markNeedsNotifyDependents()
  -> _shouldNotifyDependents = true
  -> build 时 notifyClients()
```

主动通知。

## 17. 复习时记住这几句话

```text
InheritedWidget 是声明，InheritedElement 才是依赖登记和通知中心。

dependOnInheritedWidgetOfExactType = 查找 + 登记依赖。
getElementForInheritedWidgetOfExactType = 只查找，不登记依赖。

Provider.of(listen: true) / watch = dependOn。
Provider.of(listen: false) / read = getElement。

ChangeNotifierProvider = InheritedElement 依赖系统 + ChangeNotifier 事件系统。

select = 把 selector 比较函数作为 aspect 存到依赖关系里，通知时按需 rebuild。

create 是懒执行的；第一次读 value 才创建，lazy: false 会提前创建。

create 创建的对象由 Provider dispose；value 传入的对象由外部负责生命周期。
```

## 18. 源码索引

- `InheritedWidget.createElement` 与 `updateShouldNotify`：`framework.dart:1853`
- `Element.dependOnInheritedWidgetOfExactType`：`framework.dart:5084`
- `Element.getElementForInheritedWidgetOfExactType`：`framework.dart:5100`
- `Element.dependOnInheritedElement`：`framework.dart:5077`
- `Element.didChangeDependencies -> markNeedsBuild`：`framework.dart:5193`
- `InheritedElement._dependents`：`framework.dart:6259`
- `InheritedElement.updateDependencies`：`framework.dart:6354`
- `InheritedElement.updated`：`framework.dart:6399`
- `InheritedElement.notifyClients`：`framework.dart:6417`
- `Provider.of`：`provider.dart:306`
- `context.read`：`provider.dart:682`
- `context.watch`：`provider.dart:726`
- `InheritedProvider` 构造与 delegate：`inherited_provider.dart:54`
- `context.select`：`inherited_provider.dart:250`
- `_InheritedProviderScope.updateShouldNotify == false`：`inherited_provider.dart:340`
- `_InheritedProviderScopeElement.updateDependencies`：`inherited_provider.dart:442`
- `_InheritedProviderScopeElement.notifyDependent`：`inherited_provider.dart:474`
- `_InheritedProviderScopeElement.markNeedsNotifyDependents`：`inherited_provider.dart:585`
- `_CreateInheritedProviderState.value`：`inherited_provider.dart:730`
- `_CreateInheritedProviderState.dispose`：`inherited_provider.dart:805`
- `_ValueInheritedProviderState.willUpdateDelegate`：`inherited_provider.dart:945`
- `ListenableProvider._startListening`：`listenable_provider.dart`
- `ChangeNotifierProvider`：`change_notifier_provider.dart`
