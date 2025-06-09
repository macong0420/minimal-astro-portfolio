---
title: Augment VIP
description: 为 Augment VIP 用户准备的实用工具包，提供管理并清理 VS Code 数据库的工具。
publishedAt: 2025-06-04
tags:
  - AI
  - Augment
  - 开发
---


### 说明

- **Database Cleaning**: Remove Augment-related entries from VS Code databases  
    数据库清理：把 VS Code 数据库里所有 Augment 相关的条目都删掉
- **Telemetry ID Modification**: Generate random telemetry IDs for VS Code to enhance privacy  
    遥测 ID 修改：给 VS Code 生成随机遥测 ID，加强隐私保护
- **Cross-Platform Support**: Works on macOS, Linux, and Windows  
    跨平台支持：macOS、Linux、Windows 都能用
- **Safe Operations**: Creates backups before making any changes  
    安全操作：改任何东西前都会先备份
- **User-Friendly**: Clear, color-coded output and detailed status messages  
    易用性：输出清晰，带颜色标记，状态信息详细

### One-Line Install  一行代码搞定
```
curl -fsSL https://raw.githubusercontent.com/azrilaiman2003/augment-vip/python/install.sh -o install.sh && chmod +x install.sh && ./install.sh
```

This will:  这样就：

1. Download the installation script  
    下载安装脚本
2. Make it executable  把它设成可执行的
3. Create a new `augment-vip` directory in your current location  
    在你当前位置新建一个 **augment-vip** 目录
4. Run the installation, which will download additional required scripts  
    运行安装，它会帮你下载其他需要的脚本
5. Prompt you if you want to run the database cleaning and telemetry ID modification scripts  
    要是你想运行数据库清理和遥测 ID 修改脚本的话，就提示你一下

GitHub 地址:https://github.com/azrilaiman2003/augment-vip