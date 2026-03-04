#!/bin/bash
# 更新 Agent 状态
# 用法: ./set_status.sh <status> [message] [task]
# status: idle, thinking, working, error, waiting

STATUS=${1:-idle}
MESSAGE=${2:-}
TASK=${3:-}

curl -s -X POST http://localhost:3000/api/update \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"$STATUS\", \"message\": \"$MESSAGE\", \"task\": \"$TASK\"}"

echo ""
