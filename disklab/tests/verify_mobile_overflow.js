const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8128;
const baseDir = path.join(__dirname, '..');

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(baseDir, reqPath);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    let contentType = 'text/plain';
    if (filePath.endsWith('.html')) contentType = 'text/html';
    else if (filePath.endsWith('.css')) contentType = 'text/css';
    else if (filePath.endsWith('.js')) contentType = 'application/javascript';
    else if (filePath.endsWith('.png')) contentType = 'image/png';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const widths = [320, 375, 390, 768, 1440];
  
  for (const w of widths) {
    const screenshotPath = path.join(__dirname, `screenshot_${w}.png`);
    const cmd = `"${chromePath}" --headless=new --disable-gpu --window-size=${w},900 --run-all-compositor-stages-before-draw --virtual-time-budget=2000 --screenshot="${screenshotPath}" http://127.0.0.1:${PORT}/index.html`;
    try {
      execSync(cmd, { stdio: 'pipe' });
      console.log(`Captured screenshot for width ${w}px -> ${screenshotPath}`);
    } catch (e) {
      console.error(`Error for width ${w}px:`, e.message);
    }
  }
  
  server.close();
});
