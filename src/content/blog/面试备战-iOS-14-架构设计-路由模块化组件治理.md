---
title: "面试备战 iOS 14：架构设计、路由、模块化与组件治理"
description: "从模块边界、依赖方向、路由协议、组件化治理、CI 约束和 Flutter 混合栈设计深入拆解 iOS 架构面试。"
publishedAt: "2026-06-08"
tags: ["面试", "iOS", "架构", "模块化"]
---

# 面试备战 iOS 14：架构设计、路由、模块化与组件治理

架构面试不要堆名词。MVVM、组件化、路由、中台都只是手段。面试官真正要听的是：

- 业务为什么需要拆？
- 模块边界如何定义？
- 依赖方向如何控制？
- 页面和服务如何跨模块调用？
- 架构如何防腐？
- Flutter 混合栈如何纳入同一套治理？

## 1. 架构设计先回答目标

常见目标：

- 降低耦合。
- 提高编译效率。
- 支持多人并行。
- 支持业务独立迭代。
- 降低回归风险。
- 提高可测试性。
- 支持 Native/Flutter 混合。

不要为了“看起来高级”拆模块。

## 2. 模块分层

常见结构：

```text
App Shell
Business Modules
Business Services
Foundation Components
Infrastructure
Third-party Adapters
```

依赖方向：

```text
业务 -> 业务服务 -> 基础组件 -> 基础设施
```

禁止基础层反向依赖业务。

模块间解耦的核心是**依赖倒置**:把通信用的 protocol 下沉到公共层,上层业务模块之间只依赖接口、不依赖对方实现,运行时由路由/容器注入具体实现。

## 3. 路由解决什么？

路由不只是页面跳转。它解决模块间调用：

- 页面打开。
- 参数传递。
- 登录拦截。
- 降级。
- 回调。
- Flutter/Native 统一跳转。
- 埋点。

## 4. URL Router vs Protocol Router

### URL Router

优点：

- 灵活。
- 适合外部链接。
- 易配置。

缺点：

- 参数弱类型。
- 运行时才发现错误。
- 容易变成字符串地狱。

### Protocol Router

优点：

- 类型安全。
- IDE 可发现。
- 编译期约束。

缺点：

- 接入成本高。
- 动态性弱。

### Target-Action Router

国内常见的第三种(如 CTMediator):用 runtime `performSelector` + category 包装,去中心化、无需注册表。缺点是字符串硬编码、缺编译期检查。

大工程可以组合：

```text
外部入口 URL
内部服务 Protocol
统一路由层做转换和治理
```

## 5. 如何避免路由膨胀？

常见坏味道：

```text
open(url, params: [String: Any])
```

所有业务都塞 params，最后没人知道字段含义。

治理方式：

- 路由按业务域分组。
- 参数模型化。
- 必填参数校验。
- 统一错误码。
- 路由注册可扫描。
- 无主路由下线。
- Flutter/Native 路由统一协议。

## 6. 组件治理

组件化后最大问题是腐化：

- 循环依赖。
- 重复基础能力。
- 业务下沉基础层。
- 组件越拆越碎。
- 版本冲突。
- 包体膨胀。

治理要靠工具：

- CI 检查依赖方向(解析 Podfile.lock / SPM package graph 做有向图环检测)。
- 禁止循环依赖。
- LinkMap 包体监控。
- 模块 owner。
- API review。
- 废弃接口治理。

## 7. Flutter 混合架构

混合栈要纳入架构，不是临时开页面。

要统一：

- 路由协议。
- 页面生命周期。
- 返回语义。
- Native/Flutter 通信。
- 埋点。
- 权限。
- 登录态。
- 错误降级。

否则 Flutter 页面越多，Native 和 Flutter 会形成两套割裂系统。

## 高频追问

### Q1：MVVM 的价值？

把视图展示逻辑和状态处理从 ViewController 中拆出，降低 VC 复杂度，提高可测试性。但 ViewModel 不应变成上帝对象。

### Q2：模块间通信怎么做？

页面跳转走路由，服务调用走协议，广播事件谨慎使用通知。跨模块不直接依赖具体实现。

### Q3：组件化有什么代价？

接口设计、版本管理、依赖治理、调试链路、CI 成本都会上升。复杂工程需要，简单工程不应过度设计。

### Q4：架构如何防腐？

靠规则和工具：依赖扫描、CI 检查、模块 owner、接口 review、包体监控和文档。

## 项目回答模板

> 我做架构设计会先明确业务变化和团队协作问题，再拆模块。模块间页面跳转走统一路由，服务调用走协议，依赖方向用 CI 约束。Flutter 页面也接入同一路由和生命周期体系，避免 Native/Flutter 两套栈割裂。


## 深挖追问：架构题不是画分层图，而是治理复杂度

高级架构回答要从“复杂度来源”开始：

- 业务变化快。
- 多团队并行。
- 模块相互依赖。
- 页面跳转和参数传递混乱。
- 基础能力重复造。
- 编译和发布成本上升。

模块化继续追问时，要讲依赖方向：

```text
App Shell
  -> Feature Modules
  -> Domain Services
  -> Foundation/Core
```

