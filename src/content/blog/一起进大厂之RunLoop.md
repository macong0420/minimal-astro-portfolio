---
title: "一起进大厂之RunLoop"
description: " Runloop是通过内部维护一个事件循环来对事件、消息进行管理的一个对象。是的，它是一个对象。 大家用C语言过main函数的都知道，main函数运行完成后程序就结束退出了。但是为什么iOS的App的main函数运行完之后APP还能一直运行呢？这就是Runloop的功劳。 这也是Runloop最基本的应用。"
publishedAt: 2025-12-16
tags:
  - "ios"
  - "RunLoop"
---
## 先说说RunLoop 是什么？

 Runloop是通过内部维护一个事件循环来对事件、消息进行管理的一个对象。是的，它是一个对象。 大家用C语言过main函数的都知道，main函数运行完成后程序就结束退出了。但是为什么iOS的App的main函数运行完之后APP还能一直运行呢？这就是Runloop的功劳。 这也是Runloop最基本的应用。 参考下面iOS的main函数：

```objc
int main(int argc, char * argv[]) { 
	@autoreleasepool { 
		return UIApplicationMain(argc, argv, nil, NSStringFromClass([AppDelegate class])); 
		}
} 
```

**Runloop是个对象，怎么获取呢?**

- Foundation
[NSRunloop currentRunLoop];获得当前线程的RunLoop对象 
[NSRunLoop mainRunLoop];获得主线程的Runloop对象
    
- Core Foundation 
CFRunLoopGetCurrent();获得当前线程的RunLoop对象 
CFRunLoopGetMain();获得主线程的Runloop对象
    

## 再说说RunLoop的实现机制是什么？
![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251216162715478.png)


为了方便Runloop机制的理解，下面写一段伪代码来表示一下RunLoop循环。
```objc
function runloop() { 
initialize(); 
	do { 
		var message = get_next_message();//从队列获取消息 
			process_message(message);//处理消息 
		} while (message != quit);//当触发quit条件时，Runloop退出 
	} 
```


从代码代码可以看出，Runloop的处理机制是 “接受消息->等待->处理” 的循环中，直到这个循环结束（比如传入 quit 的消息）。 RunLoop的核心是什么？ **就是它如何在没有消息处理时休眠，在有消息时又能唤醒。这样可以提高CPU资源使用效率** 当然RunLoop它不是简单的while循环，不是用sleep来休眠，毕竟sleep这方法也是会占用cpu资源的。那它是如何实现真正的休眠的呢？那就是：没有消息需要处理时，就会从用户态切换到内核态，用户态进入内核态后，把当前线程控制器交给内核态，这样的休眠线程是被挂起的，不会再占用cpu资源。

![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251216121217441.png)


这里要注意**用户态和内核态** 这两个概念，还有mach_msg()方法。 内核态 这个机制是依靠系统内核来完成的(苹果操作系统核心组件 Darwin 中的 Mach )。

下面是RunLoop实现的流程源码：

