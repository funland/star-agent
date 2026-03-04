const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 34123;
const STATE_FILE = path.join(__dirname, 'state.json');

// 默认状态
const defaultState = {
  status: 'idle',
  message: '空闲中',
  task: '',
  updatedAt: new Date().toISOString()
};

// 初始化状态文件
if (!fs.existsSync(STATE_FILE)) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(defaultState));
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  let filePath = '.' + req.url;
  
  // API: 获取状态
  if (req.url.startsWith('/api/status')) {
    console.log('Serving /api/status, url:', req.url);
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(state));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(defaultState));
    }
    return;
  }
  
  // API: 更新状态
  if (req.url === '/api/update' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newState = JSON.parse(body);
        const current = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        const updated = { ...current, ...newState, updatedAt: new Date().toISOString() };
        fs.writeFileSync(STATE_FILE, JSON.stringify(updated));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  // 静态文件
  if (filePath === './') filePath = './index.html';
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile('./index.html', (error, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🌐 Server running at http://localhost:${PORT}/`);
  console.log(`   Status API: http://localhost:${PORT}/api/status`);
  console.log(`   Update API: POST http://localhost:${PORT}/api/update`);
});
