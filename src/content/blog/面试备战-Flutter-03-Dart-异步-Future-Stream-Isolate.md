---
title: "面试备战 Flutter 03：Dart 异步，Future、Stream 与 Isolate"
description: "从 Event Loop、Microtask Queue、Future、async/await、Stream、StreamController、Isolate 和 UI 卡顿深入拆解 Dart 异步模型。"
publishedAt: "2026-06-08"
tags: ["面试", "Flutter", "Dart", "异步"]
---

# 面试备战 Flutter 03：Dart 异步，Future、Stream 与 Isolate

Dart 异步面试的关键不是 Future 用法，而是：

- Future 会不会开线程？
- microtask 和 event 谁先执行？
- Stream 什么时候泄漏？
- CPU 密集任务为什么仍会卡 UI？
- Isolate 解决什么问题？

## 1. Dart 默认是单 isolate 事件循环

Flutter UI 运行在主 isolate。一个 isolate 内是单线程事件循环。

队列：

```text
Microtask Queue
Event Queue
```

执行顺序：

```text
先清空 microtask
再处理一个 event
循环
```

如果 microtask 不断追加，event queue 会被饿死。在 Flutter 里,microtask 在每帧 `drawFrame` 前后清空,无限 microtask 会卡死整帧调度乃至手势/IO 事件。

## 2. Future 不是线程

```dart
Future(() {
  heavyWork();
});
```

这只是把任务放到 event queue，不代表新线程。CPU 密集计算仍在当前 isolate 执行，会阻塞 UI。

网络请求这种 IO 等待适合 Future；大 JSON 解析不适合直接放主 isolate。

## 3. async/await 是语法糖

```dart
final data = await fetch();
```

await 会让出执行权(函数立即返回,事件循环继续处理其它任务),Future 完成后,await 之后的代码以 **microtask** 形式恢复。它不会阻塞线程。

但 await 前后的同步代码仍在当前 isolate。

## 4. Stream 表示多次异步事件

Future：一次结果。

Stream：多次事件。

适合：

- WebSocket。
- SSE。
- 下载进度。
- 输入变化。
- 状态流。

注意 StreamSubscription 要 cancel，否则可能泄漏。

## 5. Broadcast Stream

Single-subscription Stream 只能监听一次。Broadcast Stream 可以多个监听者。

但 Broadcast 不会自动缓存历史事件，新监听者可能收不到过去事件。

## 6. Isolate 是真正并行

Isolate 之间内存不共享，只通过 `SendPort`/`ReceivePort` 传消息,消息默认深拷贝(大块二进制可用 `TransferableTypedData` 零拷贝转移)。新版本用 `Isolate.run` 比手写 `spawn` 更简洁,也是 `compute` 的现代替代。

适合：

- 大 JSON 解析。
- 图片处理。
- 加密压缩。
- 大量计算。

不适合：

- 高频小任务。
- 需要共享复杂对象。
- UI 操作。

## 7. 高频追问

### Q1：Future 会开线程吗？

不会。Future 是异步结果抽象，默认仍在当前 isolate 事件循环中。

### Q2：microtask 和 Future 谁先？

microtask queue 优先于 event queue。但要分清哪些进哪个队列，这是高频深挖点：

- 进 **event queue**：`Future(() => ...)`、`Future.delayed`、IO/timer 回调。
- 进 **microtask queue**：`scheduleMicrotask`、`Future.value(x).then(...)`、`await` 之后的续体。

所以不是“所有 Future 都晚于 microtask”——`Future.value().then(cb)` 的 cb 其实是 microtask。下面的输出要能讲清：

```dart
Future(() => print('A'));                 // event
Future.value(0).then((_) => print('B'));  // microtask
scheduleMicrotask(() => print('C'));      // microtask
// 输出：B C A（先清空 microtask，B/C 按入队顺序，再处理 event A）
```

### Q3：大 JSON 为什么用 Isolate？

JSON 解析是 CPU 密集任务，在主 isolate 会阻塞 build/layout/paint 和事件响应。

### Q4：Stream 泄漏怎么产生？

页面销毁后 subscription 未 cancel，事件源继续持有回调，回调持有 State。

## 8. 事件顺序经典题

示例：

```dart
void main() {
  Future(() => print('event'));
  scheduleMicrotask(() => print('microtask'));
  print('sync');
}
```

输出：

```text
sync
microtask
event
```

因为同步代码先执行，然后清空 microtask queue，再处理 event queue。

