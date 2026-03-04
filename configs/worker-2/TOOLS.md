# TOOLS.md - 你的工具配置

## 可用工具

- `exec` - 执行 shell 命令（在你的容器内）
- `read` / `write` / `edit` - 文件操作
- `web_search` - 搜索信息
- `web_fetch` - 抓取网页内容
- `browser` - 浏览器自动化（如需要）

## Git 配置

```bash
# 你的工作目录
WORKDIR: /app/workspace

# Git 用户配置
git config user.name "丸子 (Lobster Worker #2)"
git config user.email "worker-2@lobster-squad.local"
```

## 端口分配

- Worker-2 可用端口：3101-3199
- 不要占用其他端口

## 共享目录

- `/app/shared` - 与主控和其他小弟共享
- `task-worker-2.md` 在这里，主控写入，你读取
- 不要在这里写其他文件
