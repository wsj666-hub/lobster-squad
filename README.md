# 🦞 龙虾协作小队 (Lobster Squad)

> 用户提需求 → 睡醒拿结果
> 
> 7×24 小时自动分工协作，无需反复干预

---

## 🏗️ 架构设计

```
用户 → 主控 (奥利) → 任务派发 → 小弟们 (容器) → 部署专员 → 交付结果
```

### 角色分工

| 角色 | 代号 | 职责 | 容器 |
|------|------|------|------|
| **主控工头** | 奥利 | 对接用户、拆分需求、派发任务、审核 PR | 宿主机 |
| **执行小弟#1** | 汤圆 | 全栈开发（前端/后端/数据库） | Docker |
| **执行小弟#2** | 丸子 | 前端/UI开发（界面/样式/交互） | Docker |
| **执行小弟#3** | 虾球 | 测试/DevOps（测试/CI/CD/部署） | Docker |
| **部署专员** | 狗子 | 打包、测试、部署上线 | 宿主机（待定） |

---

## 📁 目录结构

```
lobster-squad/
├── docker-compose.yml        # Docker 配置
├── shared/                   # 共享目录（主控和小弟通信）
│   ├── task-worker-1.md      # 汤圆的任务清单
│   ├── task-worker-2.md      # 丸子的任务清单
│   └── task-worker-3.md      # 虾球的任务清单
├── configs/                  # 小弟配置文件
│   ├── worker-1/             # 汤圆配置
│   │   ├── IDENTITY.md
│   │   ├── SOUL.md
│   │   ├── USER.md
│   │   └── TOOLS.md
│   ├── worker-2/             # 丸子配置
│   └── worker-3/             # 虾球配置
├── scripts/                  # 脚本工具
│   ├── wake-workers.sh       # 唤醒小弟脚本
│   └── dispatch-task.sh      # 派发任务脚本
└── workers/                  # 小弟工作目录（容器内挂载）
    ├── worker-1/
    ├── worker-2/
    └── worker-3/
```

---

## 🚀 快速开始

### 1. 启动小弟容器

```bash
cd /Users/wsj/clawd/lobster-squad
docker compose up -d
```

### 2. 查看小弟状态

```bash
docker compose ps
docker compose logs
```

### 3. 派发任务

```bash
# 用法：./scripts/dispatch-task.sh <worker-id> <issue-url> <task-description>

./scripts/dispatch-task.sh worker-1 \
  "https://github.com/your-repo/your-project/issues/1" \
  "实现用户登录功能"
```

### 4. 查看任务状态

```bash
cat shared/task-worker-1.md
```

### 5. 停止小弟

```bash
docker compose down
```

---

## 🔄 工作流程

### 主控（奥利）工作流

1. 接收用户需求（一句话 + 截图）
2. 拆分成独立 Issue
3. 调用 `dispatch-task.sh` 派发任务
4. 等待小弟提交 PR
5. 审核 PR → 通过则合并，有问题则退回
6. 所有任务完成后，通知部署专员

### 小弟工作流（Ralph Loop）

```
每 5 分钟唤醒 → 读取 task.md → 发现 [ ] 任务 → 
读取 Issue → 创建分支 → 写代码 → 测试 → 
提交 PR → 更新 task.md 为 [x] → 提交报告 → 
上下文清空 → 等待下次唤醒
```

---

## 📋 task.md 格式

```markdown
# 📋 Worker-X (代号) 任务清单

**最后更新:** 2026-03-04 13:50
**状态:** 等待任务派发

---

## TODO 清单

> 格式说明：
> - `[ ]` = 待完成
> - `[~]` = 进行中
> - `[x]` = 已完成
> - `[!]` = 有问题/需退回

```
[ ] 实现用户登录功能 (https://github.com/xxx/issues/1)
[ ] 设计首页 UI (https://github.com/xxx/issues/2)
```

---

## 历史完成

- [x] 项目初始化 (2026-03-04)
```
```

---

## 🎯 积分系统

小弟通过完成任务获得积分，积分是他们的"喵生目标"：

| 行为 | 积分 |
|------|------|
| 完成小任务 | +10 |
| 完成中等任务 | +25 |
| 完成复杂任务 | +50 |
| 代码一次通过审核 | +20 bonus |
| 主动发现并修复 bug | +15 bonus |

---

## ⚠️ 红线原则

### 小弟禁止事项

1. **不依赖跨任务记忆** - 每次唤醒都是全新的，不看 memory.md
2. **不越权干活** - 只做 task.md 里明确派发的任务
3. **不频繁询问用户** - 遇到问题在 PR 里标注，不问"可以开始吗"
4. **不污染共享环境** - 只在自己的工作目录干活

### 环境隔离

- 每个小弟独立 Docker 容器
- 独立端口范围（worker-1: 3001-3099, worker-2: 3101-3199, worker-3: 3201-3299）
- 环境出错直接删除重建容器

---

## 🛠️ 维护命令

```bash
# 重启某个小弟
docker compose restart worker-1

# 查看某个小弟日志
docker compose logs -f worker-1

# 进入某个小弟容器
docker compose exec worker-1 sh

# 清理并重建所有小弟
docker compose down && docker compose up -d --build

# 查看共享目录
ls -la shared/
```

---

## 📝 待办事项

- [ ] 配置 OpenClaw cron 定时任务（每 5 分钟唤醒）
- [ ] 实现主控（奥利）的 Issue 拆分逻辑
- [ ] 实现部署专员（狗子）的 CI/CD 流程
- [ ] 添加积分追踪和排行榜
- [ ] 添加监控面板

---

*🦞 龙虾小队，使命必达！*