## 9. compute 是什么？

Flutter 提供 `compute` 简化 isolate 使用，适合一次性 CPU 任务。

例如：

```dart
final result = await compute(parseJson, raw);
```

注意：

- 传入函数必须是顶层或静态函数。
- 参数和返回值需要可跨 isolate 传递。
- isolate 创建也有成本，不适合很小的任务高频调用。

## 10. 异步取消问题

Future 本身没有天然取消语义。页面退出后 Future 完成，仍可能回调 State。

工程处理：

- `mounted` 检查。
- CancelableOperation。
- repository 层取消请求。
- BLoC dispose 时关闭 stream。

## 项目回答模板

> 我会区分 IO 异步和 CPU 并行。网络请求用 Future，持续事件用 Stream，大 JSON 或图片处理用 Isolate。Stream 在页面 dispose 时必须 cancel，避免事件源持有页面状态。


## 深挖追问：Dart 异步要区分事件循环、并发和并行

Dart 单 isolate 内是事件循环模型：

```text
先清空 microtask queue
  -> 再取一个 event queue 事件
  -> 执行同步代码
  -> 过程中产生的 microtask 继续优先清空
```

所以 microtask 过多会饿死 event queue，造成 UI 事件、Timer、I/O 回调迟迟不能执行。

`Future` 继续追问：

- Future 不等于线程。
- `async/await` 是状态机语法糖。
- await 之后的代码会拆成 continuation，等 Future 完成后再调度。
- async gap 之后 Widget 可能已经 dispose，所以要检查 `mounted`。

Stream 深挖：

| 类型 | 特点 | 风险 |
|---|---|---|
| single-subscription | 只能一个监听者 | 多 listen 报错 |
| broadcast | 多监听者 | 可能丢事件，不天然背压 |
| sync controller | 同步派发 | 递归和重入风险 |
| async controller | 异步派发 | 时序更安全但延迟 |

Stream 泄漏常见链：

```text
State -> StreamSubscription -> callback -> State
```

退出页面不 cancel，State 就可能被 subscription 持有。

Isolate 深挖：

- Isolate 之间不共享内存，通过消息传递。
- 普通消息通常会复制，复杂大对象有成本。
- `TransferableTypedData` 可减少大二进制数据传输成本。
- Isolate 适合 CPU 密集任务，不适合为了普通异步 I/O 滥用。

取消问题：

---

## 🔬 深度扩展：Isolate的SendPort与ReceivePort机制

### 扩展1：Isolate通信的完整流程

**创建Isolate：**
```dart
void heavyTask(SendPort sendPort) {
  // 执行耗时计算
  int result = compute(data);
  
  // 发送结果回主Isolate
  sendPort.send(result);
}

void main() async {
  // 创建ReceivePort
  ReceivePort receivePort = ReceivePort();
  
  // 启动Isolate，传入SendPort
  await Isolate.spawn(heavyTask, receivePort.sendPort);
  
  // 监听结果
  receivePort.listen((message) {
    print('Result: $message');
    receivePort.close();
  });
}
```

**双向通信：**
```dart
void isolateTask(SendPort mainSendPort) {
  // 创建自己的ReceivePort
  ReceivePort receivePort = ReceivePort();
  
  // 发送自己的SendPort给主Isolate
  mainSendPort.send(receivePort.sendPort);
  
  // 监听主Isolate的消息
  receivePort.listen((message) {
    print('Received: $message');
    mainSendPort.send('Response: $message');
  });
}
```

### 扩展2：Isolate的消息拷贝机制

**普通消息（深拷贝）：**
```dart
List<int> data = List.generate(1000000, (i) => i);

// 发送时完整拷贝
sendPort.send(data);  // 拷贝100万个int
```

**TransferableTypedData（零拷贝）：**
```dart
import 'dart:typed_data';

Uint8List data = Uint8List(1000000);

// 转为TransferableTypedData
TransferableTypedData transferable = TransferableTypedData.fromList([data]);

// 发送（转移所有权，不拷贝）
sendPort.send(transferable);

// 发送后data不可用
```

### 扩展3：async/await的状态机转换

**源码：**
```dart
Future<String> fetchData() async {
  print('1');
  String result = await httpGet();
  print('2');
  return result;
}
```

**编译器转换（简化）：**
```dart
Future<String> fetchData() {
  return _fetchData$async();
}

Future<String> _fetchData$async() {
  final completer = Completer<String>();
  
  void _continuation(dynamic value) {
    // await之后的代码
    print('2');
    completer.complete(value as String);
  }
  
  print('1');
  httpGet().then(_continuation, onError: completer.completeError);
  
  return completer.future;
}
```

