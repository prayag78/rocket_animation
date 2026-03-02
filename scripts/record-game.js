import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const USERNAME = process.env.GITHUB_USERNAME || 'prayag78';
const OUTPUT_DIR = path.join(__dirname, '..', 'assets');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'game-recording.webp');
const RECORD_DURATION = 40000;

async function fetchContributions(username) {
  const response = await fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`);
  if (!response.ok) throw new Error(`Failed to fetch contributions: ${response.status}`);
  const data = await response.json();
  return data.contributions || [];
}

function generateGameHTML(contributions) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0d1117; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  #game-container { position: relative; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 16px; }
  .hud { position: absolute; top: 16px; left: 16px; display: flex; gap: 16px; font-family: monospace; font-size: 14px; z-index: 10; pointer-events: none; }
  .hud-label { color: #c9d1d9; }
  .hud-score { color: #ffffff; font-weight: bold; }
  .hud-remaining { color: #ff7b72; font-weight: bold; }
</style>
</head><body>
<div id="game-container">
  <div class="hud">
    <div><span class="hud-label">Score: </span><span class="hud-score" id="score">0</span></div>
    <div><span class="hud-label">Remaining: </span><span class="hud-remaining" id="remaining">0</span></div>
  </div>
  <div id="game-area" style="position:relative;">
    <canvas id="game-canvas"></canvas>
    <div id="rocket" style="position:absolute;pointer-events:none;width:50px;height:80px;transform-origin:center bottom;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 80" width="50" height="60">
        <defs>
          <style>
            @keyframes pulse {
              0% { transform: scaleY(1); opacity: 0.8; }
              100% { transform: scaleY(1.4); opacity: 1; }
            }
            @keyframes hover {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-2px); }
            }
            .flame-main {
              animation: pulse 0.08s ease-in-out infinite alternate;
              transform-origin: 25px 60px;
            }
            .flame-wing {
              animation: pulse 0.08s ease-in-out infinite alternate-reverse;
            }
            .ship {
              animation: hover 2s ease-in-out infinite;
            }
          </style>
        </defs>
        <g class="ship">
          <g class="flame-main">
            <path d="M 20 60 Q 25 78 30 60 Q 25 64 20 60 Z" fill="#00E5FF" opacity="0.7"/>
            <path d="M 22 60 Q 25 72 28 60 Q 25 62 22 60 Z" fill="#FFFFFF"/>
          </g>
          <g class="flame-wing" style="transform-origin: 5px 58px;">
            <path d="M 4 58 Q 5 68 6 58 Z" fill="#00E5FF"/>
            <path d="M 4.5 58 Q 5 64 5.5 58 Z" fill="#FFFFFF"/>
          </g>
          <g class="flame-wing" style="transform-origin: 45px 58px;">
            <path d="M 44 58 Q 45 68 46 58 Z" fill="#00E5FF"/>
            <path d="M 44.5 58 Q 45 64 45.5 58 Z" fill="#FFFFFF"/>
          </g>
          <rect x="13" y="35" width="2" height="9" fill="#64748B" stroke="#1E293B" stroke-width="0.75" rx="0.5"/>
          <rect x="11" y="36" width="2" height="8" fill="#64748B" stroke="#1E293B" stroke-width="0.75" rx="0.5"/>
          <rect x="35" y="35" width="2" height="9" fill="#64748B" stroke="#1E293B" stroke-width="0.75" rx="0.5"/>
          <rect x="37" y="36" width="2" height="8" fill="#64748B" stroke="#1E293B" stroke-width="0.75" rx="0.5"/>
          <path d="M 20 35 L 9 46 L 9 52 L 19 49 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="1" stroke-linejoin="round"/>
          <path d="M 9 46 L 5 51 L 5 54 L 9 52 Z" fill="#0088FF" stroke="#1E293B" stroke-width="1" stroke-linejoin="round"/>
          <path d="M 19 32 L 16 39 L 19 40 Z" fill="#EF4444" stroke="#1E293B" stroke-width="0.5"/>
          <path d="M 30 35 L 41 46 L 41 52 L 31 49 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="1" stroke-linejoin="round"/>
          <path d="M 41 46 L 45 51 L 45 54 L 41 52 Z" fill="#0088FF" stroke="#1E293B" stroke-width="1" stroke-linejoin="round"/>
          <path d="M 31 32 L 34 39 L 31 40 Z" fill="#EF4444" stroke="#1E293B" stroke-width="0.5"/>
          <path d="M 5 44 C 4 48, 4 55, 5 58 C 6 55, 6 48, 5 44 Z" fill="#E2E8F0" stroke="#1E293B" stroke-width="1"/>
          <path d="M 45 44 C 44 48, 44 55, 45 58 C 46 55, 46 48, 45 44 Z" fill="#E2E8F0" stroke="#1E293B" stroke-width="1"/>
          <path d="M 19 55 L 31 55 L 30 60 L 20 60 Z" fill="#94A3B8" stroke="#1E293B" stroke-width="1" stroke-linejoin="round"/>
          <line x1="20" y1="57.5" x2="30" y2="57.5" stroke="#1E293B" stroke-width="0.5"/>
          <path d="M 25 6 C 29 15, 31 32, 31 54 L 19 54 C 19 32, 21 15, 25 6 Z" fill="#F8FAFC" stroke="#1E293B" stroke-width="1" stroke-linejoin="round"/>
          <path d="M 25 6 C 27 15, 29 32, 29 54 L 21 54 C 21 32, 23 15, 25 6 Z" fill="#0088FF" stroke="#1E293B" stroke-width="0.5" stroke-linejoin="round"/>
          <path d="M 25 18 C 29 24, 29 35, 25 38 C 21 35, 21 24, 25 18 Z" fill="#00E5FF" stroke="#1E293B" stroke-width="1" stroke-linejoin="round"/>
          <path d="M 25 19 C 27 24, 27 33, 25 36 C 24 33, 24 24, 25 19 Z" fill="#FFFFFF" opacity="0.4"/>
          <path d="M 25 34 L 26 56 L 25 59 L 24 56 Z" fill="#00E5FF" stroke="#1E293B" stroke-width="0.75" stroke-linejoin="round"/>
        </g>
      </svg>
    </div>
  </div>
</div>
<script>
const contributions = ${JSON.stringify(contributions)};

const CELL = 20, GAP = 5, ROCKET_W = 50, ROCKET_H = 80;
const BULLET_SPEED = 13, ROCKET_SPEED = 0.1, FIRE_RATE = 160;
const COLORS = { 0: '#0d1117', 1: '#00441b', 2: '#00882f', 3: '#00cc55', 4: '#00ff66' };

const weeks = [];
let week = [];
contributions.forEach(c => {
  week.push(c);
  if (week.length === 7) { weeks.push(week); week = []; }
});
if (week.length) weeks.push(week);
const displayWeeks = weeks.slice(-53);

const blocks = [];
let xOff = 0;
displayWeeks.forEach((w, wi) => {
  w.forEach((d, di) => {
    if (d.level > 0) {
      blocks.push({ id: wi+'-'+di, x: xOff, y: di*(CELL+GAP), w: CELL, h: CELL, level: d.level, color: COLORS[d.level] });
    }
  });
  xOff += CELL + GAP;
});

const canvasW = displayWeeks.length * (CELL + GAP);
const canvasH = 7 * (CELL + GAP) + 80;

const canvas = document.getElementById('game-canvas');
canvas.width = canvasW;
canvas.height = canvasH;
const ctx = canvas.getContext('2d');

const gameArea = document.getElementById('game-area');
gameArea.style.width = canvasW + 'px';
gameArea.style.height = canvasH + 'px';
document.getElementById('game-container').style.minHeight = (canvasH + 20) + 'px';

const rocketEl = document.getElementById('rocket');

let rocketX = canvasW / 2, targetX = canvasW / 2, currentTarget = null, lastFire = 0;
let bullets = [], particles = [], score = 0;

document.getElementById('remaining').textContent = blocks.length;

function loop(ts) {
  ctx.clearRect(0, 0, canvasW, canvasH);

  displayWeeks.forEach((w, wi) => {
    for (let di = 0; di < 7; di++) {
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(wi*(CELL+GAP), di*(CELL+GAP), CELL, CELL);
    }
  });

  blocks.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 2);
    ctx.fill();
  });

  const hasTarget = currentTarget && blocks.some(b => b.id === currentTarget);
  if (!hasTarget && blocks.length > 0) {
    const t = blocks[Math.floor(Math.random() * blocks.length)];
    currentTarget = t.id;
    targetX = t.x + CELL/2;
  } else if (hasTarget) {
    const t = blocks.find(b => b.id === currentTarget);
    if (t) targetX = t.x + CELL/2;
  }

  const diff = targetX - rocketX;
  if (Math.abs(diff) > 1) rocketX += diff * ROCKET_SPEED;
  else rocketX = targetX;

  if (Math.abs(rocketX - targetX) < 10 && blocks.length > 0 && ts - lastFire > FIRE_RATE) {
    bullets.push({ x: rocketX, y: canvasH - ROCKET_H - 5, active: true });
    lastFire = ts;
  }

  bullets.forEach(b => {
    b.y -= BULLET_SPEED;
    if (b.y < 0) b.active = false;
    if (!b.active) return;
    const hi = blocks.findIndex(bl => b.x >= bl.x && b.x <= bl.x+bl.w && b.y >= bl.y && b.y <= bl.y+bl.h);
    if (hi !== -1) {
      b.active = false;
      const hit = blocks[hi];
      for (let i = 0; i < 8; i++) {
        particles.push({ x: hit.x+CELL/2, y: hit.y+CELL/2, vx: (Math.random()-.5)*6, vy: (Math.random()-.5)*6, life: 1, color: hit.color });
      }
      blocks.splice(hi, 1);
      if (hit.id === currentTarget) currentTarget = null;
      score += 10;
      document.getElementById('score').textContent = score;
      document.getElementById('remaining').textContent = blocks.length;
    }
  });
  bullets = bullets.filter(b => b.active);

  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.06; });
  particles = particles.filter(p => p.life > 0);

  bullets.forEach(b => {
    ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI*2); ctx.fill();
  });
  particles.forEach(p => {
    ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); ctx.globalAlpha = 1;
  });

  // Move rocket div via DOM so CSS animations still play
  const tilt = Math.abs(diff) > 1 ? (diff > 0 ? 8 : -8) : 0;
  rocketEl.style.left = (rocketX - ROCKET_W/2) + 'px';
  rocketEl.style.top = (canvasH - ROCKET_H - 5) + 'px';
  rocketEl.style.transform = 'rotate(' + tilt + 'deg)';

  if (blocks.length === 0) {
    window.gameComplete = true;
    return;
  }
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
</script>
</body></html>`;
}