原则是上层依赖下层，业务模块之间不直接互相 import。跨模块能力通过协议、路由、服务注册或事件总线暴露，但每种方式都有边界。

路由深挖：

| 方案 | 优点 | 风险 |
|---|---|---|
| URL Router | 灵活、跨端统一、适合外链 | 字符串参数弱类型 |
| Protocol Router | 类型安全、IDE 友好 | 动态性弱，跨端难统一 |
| Target-Action | 解耦编译依赖 | selector 字符串、运行时风险 |
| 编译期注册 | 性能好、可发现 | 工具链复杂 |

如何避免路由膨胀：

- 按领域划分路由表。
- 参数 schema 化。
- 版本兼容和降级。
- 死链监控。
- 权限/登录/风控用拦截器统一处理。
- 禁止在路由层写业务分支。

组件治理继续追问：

> 组件化的代价是边界成本和治理成本。没有依赖检查、Owner、版本策略、接口评审、废弃机制，组件会从“解耦”变成“更多胶水代码”。

项目回答模板：

> 我会把架构设计落到三个可量化指标：业务接入成本、问题定位成本、长期演进成本。比如路由不是为了炫技，而是让页面跳转、登录拦截、埋点、降级、Flutter/Native 混合栈都走统一治理面。

## 一句话总结

架构设计的核心不是模式名，而是让业务长期演进时边界清晰、依赖可控、问题可定位、治理可持续。

---

## 🔬 深度扩展：路由注册时机与参数传递方案

### 扩展1：URL路由的完整实现

**路由注册：**
```objc
// 在启动时注册
[Router registerURL:@"app://product/detail" 
            handler:^(NSDictionary *params) {
    NSString *productId = params[@"id"];
    ProductDetailVC *vc = [[ProductDetailVC alloc] initWithProductId:productId];
    return vc;
}];
```

**路由调用：**
```objc
// 跳转
[Router openURL:@"app://product/detail?id=123" 
       animated:YES
     completion:nil];

// 获取ViewController
UIViewController *vc = [Router viewControllerForURL:@"app://product/detail?id=123"];
[self.navigationController pushViewController:vc animated:YES];
```

**参数传递：**
```objc
// 方案1：URL参数（简单类型）
@"app://product/detail?id=123&from=home"

// 方案2：UserInfo传递复杂对象
NSDictionary *userInfo = @{@"product": productModel};
[Router openURL:@"app://product/detail" 
       userInfo:userInfo 
       animated:YES];
```

### 扩展2：Protocol路由的类型安全

**定义协议：**
```objc
@protocol ProductRouterProtocol <NSObject>
- (UIViewController *)productDetailWithId:(NSString *)productId;
- (UIViewController *)productListWithCategory:(NSString *)category;
@end
```

**注册实现：**
```objc
@interface ProductRouter : NSObject <ProductRouterProtocol>
@end

@implementation ProductRouter
- (UIViewController *)productDetailWithId:(NSString *)productId {
    return [[ProductDetailVC alloc] initWithProductId:productId];
}
@end

// 注册
[ServiceLocator registerService:@protocol(ProductRouterProtocol) 
                    implementation:[ProductRouter new]];
```

**调用：**
```objc
id<ProductRouterProtocol> router = [ServiceLocator serviceForProtocol:@protocol(ProductRouterProtocol)];
UIViewController *vc = [router productDetailWithId:@"123"];
[self.navigationController pushViewController:vc animated:YES];
```

### 扩展3：路由拦截器链

**拦截器协议：**
```objc
@protocol RouterInterceptor <NSObject>
- (BOOL)shouldIntercept:(RouterRequest *)request;
- (void)intercept:(RouterRequest *)request completion:(void(^)(BOOL shouldContinue))completion;
@end
```

**登录拦截器：**
```objc
@implementation LoginInterceptor
- (BOOL)shouldIntercept:(RouterRequest *)request {
    return request.requiresLogin && ![UserManager isLoggedIn];
}

- (void)intercept:(RouterRequest *)request completion:(void(^)(BOOL))completion {
    [LoginVC showWithCompletion:^(BOOL success) {
        completion(success);
    }];
}
@end
```

**拦截器链执行：**
```objc
- (void)openURL:(NSString *)url {
    RouterRequest *request = [RouterRequest requestWithURL:url];
    
    [self executeInterceptors:self.interceptors 
                      request:request 
                        index:0 
                   completion:^(BOOL shouldContinue) {
        if (shouldContinue) {
            [self realOpenURL:url];
        }
    }];
}

- (void)executeInterceptors:(NSArray<id<RouterInterceptor>> *)interceptors
                    request:(RouterRequest *)request
                      index:(NSInteger)index
                 completion:(void(^)(BOOL))completion {
    if (index >= interceptors.count) {
        completion(YES);
        return;
    }
    
    id<RouterInterceptor> interceptor = interceptors[index];
    if ([interceptor shouldIntercept:request]) {
        [interceptor intercept:request completion:^(BOOL shouldContinue) {
            if (shouldContinue) {
                [self executeInterceptors:interceptors request:request index:index+1 completion:completion];
            } else {
                completion(NO);
            }
        }];
    } else {
        [self executeInterceptors:interceptors request:request index:index+1 completion:completion];
    }
}
```

