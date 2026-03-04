# Star Agent - AI Agent 状态可视化

科幻风格的 AI Agent 状态可视化面板，基于 Three.js 开发。

![Preview](https://via.placeholder.com/800x400?text=Star+Agent+Preview)

## 特性

- 🎮 科幻黑石碑造型（致敬《2001太空漫游》）
- 🌈 4种状态颜色显示
  - 青色 - 空闲
  - 蓝色 - 思考中
  - 橙色 - 工作中
  - 紫色 - 等待中
  - 红色 - 错误/断开
- 🔊 空灵科幻音效
- 📊 自动检测 OpenClaw 状态
- 💬 显示消息来源（Discord/飞书/Telegram等）
- 📝 底部科幻格言（每2小时更新）

## 快速开始

```bash
# 安装依赖
cd star-agent
npm install

# 启动服务
node server.js

# 访问
http://localhost:34123
```

## 状态监控

```bash
# 启动状态监控
node monitor.js
```

## 配置

- 端口: 34123
- 状态文件: state.json

## 技术栈

- Three.js - 3D 渲染
- Web Audio API - 音效
- Node.js - 服务端

## 作者

Created by 眉间尺 🗡️