### 扩展4：Stream的背压处理

**问题：生产快于消费**
```dart
StreamController<int> controller = StreamController();

// 快速生产
for (int i = 0; i < 10000; i++) {
  controller.add(i);
}

// 慢速消费
controller.stream.listen((data) async {
  await Future.delayed(Duration(milliseconds: 100));
  print(data);
});
```

**解决：暂停/恢复**
```dart
StreamSubscription subscription = controller.stream.listen((data) async {
  subscription.pause();  // 暂停接收
  
  await processData(data);
  
  subscription.resume();  // 恢复接收
});
```

### 扩展5：Compute函数的实现

**compute封装：**
```dart
Future<R> compute<Q, R>(ComputeCallback<Q, R> callback, Q message) async {
  ReceivePort receivePort = ReceivePort();
  
  await Isolate.spawn(
    _isolateEntryPoint,
    _IsolateConfiguration(callback, message, receivePort.sendPort),
  );
  
  return await receivePort.first as R;
}

void _isolateEntryPoint(_IsolateConfiguration config) {
  final result = config.callback(config.message);
  config.sendPort.send(result);
}
```

**使用场景：**
```dart
// 图片解码
Uint8List bytes = await compute(decodeImage, imageData);

// JSON解析
Map<String, dynamic> json = await compute(jsonDecode, largeJsonString);
```

### 扩展6：StreamController的sync参数

**async（默认）：**
```dart
StreamController<int> controller = StreamController();

controller.stream.listen((data) {
  print('Listener: $data');
});

controller.add(1);
print('After add');

// 输出：
// After add
// Listener: 1（延迟到下一个microtask）
```

**sync：**
```dart
StreamController<int> controller = StreamController(sync: true);

controller.stream.listen((data) {
  print('Listener: $data');
});

controller.add(1);
print('After add');

// 输出：
// Listener: 1（立即执行）
// After add
```

**风险：**
```dart
controller.stream.listen((data) {
  controller.add(data + 1);  // 递归add
});

controller.add(1);  // StackOverflow
```

### 扩展7：Future的错误处理

**try-catch：**
```dart
try {
  String result = await fetchData();
} catch (e) {
  print('Error: $e');
}
```

**catchError：**
```dart
fetchData()
  .then((result) => print(result))
  .catchError((e) => print('Error: $e'));
```

**whenComplete：**
```dart
fetchData()
  .then((result) => print(result))
  .catchError((e) => print('Error: $e'))
  .whenComplete(() => print('Done'));  // 类似finally
```

### 扩展8：EventLoop的任务队列

**两个队列：**
```text
Event Queue（事件队列）：
- Timer
- IO
- User Input

Microtask Queue（微任务队列）：
- Future.then
- scheduleMicrotask
```

**执行顺序：**
```text
1. 执行当前任务
2. 清空Microtask Queue
3. 从Event Queue取下一个任务
4. 重复
```

**示例：**
```dart
Future.delayed(Duration.zero, () => print('1'));
scheduleMicrotask(() => print('2'));
print('3');

// 输出：3, 2, 1
// 3: 同步代码
// 2: Microtask优先
// 1: Event Queue
```

---

## 补充总结

Dart异步的深度记忆点：

1. **Isolate通信**：SendPort/ReceivePort消息传递
2. **消息拷贝**：普通消息深拷贝、TransferableTypedData零拷贝
3. **async/await**：编译器转状态机、continuation
4. **Stream背压**：pause/resume控制消费速度
5. **compute**：封装Isolate.spawn的便捷函数
6. **StreamController.sync**：同步派发有递归风险
7. **错误处理**：try-catch、catchError、whenComplete
8. **EventLoop**：Microtask优先于Event

面试追问时要能讲出：
- Isolate的通信机制（SendPort/ReceivePort）
- TransferableTypedData的优势（零拷贝）
- async/await的编译器转换（状态机）
- Stream背压的处理（pause/resume）

> Future 本身没有通用取消语义。工程上要用 token、CancelableOperation、状态机或丢弃过期结果。否则搜索、分页、页面退出后回调都可能出现旧结果覆盖新状态。

## 一句话总结

Dart 异步靠事件循环表达非阻塞流程，Future/Stream 不等于线程，真正 CPU 并行要用 Isolate。
