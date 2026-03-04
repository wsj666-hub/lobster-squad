# 🦞 龙虾小队监控面板

> 实时监控龙虾小队成员状态、任务进度、执行日志和异常告警
> 
> 访问地址：http://localhost:3456

---

## 📋 功能特性

- **成员状态看板** - 实时显示所有龙虾成员的状态、积分和在线情况
- **GitHub 任务看板** - 展示当前 Issue 和 Pull Request 状态
- **执行日志** - 查看历史 Session 记录和执行情况
- **异常告警** - 实时监控系统健康状态，发现异常及时告警
- **自动刷新** - 前端每 5 秒自动刷新数据，后端智能缓存

---

## 🚀 快速开始

### 方式 A：直接运行（推荐开发环境）

```bash
# 1. 进入目录
cd /Users/wsj/clawd/lobster-squad/dashboard

# 2. 安装依赖（如有 package.json）
npm install

# 3. 启动服务
node server.js

# 4. 访问面板
# 浏览器打开：http://localhost:3456
```

### 方式 B：Docker 部署

```bash
# 1. 进入龙虾小队根目录
cd /Users/wsj/clawd/lobster-squad

# 2. 启动所有服务（包含监控面板）
docker compose up -d

# 3. 查看服务状态
docker compose ps

# 4. 查看日志
docker compose logs -f dashboard
```

> 💡 **提示**：当前 docker-compose.yml 主要配置 worker 容器，监控面板建议直接在宿主机运行。

---

## 📡 API 文档

所有 API 端点均返回 JSON 格式数据，支持 CORS 跨域访问。

### GET /api/status

获取所有龙虾成员的实时状态。

**请求示例：**
```bash
curl http://localhost:3456/api/status
```

**响应示例：**
```json
{
  "success": true,
  "lobsters": [
    {
      "name": "汤圆",
      "status": "online",
      "score": 150,
      "currentTask": "实现用户登录功能"
    }
  ],
  "lastUpdate": "2026-03-04T16:00:00Z"
}
```

---

### GET /api/files/:lobster/:filename

查看指定龙虾的文件内容（安全限制：仅允许查看特定文件）。

**请求示例：**
```bash
curl http://localhost:3456/api/files/worker-1/IDENTITY.md
```

**允许查看的文件：**
- `IDENTITY.md` - 身份配置
- `SOUL.md` - 核心指令
- `TOOLS.md` - 工具配置
- `task.md` - 任务清单

**响应示例：**
```json
{
  "success": true,
  "content": "# 我是汤圆\n...",
  "filename": "IDENTITY.md",
  "lobster": "worker-1"
}
```

---

### GET /api/github/issues

获取 GitHub 仓库的 Issue 列表（60 秒缓存）。

**请求示例：**
```bash
curl http://localhost:3456/api/github/issues
```

**响应示例：**
```json
{
  "success": true,
  "issues": [
    {
      "number": 1,
      "title": "设计龙虾小队 Logo",
      "state": "closed",
      "author": "奥利",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ],
  "cacheTime": "2026-03-04T16:00:00Z"
}
```

---

### GET /api/github/prs

获取 GitHub 仓库的 Pull Request 列表（60 秒缓存）。

**请求示例：**
```bash
curl http://localhost:3456/api/github/prs
```

**响应示例：**
```json
{
  "success": true,
  "prs": [
    {
      "number": 3,
      "title": "feat: 任务看板 UI 实现",
      "state": "open",
      "author": "丸子",
      "created_at": "2026-03-04T14:00:00Z"
    }
  ],
  "cacheTime": "2026-03-04T16:00:00Z"
}
```

---

### GET /api/logs

获取执行日志（Session 历史记录，5 秒缓存）。

**请求示例：**
```bash
curl http://localhost:3456/api/logs
```

**响应示例：**
```json
{
  "success": true,
  "logs": [
    {
      "filename": "2026-03-04-session-001.jsonl",
      "timestamp": "2026-03-04T15:30:00Z",
      "messageCount": 45,
      "summary": "完成 Issue #003 开发"
    }
  ]
}
```

---

### GET /api/health

获取系统健康状态和异常告警（5 秒缓存）。

**请求示例：**
```bash
curl http://localhost:3456/api/health
```

**响应示例：**
```json
{
  "success": true,
  "status": "healthy",
  "alerts": [],
  "workers": {
    "worker-1": "online",
    "worker-2": "online",
    "worker-3": "offline"
  },
  "lastCheck": "2026-03-04T16:00:00Z"
}
```

---

