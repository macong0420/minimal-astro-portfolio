---
title: "Flutter 页面栈和原生页面栈如何统一管理"
description: "以混合工程为例，拆解原生壳、Flutter 容器、统一路由协议、返回语义和生命周期同步如何共同解决页面栈管理问题。"
publishedAt: "2026-05-09"
tags:
  - "Flutter"
  - "Hybrid"
---

在 Flutter 混合开发里，最容易失控的模块之一就是页面栈。

原因很直接：原生有自己的导航栈，Flutter 也有自己的 `Navigator` 栈。如果没有统一抽象，常见问题会很快出现，比如入口分散、返回行为不一致、Flutter 页面无法正确关闭原生容器、埋点生命周期不准确，以及跨端跳转参数丢失。

这篇文章结合一个实际项目，讲清楚一个核心观点：**统一管理不等于把两个栈强行合并成一个栈，而是通过边界和协议让它们稳定协作**。

## 一、整体架构：三层职责拆分

这套混合栈方案可以拆成三层：原生壳工程、Flutter 主工程、业务 Package。

### 1）原生壳工程

iOS 侧由 `DWMainViewController` 组织主 Tab。工作台、我的、消息等页面保持原生实现；工地 Tab 这类页面则通过 `DWConstructionSiteController` 创建 Flutter 页面容器。

```objc
[DWHomeFlutterModule createFlutterViewControllerWithPage:@"beikesteward://page/construction/site" params:@{}];
```

这里原生并不关心 Flutter 内部是哪个 `Widget`，只把它当成一个可 `push`、可承载的 `UIViewController`。这一步把 Flutter 页面“容器化”，使其能够以原生页面身份进入原生导航体系。

### 2）Flutter 主工程

`flutter_smartstorephone_portal/lib/main.dart` 负责初始化 `FlutterRunnerHelper`，并注册各业务 Package 的路由表：

```dart
FlutterRunnerHelper.singleton.registerPageBuilders(homeUrlPage);
FlutterRunnerHelper.singleton.registerPageBuilders(storeUrlPage);
FlutterRunnerHelper.singleton.registerPageBuilders(contentUrlPage);
```

主工程本身不承载复杂业务，它更像路由调度层。真正的页面映射来自业务 Package，例如 `flutter_home_package/page_url_map.dart`：

```dart
RouterUri.pageConstructionSite: (...) => ConstructMainPage(),
RouterUri.pageEngineerManager: (...) => EngineerManagerHomePage(),
RouterUri.pageLitteMasterChat: (...) => LittleMasterChatPage(...),
```

这种拆法能让主工程保持轻量，也能让业务模块独立演进。

### 3）业务 Package

业务层只关心“业务页面怎么跳”，不直接控制原生导航控制器。页面打开、关闭、原生能力调用都收敛到统一封装，例如：

```dart
RouterTools.openWebView(url);
```

实际调用链路大致是：

```text
Flutter 业务页
  -> RouterTools
  -> HomeFlutterPluginAdapter
  -> BeiKeHomeFlutterPlugin
  -> MethodChannel("home_flutter_plugin")
  -> iOS DWHomeFlutterPlugin
  -> DWWebViewController / DWRouter / 原生能力
```

统一管理的基础就在这里：Flutter 不直接依赖原生细节，原生也不感知 Flutter 内部 Widget；双方只依赖统一路由协议和桥接接口。

## 二、统一路由协议：先统一“页面身份”

项目里页面使用统一 URL scheme，例如：

```text
beikesteward://page/construction/site
beikesteward://page/engineer/manager
beikesteward://page/little/master/chat
beikesteward://page/presurvey/entry
```

原生打开 Flutter 页面时，会把 `page` 补成完整 URL；Flutter 再根据 URL 命中对应 `PageBuilder`。反过来，Flutter 打开原生页面时，也可将 URL 交给原生 `DWRouter` 或宿主插件处理。

这样做最关键的收益是：**页面有了统一身份**。无论页面来自原生还是 Flutter，都能用同一 URL 被识别，埋点、降级、白名单、运营弹窗匹配等能力都可以围绕这个标识展开。

## 三、统一容器：两个栈共存，但边界清晰

原生通过 `BKRunnerShared.sharedInstance.router container:urlParams:exts:isShare:` 创建 Flutter 容器。对宿主来说，Flutter 页面本质就是一个 `UIViewController`。

结构可以理解为：

```text
Native UINavigationController
  ├─ Native ViewController
  └─ BKFlutterViewController
       └─ Flutter Navigator / Router
```

也就是说：

