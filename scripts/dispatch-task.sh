#!/bin/bash
# 🦞 主控（奥利）任务派发脚本
# 用法：./dispatch-task.sh <worker-id> <issue-url> <task-description>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQUAD_DIR="$(dirname "$SCRIPT_DIR")"
SHARED_DIR="$SQUAD_DIR/shared"

WORKER_ID="$1"
ISSUE_URL="$2"
TASK_DESC="$3"

if [ -z "$WORKER_ID" ] || [ -z "$ISSUE_URL" ] || [ -z "$TASK_DESC" ]; then
    echo "❌ 用法：./dispatch-task.sh <worker-id> <issue-url> <task-description>"
    echo "   例如：./dispatch-task.sh worker-1 https://github.com/xxx/xxx/issues/1 实现登录功能"
    exit 1
fi

TASK_FILE="$SHARED_DIR/task-$WORKER_ID.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

if [ ! -f "$TASK_FILE" ]; then
    echo "❌ 任务文件不存在：$TASK_FILE"
    exit 1
fi

echo "🦞 [$TIMESTAMP] 派发任务给 $WORKER_ID..."

# 读取当前任务文件，找到 TODO 清单部分
# 在第一个 [ ] 任务前插入新任务
TEMP_FILE=$(mktemp)

# 检查是否已有"暂无任务"行，如果有则替换
if grep -q '\[ \] 暂无任务' "$TASK_FILE"; then
    # 替换"暂无任务"为新任务
    sed "s/\[ \] 暂无任务 - 等待主控派发/[ ] $TASK_DESC ($ISSUE_URL)/" "$TASK_FILE" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$TASK_FILE"
else
    # 在 TODO 清单部分插入新任务
    awk -v task="[ ] $TASK_DESC ($ISSUE_URL)" '
    /^## TODO 清单/ { print; next }
    /^```$/ && !inserted { print; print task; inserted=1; next }
    { print }
    ' "$TASK_FILE" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$TASK_FILE"
fi

# 更新最后更新时间
sed -i '' "s/\*\*最后更新:\*\*.*/\*\*最后更新:\*\* $TIMESTAMP/" "$TASK_FILE" 2>/dev/null || \
sed -i "s/\*\*最后更新:\*\*.*/\*\*最后更新:\*\* $TIMESTAMP/" "$TASK_FILE"

echo "✅ 任务已派发！"
echo "   工人：$WORKER_ID"
echo "   Issue: $ISSUE_URL"
echo "   任务：$TASK_DESC"
echo ""
echo "小弟将在下次唤醒时（5 分钟内）开始干活..."
