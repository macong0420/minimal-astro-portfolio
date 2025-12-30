---
title: "iOS 项目优化"
description: "本文主要从以下七个方向来探讨IOS的项目优化"
publishedAt: "2025-12-29"
tags:
  - "iOS"
  - "项目优化"
---

![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251229124958822.png)

### **1.CPU性能优化**

> **CUP主要负责对象的创建销毁，布局的计算，文本的计算和排版，图片解码，图像绘制等**
> 
> 我们可以对CUP进行如下优化
> 
> 1.1 尽量使用轻量级的对象，比如用不到事件处理的地方，可以考虑使用CALayer代替UIView
> 
> 1.2 不要频繁的调用UIView的相关属性，尽量减少不必要的修改
> 
> 1.3 尽量提前计算好布局，并且存在内存中，避免重复计算
> 
> 1.4 自己手动设置frame比Autolayout消耗资源更少
> 
> 1.5 图片的size最好刚好和UIImageView的size保持一致，避免缩放算法
> 
> 1.6 尽量把耗时的操作放到子线程（比如文本的尺寸计算，绘制，图片的解码绘制等）
> 
> 参考YYKitDemo里的WBStatusTimelineViewController

### **2.GPU性能优化**

> GPU主要负责纹理的渲染，针对GPU，我们可以做以下优化：
> 
> 2.1 尽可能将多张图片合成一张进行显示
> 
> 2.2 尽量减少视图的数量和层次，视图的数量和层次越多，需要渲染的图层就越多
> 
> 2.3 减少透明的视图，特别是上层视图透明，这样会导致像素的混合计算
> 
> 2.4 尽量避免出现离屏渲染，想了解离屏渲染，可以移步我另一篇文章[juejin.cn/post/700586…](https://juejin.cn/post/7005863194098925604 "https://juejin.cn/post/7005863194098925604")

### **3.内存优化**

> 3.1 我们可以通过Xcode的Analyze静态分析我们的代码，检测没用到的变量及一些语法错误等
> 
> 3.2 我们可以通过Xcode-Open Developer Tool-Instruments-Leaks来动态检测内存泄漏

### **4.卡顿优化**

> 4.1 我们可以通过runloop来检测项目的卡顿情况,还有别的方法欢迎补充，使用runloop检测卡顿可以参考：[github.com/search?q=LX…](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Fsearch%3Fq%3DLXDAppFluecyMonitor "https://github.com/search?q=LXDAppFluecyMonitor")

### **5.耗电优化**

> 5.1 少用定时器
> 
> 5.2 数据量大的尽量使用数据库
> 
> 5.3 减少压缩网络数据
> 
> 5.4 用适当的缓存代替频繁的网络请求
> 
> 5.5 定位如果不要求实时性，则定位完毕及时关掉
> 
> 5.6 断点续传

### **6.APP启动优化，主要针对冷启动优化**

> 6.1 可以通过添加环境变量可以打印出APP的启动时间分析（Edit scheme -> Run -> Arguments） 冷启动的三大阶段：1.dyld 2.runtime 3.main
> 
> 6.1.1 dyld:Apple的动态连接器，可以用来装在Mach-0文件
> 
> 优化：
> 
> 减少动态库，合并一些动态库
> 
> 减少Objc类，分类的数量，减少Selector数量，定期清理没有使用的类，分类
> 
> 减少C++虚函数数量
> 
> swift尽量使用struct代替类
> 
> 6.1.2 runtime:
> 
> 调用map_images进行可执行文件内容的解析和处理
> 
> 在load_images中调用call_load_methods,调用所有Class和Category的+load方法
> 
> 进行各种objc结构的初始化（注册Objc类，初始化类对象等）
> 
> 通过C++静态初始化器和_attribute_((constructor))修饰的函数
> 
> 到此为止，可执行文件和动态库中的所有符号（Class,Protocol,Selector,IMP...）都已经按格式成功加载到内存中，被runtime所管理
> 
> 优化：用+initialize+单例代替+load
> 
> 6.1.3 调用main函数
> 
> 优化：在不影响用户体验的前提下，尽可能将一些操作延迟，不要全部放在finishLaunching中
> 
> 6.1.4 二进制重排推荐文章：[juejin.cn/post/684490…](https://juejin.cn/post/6844904174287585287 "https://juejin.cn/post/6844904174287585287")

### **7.APP瘦身**

> 7.1 图片资源进行无损压缩
> 
> 7.2 去除没用到的资源：[github.com/tinymind/LS…](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Ftinymind%2FLSUnusedResources "https://github.com/tinymind/LSUnusedResources") [github.com/netyouli/WH…](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Fnetyouli%2FWHC_ScanUnreferenceImageTool "https://github.com/netyouli/WHC_ScanUnreferenceImageTool")
> 
> 7.3 检测未使用的代码：[github.com/netyouli/WH…](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Fnetyouli%2FWHC_Scan "https://github.com/netyouli/WHC_Scan")
