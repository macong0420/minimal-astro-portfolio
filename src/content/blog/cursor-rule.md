---
title: "架构修复 TodoList 文档规范"
description: "使用此 rule 制作实施方案.然后你可以追加 workflow rule. 每次完成让他交接上下文。即可一个文档完成全部交接。再也不需要拉动很多文档啦～～～～～～～解放"
publishedAt: "2025-05-27"
tags: ["cursor", "ai", "rule"]
---


## 📋 架构修复 TodoList 文档规范

架构修复 TodoList 文档规范
:clipboard: 文档结构模板
1. 顶部紧急概览 (必需)



> **🚨 [模块名称]架构问题 - 紧急修复方案 🚨**

>

> **危机等级**: 🔴/🟠/🟡 [RED/ORANGE/YELLOW] - [问题描述]

> **修复紧迫性**: [时间要求] - [后果说明]

> **技术债务**: [X]个高优先级修复任务，涉及[核心模块]

2. 核心问题概览 (3 分钟快速了解)
:collision: 灾难性问题发现: 用数字列表，每项说明具体问题和影响

:bullseye: 修复策略: 使用 Mermaid 流程图展示修复路径

:hammer_and_wrench: 实施路径: 表格形式，包含阶段 / 优先级 / 任务数 / 关键成果 / 风险评估

:wrapped_gift: 预期成果: :white_check_mark: 格式的成果列表，量化收益

3. 上下文交接蓝图预留空间 (必需)

## 📋 **上下文交接蓝图预留空间**

### 当前架构状态图

[预留空间 - 架构现状图]

待填充：当前重复实现关系图


### 目标架构蓝图

[预留空间 - 目标架构图]

待填充：修复后清洁架构图


4. 问题详细分析
使用 :police_car_light: 标记最高优先级问题

用 :white_check_mark:保留 /:cross_mark:删除 标记明确决策

按技术层级组织 (Data 层 / Domain 层 / Presentation 层)

5. 阶段性任务清单
使用 checkbox 格式: - [ ] **任务名称**

每个任务包含：文件路径、原因说明、验证标准

按执行顺序编号阶段

:artist_palette: 格式规范
Emoji 使用标准
| 用途 | Emoji | 含义 |

|------|-------|------|

| 紧急警告 | :police_car_light: | 最高优先级问题 |

| 问题发现 | :collision: | 严重架构问题 |

| 修复策略 | :bullseye: | 解决方案 |

| 实施路径 | :hammer_and_wrench: | 执行计划 |

| 预期成果 | :wrapped_gift: | 修复收益 |

| 数据层 | :bar_chart: | Data 层相关 |

| 领域层 | :wrench: | Domain 层相关 |

| 展示层 | :artist_palette: | Presentation 层相关 |

| 架构冲突 | :balance_scale: | Clean Architecture 违反 |

| 清理任务 | :broom: | 代码清理 |

| 依赖注入 | :electric_plug: | DI 配置 |

| 目录重组 | :file_folder: | 文件结构 |

优先级标识
:red_circle: P0: 极高优先级 (阻塞性问题)

:orange_circle: P1: 高优先级 (影响开发效率)

:yellow_circle: P2: 中优先级 (改善代码质量)

:green_circle: P3: 低优先级 (优化和清理)

风险评估标准
极高:high_voltage:: 可能导致系统崩溃或无法编译

高:fire:: 影响核心功能，需要大量重构

中:yellow_square:: 影响代码质量，需要仔细处理

低:green_heart:: 优化改进，风险可控

表格格式要求

| 阶段 | 优先级 | 任务数 | 关键成果 | 风险评估 |

| --------------- | ------ | ------ | ---------------------- | -------- |

| **[阶段名称]** | [优先级] | [X]个 | [具体成果描述] | [风险级别] |

:memo: 内容要求
问题描述原则
量化影响: 使用具体数字 (13 + 重复 UseCase，5 个重复模型)

明确后果: 说明不修复的风险

技术精确: 使用准确的技术术语

决策明确: 每个问题都有明确的保留 / 删除决策

任务描述原则
可执行性: 每个任务都可以立即执行

可验证性: 包含明确的完成标准

原因说明: 解释为什么要这样做

影响评估: 说明对其他模块的影响

追踪要求

### 进度统计

- **总任务数**: [X]个任务 (+[Y]个新增任务)

- **已完成**: [完成数]/[总数]

- **进行中**: [进行数]/[总数]

- **待开始**: [待开始数]/[总数]

### 阶段完成状态

- [ ] 阶段一：[名称] ([完成数]/[总数])

- [ ] 阶段二：[名称] ([完成数]/[总数])

:bullseye: 成功标准
文档质量检查
 新窗口 3 分钟内能理解问题和解决方案

 所有任务都可以立即执行

 风险评估覆盖所有高危操作

 预留空间为后续协作留足余地

 完成标准明确且可验证

技术标准检查
 严格遵循 Clean Architecture 原则

 每个功能只有唯一实现

 命名规范一致性

 错误处理标准化

 测试覆盖率要求明确

:counterclockwise_arrows_button: 文档维护
更新原则
版本标识: 每次重大更新增加版本号

变更记录: 在文档底部记录重要变更

状态同步: 实时更新进度和发现的新问题

影响评估: 记录修复对其他模块的影响

交接要求
完整性: 包含所有必要的上下文信息

可读性: 新团队成员能快速上手

可追溯性: 决策过程和原因清晰记录

可扩展性: 为未来发现的问题预留空间