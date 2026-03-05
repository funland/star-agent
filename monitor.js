#!/usr/bin/env node
// OpenClaw 状态监控脚本
// 自动检测 Agent 状态并更新可视化

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'state.json');
const POLL_INTERVAL = 3000; // 3秒检查一次

// 状态检测函数
function checkOpenClawStatus(callback) {
  exec('openclaw sessions', { 
    timeout: 10000,
    maxBuffer: 1024 * 1024
  }, (error, stdout, stderr) => {
    // 如果执行出错（OpenClaw 可能挂了）
    if (error) {
      console.log('Error checking status:', error.message);
      callback({ status: 'error', message: '连接断开', task: 'OpenClaw 服务异常' });
      return;
    }
    
    const output = stdout + stderr;
    const lines = output.split('\n');
    
    let activeSession = null;
    let sessionAge = '';
    let sessionKind = '';
    let lastTask = '等待任务...';
    
    // 找最近活跃的会话
    let recentMinutes = 999;
    let recentLine = null;
    let feishuLine = null;
    let feishuMinutes = 999;
    
    for (const line of lines) {
      if (line.includes('direct') && !line.includes('cron')) {
        // 提取时间
        let mins = 999;
        if (line.includes('just now') || line.includes('just ')) {
          mins = 0;
        } else {
          const mMatch = line.match(/(\d+)\s*m\s*ago/);
          if (mMatch) mins = parseInt(mMatch[1]);
          else if (line.includes('m ago')) {
            const smMatch = line.match(/(\d+)\s*m/);
            if (smMatch) mins = parseInt(smMatch[1]);
          }
        }
        
        // 记录飞书会话（单独检查）
        if (line.toLowerCase().includes('feish') && mins < feishuMinutes) {
          feishuMinutes = mins;
          feishuLine = line;
        }
        
        // 记录最 recent 会话
        if (mins < recentMinutes) {
          recentMinutes = mins;
          recentLine = line;
        }
      }
    }
    
    // 优先显示飞书（如果5分钟内有活动）
    if (feishuLine && feishuMinutes <= 2) {
      lastTask = '飞书消息处理中';
      recentMinutes = feishuMinutes;
    } else if (recentLine) {
      const sessionKey = recentLine.toLowerCase();
      if (sessionKey.includes('disco')) {
        lastTask = 'Discord 消息处理中';
      } else if (sessionKey.includes('feish')) {
        lastTask = '飞书消息处理中';
      } else if (sessionKey.includes('tele')) {
        lastTask = 'Telegram 消息处理中';
      } else if (sessionKey.includes('whats')) {
        lastTask = 'WhatsApp 消息处理中';
      } else if (sessionKey.includes('main')) {
        lastTask = '主会话处理中';
      } else {
        lastTask = '处理任务中';
      }
    }
    
    // 根据活动时间判断状态
    let status, message;
    
    // 获取 token 使用量
    let tokenUsage = null;
    if (recentLine) {
      const tokenMatch = recentLine.match(/(\d+)[kmKM]?\/\d+[kmKM]?\s*\((\d+)%\)/);
      if (tokenMatch) {
        tokenUsage = {
          current: tokenMatch[1] + 'k',
          percent: parseInt(tokenMatch[2])
        };
      }
    }
    
    if (recentMinutes === 0) {
      // 刚收到消息/正在处理
      status = 'working';
      message = '工作中';
    } else if (recentMinutes < 3) {
      // 3分钟内有活动 - 思考中
      status = 'thinking';
      message = '思考中';
    } else if (recentMinutes < 10) {
      // 10分钟内 - 等待响应
      status = 'waiting';
      message = '等待中';
    } else {
      // 超过10分钟没活动 - 空闲
      status = 'idle';
      message = '空闲中';
      lastTask = '等待任务...';
    }
    
    callback({ 
      status: status, 
      message: message, 
      task: lastTask,
      token: tokenUsage
    });
  });
}

// 读取当前状态
function readCurrentState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { status: 'idle', message: '空闲中', task: '' };
}

// 保存状态
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

console.log('🔄 OpenClaw 状态监控已启动...');
console.log(`   每 ${POLL_INTERVAL/1000} 秒检查一次`);
console.log(`   状态文件: ${STATE_FILE}`);

// 初始状态
let lastStatus = 'idle';

// 主循环
setInterval(() => {
  checkOpenClawStatus((newState) => {
    // 只有状态变化时才更新
    if (newState.status !== lastStatus) {
      console.log(`📊 状态变化: ${lastStatus} -> ${newState.status} (${newState.task})`);
      saveState(newState);
      lastStatus = newState.status;
    }
  });
}, POLL_INTERVAL);

// 立即检查一次
checkOpenClawStatus((state) => {
  saveState(state);
  lastStatus = state.status;
  console.log(`📊 初始状态: ${state.status} - ${state.task}`);
});