```objc
/// RunLoop的实现 
int CFRunLoopRunSpecific(runloop, modeName, seconds, stopAfterHandle) { 
/// 首先根据modeName找到对应mode 
CFRunLoopModeRef currentMode = __CFRunLoopFindMode(runloop, modeName, false); 
/// 如果mode里没有source/timer/observer, 直接返回。 
if (__CFRunLoopModeIsEmpty(currentMode)) return; 
/// 1\. 通知 Observers: RunLoop 即将进入 loop。 
__CFRunLoopDoObservers(runloop, currentMode, kCFRunLoopEntry); 
/// 内部函数，进入loop 
__CFRunLoopRun(runloop, currentMode, seconds, returnAfterSourceHandled) { 
	Boolean sourceHandledThisLoop = NO; 
	int retVal = 0; do { 
		/// 2\. 通知 Observers: RunLoop 即将触发 Timer 回调。 
		__CFRunLoopDoObservers(runloop, currentMode, kCFRunLoopBeforeTimers); 
		/// 3\. 通知 Observers: RunLoop 即将触发 Source0 (非port) 回调。 
		__CFRunLoopDoObservers(runloop, currentMode, kCFRunLoopBeforeSources); 
		/// 执行被加入的block 
		__CFRunLoopDoBlocks(runloop, currentMode); 
		/// 4\. RunLoop 触发 Source0 (非port) 回调。 
		sourceHandledThisLoop = __CFRunLoopDoSources0(runloop, currentMode, stopAfterHandle); 
		/// 执行被加入的block 
		__CFRunLoopDoBlocks(runloop, currentMode); 
		/// 5\. 如果有 Source1 (基于port) 处于 ready 状态，直接处理这个 Source1 然后跳转去处理消息。 
		if (__Source0DidDispatchPortLastTime) { 
			Boolean hasMsg = __CFRunLoopServiceMachPort(dispatchPort, &msg) 
			if (hasMsg) goto handle_msg; 
		} 
		///6\. 通知 Observers: RunLoop 的线程即将进入休眠(sleep)。 
		if (!sourceHandledThisLoop) { 
			__CFRunLoopDoObservers(runloop, currentMode, kCFRunLoopBeforeWaiting); 
		} 
		/// 7\. 调用 mach_msg 等待接受 mach_port 的消息。线程将进入休眠, 直到被下面某一个事件唤醒。 
		/// • 一个基于 port 的Source 的事件。 
		/// • 一个 Timer 到时间了 
		/// • RunLoop 自身的超时时间到了 
		/// • 被其他什么调用者手动唤醒 
		__CFRunLoopServiceMachPort(waitSet, &msg, sizeof(msg_buffer), &livePort) {
			 mach_msg(msg, MACH_RCV_MSG, port); 
			 // thread wait for receive msg 
			} 
			/// 8\. 通知 Observers: RunLoop 的线程刚刚被唤醒了。
			 __CFRunLoopDoObservers(runloop, currentMode, kCFRunLoopAfterWaiting);
			  /// 收到消息，处理消息。 handle_msg: 
			  /// 9.1 如果一个 Timer 到时间了，触发这个Timer的回调。 
			  if (msg_is_timer) { 
				  __CFRunLoopDoTimers(runloop, currentMode, mach_absolute_time()) 
			 } 
			 /// 9.2 如果有dispatch到main_queue的block，执行block。 
			 else if (msg_is_dispatch) { 
				 __CFRUNLOOP_IS_SERVICING_THE_MAIN_DISPATCH_QUEUE__(msg); 
			} 
			/// 如果没超时，mode里没空，loop也没被停止，那继续loop。 
			} while (retVal == 0); 
		} 
		/// 10\. 通知 Observers: RunLoop 即将退出。 
		__CFRunLoopDoObservers(rl, currentMode, kCFRunLoopExit); 
	} 
```

源码我删减了很多，看源码里的注释，可以了解个Runloop运行的流程。 咱们还是围绕RunLoop的核心来理解， 既然上面提到休眠是通过内核来完成的，那唤醒条件呢？ 下面几个就是主要的唤醒Runloop的事件：

- 收到基于 port 的 Source1 的事件
- Timer到时间执行
- RunLoop自身的超时时间到了
- 被其他调用者手动唤醒

**关于RunLoop的source1和source0**

