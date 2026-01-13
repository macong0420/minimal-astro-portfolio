---
title: "Pre-main 时间打点,统计 pre-mian 耗时的具体实现"
description: "冷启动优化第一步,确认 pre-main 启动耗时的统计"
publishedAt: "2025-12-28"
tags:
  - "iOS"
  - "启动耗时"
---


  1. 记录进程创建时间

在 UIApplication+LJUIProbe.m:190–208，我们 swizzle 了 -setDelegate:，调用

 ljtol_current_task_create_timestamp()（系统内核级进程创建时戳）并写入“海神”埋点对象，标记为

LJUPAppStateProc，这样就把 dyld 加载、类加载（+load）这段系统逻辑也纳入统计。

 2. 记录 main 入口时间

- 又在同一个文件的 ljup_UIApplicationMain（UIApplication+LJUIProbe.m:130–134）里用 fishhook hook 了

UIApplicationMain，首次调用 ljuplaunch_appendMainStamp()，标记从进程创建到进入 UIApplicationMain 的边界。

为了保险，在自己 App 的 main.m:17–20 顶部也手动再调一次 ljuplaunch_appendMainStamp()，确保任何路径都能准确落点。


  接下来，我们还 hook 了 application:willFinishLaunchingWithOptions: 和 …didFinishLaunchingWithOptions:（同文件 140–

  167 行）做后续埋点，最终就形成了“进程启动 → main 入口 → willFinish → didFinish”全流程闭环，从而精准量化了 Pre‑main

  阶段的整体耗时。”

### 具体代码实现

 在我们的埋点方案里，并不是单纯记录 main 执行到 UIApplicationMain 的时长，而是同时对“进程创建”做了埋点，覆盖系统加载

  阶段。关键在这段 swizzle 代码：

  ```objc
  // Pods/LJBaseUIProber/.../UIApplication+LJUIProbe.m:190–208
  [RSSwizzle swizzleInstanceMethod:@selector(setDelegate:)
                           inClass:[self class]
                    newImpFactory:^id(RSSwizzleInfo *info) {
    return ^void (id self, id delegate) {
      // 调用原始 setDelegate:
      typedef void (*imp_t)(id, SEL, id);
      ((imp_t)[info getOriginalImplementation])(self, info.selector, delegate);
      // 记录进程创建时间（系统层面）
      ljtol_time_msec procCreate = ljtol_current_task_create_timestamp();
      if (procCreate) {
        LJUPDot *dot = [LJUPDot dotWithType:LJUPAppStateProc
                                    moment:LJUPDotMomentNone
                                 timestamp:procCreate];
        [LJPROBER_APP_LAUNCH.launch addDot:dot];
      }
      // Hook 后续 willFinish/didFinish 埋点...
      ljup_UIApplication_launch_hook(delegate);
    };
  } mode:RSSwizzleModeOncePerClass key:"ljup_setDelegate"];
  ```

  

  - ljtol_current_task_create_timestamp()（ljtools 提供）直接从内核拿到「进程创建时刻」。

  - 我们把它标记为 LJUPAppStateProc（进程启动点），因此即使在 main 之前、系统调用流程里（dyld 加载 Mach‑O、+load 执行

    等）也能纳入统计。


  随后在拦截的 UIApplicationMain wrapper 里，再次打点 main 时刻：
```C
  // Pods/.../UIApplication+LJUIProbe.m:130–134
  static int ljup_UIApplicationMain(int argc, char *argv[], NSString *principalClassName, NSString *delegateClassName) {
  // 记录 main 到 UIApplicationMain 入口
	    ljuplaunch_appendMainStamp();  
	    return ljup_origin_UIApplicationMain(argc, argv, principalClassName, delegateClassName);
  }
```


  并在 JGWorkflow/main.m 顶部手动补一遍，保证任意路径下都能准确触发：
```objc
// JGWorkflow/main.m:17–20
  int main(int argc, char * argv[]) {
    ljuplaunch_appendMainStamp();
    @autoreleasepool {
      return UIApplicationMain(argc, argv, nil, NSStringFromClass([AppDelegate class]));
    }
  }
```

 
  这样一来，从系统创建进程（LJUPAppStateProc）→执行到 main（LJUPAppStatePreMain）→willFinish/didFinish，整个启动流程都

  能打点覆盖，才能统计出完整的 Pre‑main 阶段耗时。
```C++
代码实现细节

  // Pods/ljtools/ljtools/Classes/inlines/ljtol_timestamp.h:41-58

  LJTOL_STATIC_INLINE

  ljtol_time_msec ljtol_current_task_create_timestamp(void) {

      int mib[4] = { CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid() };

      struct kinfo_proc *info = (struct kinfo_proc *)ljtol_system_control(mib, 4, NULL);

      struct timeval tv = info->kp_proc.p_starttime;

      ljtol_time_msec timestamp = tv.tv_sec * 1000 + tv.tv_usec / 1000.;

      free(info);

      return timestamp;

  }

```


  “这段逻辑用 sysctl 向内核请求当前进程信息（CTL_KERN/KERN_PROC/KERN_PROC_PID/getpid()），拿到 struct kinfo_proc 后直接读取其中的 p_starttime 字段，转换为毫秒级时间戳返回。这样就能精确获得系统层面‘进程创建’时刻，补足 main 之前的启动成本统计。