- 原生栈只感知到 Flutter 容器这一层。
- 容器内部页面切换由 Flutter 自己管理。

所以“统一管理”的重点从来不是消灭双栈，而是明确职责边界：**宿主级导航归原生，容器内导航归 Flutter，跨边界动作必须走统一协议**。

## 四、统一返回语义：先定优先级，再做封装

Flutter 内部返回优先通过 `FlutterRunnerHelper`：

```dart
FlutterRunnerHelper.singleton.pop();
FlutterRunnerHelper.singleton.finish(result: result);
```

业务层再封成稳定接口：

```dart
RouterTools.navigatorBack(context);
RouterTools.finish(map: map);
```

规则很清晰：如果 Flutter 内部还能 `pop`，先返回 Flutter route；如果当前容器应该退出，则调用 `finish` 让宿主关闭容器。

推荐统一返回优先级：

1. Flutter 内部 `Navigator` 可返回时，先 `pop` Flutter route。
2. Flutter 容器作为原生页面存在时，关闭 Flutter `ViewController`。
3. 原生页面返回时，交由 `UINavigationController` 执行 `pop`。
4. 需要回传结果时，通过 `finish(result)` 或 `MethodChannel` callback 传递。

如果业务绕过封装直接调用 `Navigator.pop` 或零散 channel，很容易出现重复返回、容器关闭错误、结果丢失。

## 五、统一生命周期与埋点：补齐宿主视角盲区

Flutter 主入口中的 `_AppHomeState` 借助 `RunnerMainStateMixin` 监听 route 生命周期，例如：

```text
hasPushed
hasPoped
willAppear
willDisappear
```

再通过 `OneNotification.post` 同步 route、动作、时间戳：

```dart
OneNotification.post(
  name: "opration_router_generic_notification",
  userInfo: {
    "current_route": _currentRoute,
    "action_type": action.index,
    "timestamp": DateTime.now().millisecondsSinceEpoch,
  },
);
```

这一步非常关键。因为 Flutter 内部 route 变化不会反映到原生导航栈，宿主默认只看到一个 `BKFlutterViewController` 容器，看不到容器内当前到底是哪个业务页。生命周期同步机制正是为了解决这个可观测性缺口。

## 六、统一原生能力调用：业务只依赖稳定接口

Flutter 侧通过 Adapter 获取原生能力，而不是直接写平台分支：

```dart
HomeFlutterPluginAdapter.openWeb(...);
HomeFlutterPluginAdapter.netPost(...);
HomeFlutterPluginAdapter.userRole();
HomeFlutterPluginAdapter.getProject();
```

iOS/Android 走 `home_flutter_plugin`，鸿蒙走 `beikesmartstorepad_flutter_plugin`。业务层不关心具体平台实现，只依赖统一接口。

网络也沿用同样思路。Flutter 业务发起：

```dart
RequestTools.post(url, body: params);
```

底层通过 `MethodChannel` 交给原生网络库补齐 token、城市、角色、签名、环境等通用参数。这样既复用端上成熟基础能力，也避免 Flutter 侧重复造轮子。

## 七、方案收益

这套方案的实际价值主要体现在四点：

1. 边界清晰：原生管理宿主栈，Flutter 管理容器内栈，跨端跳转统一协议。
2. 业务稳定：业务代码依赖 `RouterTools`、`RequestTools`、`HomeFlutterPluginAdapter` 等高层封装，不直接绑定平台细节。
3. 易于扩展：主工程只负责路由注册，多个业务 Package 可独立维护页面和跳转关系。
4. 监控完整：Flutter route 生命周期可同步给宿主，支撑埋点、运营弹窗、异常上报与页面识别。

## 八、风险与注意点

1. 不要让原生和 Flutter 各自维护一套路由规则。协议一旦分裂，跳转、降级、埋点、权限控制都会失控。
2. 不要把 Flutter 内部 route 误当作原生页面切换。它不会自动体现在原生栈里，必须主动同步生命周期。
3. 返回逻辑必须统一收敛。禁止业务层到处散落 `Navigator.pop` 或私有 channel。
4. `MethodChannel` 协议是跨端契约。`netGet`、`netPost`、`openPage`、`web`、`userRole` 等方法名应严格版本化管理，避免随意变更。

## 总结

Flutter 页面栈与原生页面栈的统一管理，核心不在“合并栈”，而在“统一语言”。

这套语言包括：**URL 路由协议、Flutter 容器、Runner 路由表、MethodChannel 桥接、生命周期同步机制**。当跨栈跳转、返回、能力调用与状态感知都收敛到同一套规则里，混合工程的页面管理才能长期保持清晰、稳定、可维护。