> 上面介绍了source1包括系统事件捕捉和基于port的线程间通信。什么是系统事件捕捉？又如何理解基于port的线程间通信？其实，我们手指点击屏幕，首先产生的是一个系统事件，通过source1来接受捕捉，然后由Springboard程序包装成source0分发给应用去处理，因此我们在App内部接受到触摸事件，就是source0，这一前一后的关系。**source1 通过程序包装是会变成 source0的**
> 
> ![image.png](https://raw.githubusercontent.com/macong0420/Image/main/20251216121836415.png)


## RunLoop的有几种Mode, RunLoop设置Mode作用是什么？

RunLoop的运行模式共有5种，RunLoop只会运行在一个模式下，要切换模式，就要暂停当前模式，重写启动一个运行模式

- kCFRunLoopDefaultMode, App的默认运行模式，通常主线程是在这个运行模式下运行
- UITrackingRunLoopMode, 跟踪用户交互事件（用于 ScrollView 追踪触摸滑动，保证界面滑动时不受其他Mode影响）
- kCFRunLoopCommonModes, 伪模式，不是一种真正的运行模式
- UIInitializationRunLoopMode：在刚启动App时第进入的第一个Mode，启动完成后就不再使用
- GSEventReceiveRunLoopMode：接受系统内部事件，通常用不到

**RunLoop设置Mode作用** 设置Mode作用是指定事件在运行循环（Loop）中的优先级。 线程的运行需要不同的模式，去响应各种不同的事件，去处理不同情境模式。(比如可以优化tableview的时候可以设置UITrackingRunLoopMode下不进行一些操作)

## 为什么只有主线程的Runloop是自动开启的？

看iOS的main函数代码， 代码自动生成了autoreleasepool，这里就是调用了runloop。app启动时main函数就自动开启了主线程的runloop。
```objc
int main(int argc, char * argv[]) { 
	@autoreleasepool { 
		return UIApplicationMain(argc, argv, nil, NSStringFromClass([AppDelegate class])); 
		} 
	} 
```


## PerformSelector:afterDelay:这个方法在子线程中是否起作用?为什么?怎么解决?

当调用 NSObject 的 performSelecter:afterDelay: 后，实际上其内部会创建一个 Timer 并添加到当前线程的 RunLoop 中。所以如果当前线程没有 RunLoop，则这个方***失效。

当调用 performSelector:onThread: 时，实际上其会创建一个 Timer 加到对应的线程去，同样的，如果对应线程没有 RunLoop 该方法也会失效。

## UITableViewCell上有个UILabel，显示NSTimer实现的秒表时间，手指滚动TableView的Cell时，label是否刷新？为什么？

不刷新了。 因为NSTimer对象是以NSDefaultRunLoopMode添加到主运行循环中的时候, TableView（ScrollView）滚动过程中会因为mode的切换，而导致NSTimer将不再被调度。当我们滚动的时候，也希望不调度，那就应该使用默认模式。如果希望在滚动时，定时器也能运行，那就应该使用common mode。 通过 CFRunloopAddTimer(runloop,timer ,commonMode) 实现。就是同步把事件源timer用同一个mode.

## AFNetworking 中如何运用 Runloop?

AFURLConnectionOperation 这个类是基于 NSURLConnection 构建的，其希望能在后台线程接收 Delegate 回调。为此 AFNetworking 单独创建了一个线程，并在这个线程中启动了一个 RunLoop：
```objc
+ (void)networkRequestThreadEntryPoint:(id)__unused object {
	   @autoreleasepool {
	    [[NSThread currentThread] setName:@"AFNetworking"]; 
	    NSRunLoop *runLoop = [NSRunLoop currentRunLoop]; 
	    [runLoop addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode]; 
	    [runLoop run]; 
	    } 
} 
+ (NSThread *)networkRequestThread { 
  static NSThread *_networkRequestThread = nil; 
  static dispatch_once_t oncePredicate; 
  dispatch_once(&oncePredicate, ^{ 
		_networkRequestThread = [[NSThread alloc] initWithTarget:self 
             selector:@selector(networkRequestThreadEntryPoint:) object:nil]; 
	    [_networkRequestThread start]; 
  }); 
  return _networkRequestThread; 
} 
```


RunLoop 启动前内部必须要有至少一个 Timer/Observer/Source，所以 AFNetworking 在 [runLoop run] 之前先创建了一个新的 NSMachPort 添加进去了。通常情况下，调用者需要持有这个 NSMachPort (mach_port) 并在外部线程通过这个 port 发送消息到 loop 内；但此处添加 port 只是为了让 RunLoop 不至于退出，并没有用于实际的发送消息。
```objc
- (void)start { 
  [self.lock lock]; 
  if ([self isCancelled]) { 
	  [self performSelector:@selector(cancelConnection) onThread:[[self class] networkRequestThread] withObject:nil waitUntilDone:NO modes:[self.runLoopModes allObjects]]; 
	} else if ([self isReady]) { 
		self.state = AFOperationExecutingState; 
		[self performSelector:@selector(operationDidStart) onThread:[[self class] networkRequestThread] withObject:nil waitUntilDone:NO modes:[self.runLoopModes allObjects]]; 
	} [self.lock unlock]; 
} 
```


当需要这个后台线程执行任务时，AFNetworking 通过调用 [NSObject performSelector:onThread:..] 将这个任务扔到了后台线程的 RunLoop 中。

## 解释一下Runloop在 NSTimer中的的作用

NSTimer 其实就是 CFRunLoopTimerRef，这两个类之间，是可以交换使用的。一个 NSTimer 注册到 RunLoop 后，RunLoop 会为其重复的时间点注册事件。例如 10:00, 10:10, 10:20 这几个时间点。RunLoop 为了节省资源，在发生阻塞状态并不会准时回调给Timer。某个时间点被错过了，不会在延期时间后给你执行。比如等公交，如果10:10 有一趟公交，我没赶上，那我只能等 10:20 这一趟。10:10分那趟不会再回来的。

## Runloop 和线程的关系？

Runloop 和是一对一的关系，一个线程对应一个 Runloop。主线程的默认就有了 Runloop。 可以通过数据结构看出来，创建线程时，线程默认是没有runloop的，需要手工创建线程的runloop。

## 有了线程，你觉得为什么还要有runloop？

Runloop最主要的作用 就是它如何在没有消息处理时休眠，在有消息时又能唤醒。这样可以提高CPU资源使用效率 。runloop 另外一个作用是消息处理。只有线程，是做不到这点的。

## GCD 在Runloop中的使用？

**GCD由子线程返回到主线程,只有在这种情况下才会触发 RunLoop。会触发 RunLoop 的 Source 1 事件。**

## AFNetworking 中如何运用 Runloop?

AFURLConnectionOperation 这个类是基于 NSURLConnection 构建的，其希望能在后台线程接收 Delegate 回调。为此 AFNetworking 单独创建了一个线程，并在这个线程中启动了一个 RunLoop：
```objc
+ (void)networkRequestThreadEntryPoint:(id)__unused object { 
	  @autoreleasepool { 
	  [[NSThread currentThread] setName:@"AFNetworking"];
	  NSRunLoop *runLoop = [NSRunLoop currentRunLoop]; 
	  [runLoop addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode]; 
	  [runLoop run]; 
	}
 } 
 + (NSThread *)networkRequestThread { 
   static NSThread *_networkRequestThread = nil; 
   static dispatch_once_t oncePredicate; 
   dispatch_once(&oncePredicate, ^{ 
	   _networkRequestThread = [[NSThread alloc] initWithTarget:self selector:@selector(networkRequestThreadEntryPoint:) object:nil]; 
	   [_networkRequestThread start]; }); return _networkRequestThread; 
} 

```


RunLoop 启动前内部必须要有至少一个 Timer/Observer/Source，所以 AFNetworking 在 [runLoop run] 之前先创建了一个新的 NSMachPort 添加进去了。通常情况下，调用者需要持有这个 NSMachPort (mach_port) 并在外部线程通过这个 port 发送消息到 loop 内；但此处添加 port 只是为了让 RunLoop 不至于退出，并没有用于实际的发送消息。
```objc
- (void)start { 
  [self.lock lock]; 
  if ([self isCancelled]) { 
	  [self performSelector:@selector(cancelConnection) onThread:[[self class] networkRequestThread] withObject:nil waitUntilDone:NO modes:[self.runLoopModes allObjects]]; 
  } else if ([self isReady]) { 
	  self.state = AFOperationExecutingState; [
	  self performSelector:@selector(operationDidStart) onThread:[[self class] networkRequestThread] withObject:nil waitUntilDone:NO modes:[self.runLoopModes allObjects]]; 
  } [self.lock unlock]; 
} 
```


当需要这个后台线程执行任务时，AFNetworking 通过调用 [NSObject performSelector:onThread:..] 将这个任务扔到了后台线程的 RunLoop 中。

## PerformSelector:afterDelay:这个方法在子线程中是否起作用？

不起作用，子线程默认没有 Runloop。 当调用 NSObject 的 performSelecter:afterDelay: 后，实际上其内部会创建一个 Timer 并添加到当前线程的 RunLoop 中。所以如果当前线程没有 RunLoop，则这个方***失效。可以使用 GCD的dispatch_after来实现afterDelay这样的需求。

当调用 performSelector:onThread: 时，实际上其会创建一个 Timer 加到对应的线程去，同样的，如果对应线程没有 RunLoop 该方法也会失效，

## CADispalyTimer和Timer哪个更精确

当然是CADisplayLink 更精确。

iOS设备的屏幕刷新频率是固定的，CADisplayLink在正常情况下会在每次刷新结束都被调用，精确度相当高。

看上面**Runloop在 NSTimer中的使用**的问题，就知道NSTimer的触发时间到的时候，runloop如果在阻塞状态，触发时间就会推迟到下一个runloop周期。可见 NSTimer的定时是很不靠谱的。

CADisplayLink使用场合相对专一，适合做UI的不停重绘，比如自定义动画引擎或者视频播放的渲染。NSTimer的使用范围要广泛的多，各种需要单次或者循环定时处理的任务都可以使用。在UI相关的动画或者显示内容使用 CADisplayLink比起用NSTimer的好处就是我们不需要在格外关心屏幕的刷新频率了，因为它本身就是跟屏幕刷新同步的。

