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
  
  // 天气缓存
  let weatherCache = { temp: '--', condition: 'Loading', icon: '☁️', location: 'Shanghai', updated: false };
  
  // API: 获取天气 (使用 Open-Meteo - 免费无需 API key)
  if (req.url.startsWith('/api/weather')) {
    // 如果已经有缓存且在30分钟内，直接返回
    if (weatherCache.updated && weatherCache.timestamp && (Date.now() - weatherCache.timestamp < 30 * 60 * 1000)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(weatherCache));
      return;
    }
    
    const https = require('https');
    // 上海坐标: 31.2304, 121.4737
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=31.23&longitude=121.47&current_weather=true&temperature_unit=celsius';
    
    https.get(url, (weatherRes) => {
      let data = '';
      weatherRes.on('data', chunk => data += chunk);
      weatherRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          const current = json.current_weather;
          weatherCache = {
            temp: Math.round(current.temperature),
            condition: getOpenMeteoCondition(current.weathercode),
            icon: getOpenMeteoIcon(current.weathercode),
            location: 'Shanghai',
            timestamp: Date.now(),
            updated: true
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(weatherCache));
        } catch (e) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(weatherCache));
        }
      });
    }).on('error', () => {
      weatherCache.updated = true;
      weatherCache.timestamp = Date.now();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(weatherCache));
    });
    return;
  }
  
  // Open-Meteo 天气码映射
  function getOpenMeteoIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 49) return '🌫️';
    if (code <= 69) return '🌧️';
    if (code <= 79) return '❄️';
    if (code <= 99) return '⛈️';
    return '☀️';
  }
  
  function getOpenMeteoCondition(code) {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Cloudy';
    if (code <= 49) return 'Fog';
    if (code <= 69) return 'Rain';
    if (code <= 79) return 'Snow';
    return 'Storm';
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Server running at http://localhost:${PORT}/`);
  console.log(`   Status API: http://localhost:${PORT}/api/status`);
  console.log(`   Update API: POST http://localhost:${PORT}/api/update`);
});
