#!/bin/bash
# 🦞 龙虾小弟唤醒脚本
# 每 5 分钟执行一次，唤醒所有小弟检查任务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQUAD_DIR="$(dirname "$SCRIPT_DIR")"
SHARED_DIR="$SQUAD_DIR/shared"

echo "🦞 [$(date '+%Y-%m-%d %H:%M:%S')] 唤醒小弟们检查任务..."

# 检查每个小弟的任务文件
for worker in worker-1 worker-2 worker-3; do
    TASK_FILE="$SHARED_DIR/task-$worker.md"
    
    if [ -f "$TASK_FILE" ]; then
        # 检查是否有待完成任务 [ ]
        if grep -q '^\[ \]' "$TASK_FILE"; then
            echo "  📋 $worker: 发现待完成任务，准备唤醒..."
            # 这里会通过 OpenClaw cron 触发小弟会话
            # 实际唤醒由 OpenClaw cron 处理
        else
            echo "  ✅ $worker: 暂无待完成任务"
        fi
    else
        echo "  ⚠️ $worker: 任务文件不存在，创建默认文件..."
        cat > "$TASK_FILE" << 'EOF'
# 📋 任务清单

**最后更新:** $(date '+%Y-%m-%d %H:%M')
**状态:** 等待任务派发

---

## TODO 清单

```
[ ] 暂无任务 - 等待主控派发
```

---
EOF
    fi
done

echo "🦞 [$(date '+%Y-%m-%d %H:%M:%S')] 检查完成"