## ⚙️ 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `3456` |
| `SQUAD_DIR` | 龙虾小队根目录 | `../` |
| `SESSIONS_DIR` | Session 日志目录 | `/Users/wsj/.openclaw/agents/main/sessions/` |

### GitHub Token 配置

监控面板需要 GitHub Token 来访问仓库数据。

**配置位置：** `github-client.js`

```javascript
const GITHUB_CONFIG = {
  token: 'ghp_your_token_here',
  owner: 'your-github-username',
  repo: 'lobster-squad'
};
```

**获取 Token 步骤：**

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token"
3. 选择 scopes：`repo`（完整仓库访问权限）
4. 生成后复制 Token
5. 替换 `github-client.js` 中的 token 值

> ⚠️ **安全提示**：不要将 Token 提交到公共仓库！

---

## 🐛 故障排查

### 常见问题

#### 1. 服务无法启动

**错误信息：** `Error: listen EADDRINUSE :::3456`

**原因：** 端口 3456 已被占用

**解决方案：**
```bash
# 查找占用端口的进程
lsof -i :3456

# 杀死占用进程
kill -9 <PID>

# 或者修改 server.js 中的 PORT 变量
```

---

#### 2. GitHub API 请求失败

**错误信息：** `GitHub API Error: 401 - Bad credentials`

**原因：** GitHub Token 过期或无效

**解决方案：**
1. 检查 `github-client.js` 中的 Token 是否正确
2. 重新生成 GitHub Token（参考配置说明）
3. 确保 Token 有 `repo` 权限

---

#### 3. Session 日志无法读取

**错误信息：** `Error reading session logs: ENOENT`

**原因：** Session 目录不存在或路径错误

**解决方案：**
```bash
# 检查目录是否存在
ls -la /Users/wsj/.openclaw/agents/main/sessions/

# 如果不存在，检查 OpenClaw 配置
# 或者修改 server.js 中的 SESSIONS_DIR 路径
```

---

#### 4. 前端页面空白

**原因：** 静态文件加载失败

**解决方案：**
```bash
# 检查 index.html 是否存在
ls -la /Users/wsj/clawd/lobster-squad/dashboard/index.html

# 检查浏览器控制台错误
# F12 打开开发者工具，查看 Console 和 Network 标签
```

---

#### 5. Docker 容器无法启动

**错误信息：** `Cannot start service dashboard`

**解决方案：**
```bash
# 1. 查看 Docker 日志
docker compose logs dashboard

# 2. 检查 docker-compose.yml 配置
# 3. 确保 Docker 服务正常运行
docker info

# 4. 重建容器
docker compose down
docker compose up -d --build
```

---

### 日志查看

#### 查看服务日志

```bash
# 直接运行模式
node server.js

# Docker 模式
docker compose logs -f dashboard

# 查看最近 100 行
docker compose logs --tail=100 dashboard
```

#### 查看 Session 日志

```bash
# 进入 Session 目录
cd /Users/wsj/.openclaw/agents/main/sessions/

# 查看最新的日志文件
ls -lt | head -5

# 查看日志内容
cat <filename>.jsonl
```

---

## 📊 项目结构

```
dashboard/
├── README.md           # 本文档
├── server.js           # 后端 API 服务（Node.js）
├── github-client.js    # GitHub API 客户端封装
├── index.html          # 前端监控面板（HTML/CSS/JS）
└── package.json        # Node.js 依赖配置（可选）
```

### 核心文件说明

| 文件 | 职责 | 关键功能 |
|------|------|----------|
| `server.js` | 后端服务 | HTTP 服务器、API 路由、数据缓存、文件读取 |
| `github-client.js` | GitHub 客户端 | Issues/PRs API 封装、Token 管理 |
| `index.html` | 前端界面 | 状态看板、任务列表、日志展示、自动刷新 |

### 缓存策略

| 数据类型 | 缓存时间 | 说明 |
|----------|----------|------|
| 龙虾状态 | 60 秒 | 减少文件读取频率 |
| GitHub Issues | 60 秒 | 避免 API 限流 |
| GitHub PRs | 60 秒 | 避免 API 限流 |
| 执行日志 | 5 秒 | 近实时展示 |
| 健康状态 | 5 秒 | 快速发现异常 |

---

## 🎯 开发计划

- [ ] 添加 WebSocket 实时推送
- [ ] 支持多仓库监控
- [ ] 添加数据导出功能
- [ ] 优化移动端适配
- [ ] 添加用户认证

---

## 📞 支持

遇到问题？

1. 查看本文档的「故障排查」章节
2. 检查服务日志
3. 在 GitHub 提交 Issue

---

*🦞 龙虾小队，使命必达！*