async function recordGame() {
  console.log(`Fetching contributions for ${USERNAME}...`);
  const contributions = await fetchContributions(USERNAME);
  console.log(`Got ${contributions.length} contribution days`);

  const htmlContent = generateGameHTML(contributions);
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { createServer } = await import('http');
  const httpServer = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
  });
  await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  const gameUrl = `http://127.0.0.1:${httpServer.address().port}/`;
  console.log(`Server: ${gameUrl}`);

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (() => {
    if (process.platform === 'win32') return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    return '/usr/bin/google-chrome-stable';
  })();

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(gameUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('#game-container', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    const box = await (await page.$('#game-container')).boundingBox();
    const pad = 20;
    const rw = Math.ceil(box.width + pad * 2);
    const rh = Math.ceil(box.height + pad * 2);
    await page.setViewport({ width: rw, height: rh });
    await page.evaluate(b => window.scrollTo(b.x - 10, b.y - 10), box);
    await new Promise(r => setTimeout(r, 500));

    console.log(`Recording ${rw}x${rh} for ${RECORD_DURATION / 1000}s...`);

    const client = await page.target().createCDPSession();
    await client.send('Page.startScreencast', { format: 'png', quality: 100, maxWidth: rw, maxHeight: rh, everyNthFrame: 1 });

    const frames = [];
    client.on('Page.screencastFrame', async ({ data, sessionId }) => {
      frames.push(Buffer.from(data, 'base64'));
      await client.send('Page.screencastFrameAck', { sessionId });
    });

    const MAX_DURATION = 90000;
    const startTime = Date.now();
    await new Promise(resolve => {
      const check = async () => {
        const done = await page.evaluate(() => window.gameComplete === true);
        if (done || Date.now() - startTime >= MAX_DURATION) resolve();
        else setTimeout(check, 500);
      };
      check();
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Game complete in ${elapsed}s`);
    await client.send('Page.stopScreencast');
    console.log(`Captured ${frames.length} frames`);

    const framesDir = path.join(OUTPUT_DIR, 'frames');
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });
    for (let i = 0; i < frames.length; i++) {
      fs.writeFileSync(path.join(framesDir, `frame${String(i).padStart(5, '0')}.png`), frames[i]);
    }

    console.log('Converting to animated WebP...');
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y', '-framerate', '60',
        '-i', path.join(framesDir, 'frame%05d.png'),
        '-vf', 'scale=1920:-1:flags=lanczos',
        '-c:v', 'libwebp_anim',
        '-quality', '85',
        '-loop', '0',
        '-lossless', '0',
        '-compression_level', '6',
        OUTPUT_PATH
      ]);
      ffmpeg.stderr.on('data', d => process.stdout.write(`ffmpeg: ${d}`));
      ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)));
      ffmpeg.on('error', reject);
    });

    fs.rmSync(framesDir, { recursive: true, force: true });
    console.log(`✅ WebP saved to: ${OUTPUT_PATH}`);

  } finally {
    await browser.close();
    httpServer.close();
  }
}

recordGame().catch(e => { console.error('Failed:', e); process.exit(1); });