### 扩展4：组件依赖的循环检测

**依赖声明：**
```ruby
# Podfile
target 'ModuleA' do
  pod 'ModuleB'
  pod 'Foundation'
end

target 'ModuleB' do
  pod 'ModuleC'
  pod 'Foundation'
end
```

**循环依赖检测脚本：**
```python
def detect_cycle(graph, start, visited, path):
    visited.add(start)
    path.append(start)
    
    for neighbor in graph.get(start, []):
        if neighbor in path:
            cycle = path[path.index(neighbor):] + [neighbor]
            return cycle
        if neighbor not in visited:
            result = detect_cycle(graph, neighbor, visited, path)
            if result:
                return result
    
    path.pop()
    return None

# 构建依赖图
graph = parse_podfile()
for module in graph:
    cycle = detect_cycle(graph, module, set(), [])
    if cycle:
        print(f"循环依赖: {' -> '.join(cycle)}")
```

### 扩展5：组件降级策略

**降级配置：**
```json
{
  "routes": {
    "app://product/detail": {
      "fallback": "app://webview",
      "fallbackParams": {
        "url": "https://m.example.com/product"
      }
    }
  }
}
```

**降级实现：**
```objc
- (UIViewController *)viewControllerForURL:(NSString *)url {
    @try {
        UIViewController *vc = [self createViewControllerForURL:url];
        if (vc) return vc;
    } @catch (NSException *exception) {
        [ErrorTracker logException:exception];
    }
    
    // 降级
    NSDictionary *fallback = [self fallbackForURL:url];
    if (fallback) {
        return [self viewControllerForURL:fallback[@"url"]];
    }
    
    // 默认降级到webview
    return [[WebViewController alloc] initWithURL:[self webURLForRoute:url]];
}
```

### 扩展6：跨端路由统一

**路由映射表：**
```json
{
  "product_detail": {
    "ios": "app://product/detail",
    "android": "app://product/detail",
    "flutter": "/product/detail",
    "h5": "https://m.example.com/product"
  }
}
```

**统一跳转接口：**
```dart
// Flutter
class UnifiedRouter {
  static Future<void> push(String routeName, Map<String, dynamic> params) async {
    if (Platform.isIOS || Platform.isAndroid) {
      // 调用Native路由
      await MethodChannel('router').invokeMethod('push', {
        'route': routeName,
        'params': params,
      });
    } else {
      // Flutter内部路由
      Navigator.pushNamed(context, routeName, arguments: params);
    }
  }
}
```

### 扩展7：组件接口版本管理

**接口定义：**
```objc
@protocol PaymentServiceProtocol <NSObject>
@required
// v1.0
- (void)payWithAmount:(NSDecimalNumber *)amount completion:(void(^)(BOOL success))completion;

@optional
// v2.0 新增
- (void)payWithOrder:(PayOrder *)order completion:(void(^)(PayResult *result))completion;
@end
```

**版本兼容：**
```objc
id<PaymentServiceProtocol> service = [ServiceLocator serviceForProtocol:@protocol(PaymentServiceProtocol)];

if ([service respondsToSelector:@selector(payWithOrder:completion:)]) {
    // 使用v2.0接口
    [service payWithOrder:order completion:completion];
} else {
    // 降级到v1.0接口
    [service payWithAmount:order.amount completion:^(BOOL success) {
        completion(success ? [PayResult successResult] : [PayResult failResult]);
    }];
}
```

### 扩展8：组件Owner与治理

**组件元信息：**
```yaml
# ComponentInfo.yaml
name: PaymentModule
owner: payment-team
version: 2.1.0
dependencies:
  - Foundation: ">= 1.0"
  - Network: "~> 2.0"
apis:
  - PaymentServiceProtocol
  - PaymentUIProtocol
deprecated_apis:
  - OldPaymentProtocol: "使用PaymentServiceProtocol替代"
```

**CI检查：**
```bash
# 检查是否使用了废弃API
grep -r "OldPaymentProtocol" . --include="*.m" --include="*.swift"
if [ $? -eq 0 ]; then
  echo "错误：使用了废弃API OldPaymentProtocol"
  exit 1
fi

# 检查循环依赖
python check_dependencies.py
```

---

## 补充总结

组件化的深度记忆点：

1. **URL路由**：注册handler、参数传递、类型安全
2. **Protocol路由**：编译期检查、IDE友好
3. **拦截器链**：登录、权限、埋点统一处理
4. **循环依赖**：依赖图检测、编译期拦截
5. **降级策略**：异常兜底、webview降级
6. **跨端统一**：路由映射表、统一跳转接口
7. **版本管理**：接口兼容、respondsToSelector检查
8. **治理机制**：Owner、废弃API检测、CI检查

面试追问时要能讲出：
- URL路由和Protocol路由的优劣（灵活vs类型安全）
- 拦截器链的实现（递归执行、completion回调）
- 循环依赖的检测方法（DFS遍历依赖图）
- 组件降级的策略（异常捕获、fallback配置）
