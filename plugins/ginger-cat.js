// plugins/user/ginger-cat.js
// Рудий кіт біжить по екрану при вході глядача в чат
// Час: 5-12 сек, напрямок випадковий, мявкає 1-3 рази (mp3)

module.exports = {
  name: 'ginger-cat',
  core: false,

  register(ctx) {
    ctx.registerWidget({
      type: 'ginger-cat',
      label: '🐱 Рудий кіт',
      defaultSize: { w: 1920, h: 300 },
      html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  html, body {
    margin: 0; width: 100%; height: 100%;
    background: transparent; overflow: hidden;
  }
  #stage { position: absolute; inset: 0; overflow: hidden; }
  .cat {
    position: absolute;
    bottom: 20px;
    will-change: left, transform;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
  }
  .cat svg { display: block; }
  .cat .leg {
    transform-origin: top center;
    animation: step 0.25s infinite alternate;
  }
  .cat .leg.back { animation-delay: -0.12s; }
  @keyframes step {
    from { transform: rotate(-15deg); }
    to   { transform: rotate(15deg); }
  }
  .cat .tail {
    transform-origin: right center;
    animation: wag 0.4s infinite alternate;
  }
  @keyframes wag {
    from { transform: rotate(-8deg); }
    to   { transform: rotate(8deg); }
  }
</style>
</head>
<body>
  <div id="stage"></div>
  <script src="/socket.io/socket.io.js"><\/script>
  <script>
    const user = new URLSearchParams(location.search).get('user');
    const socket = io({ query: { user } });
    const stage = document.getElementById('stage');

    function catSvg() {
      return \`
<svg width="130" height="90" viewBox="0 0 130 90">
  <g class="tail" style="transform-origin: 25px 50px;">
    <path d="M 25 52 Q 5 40 8 20 Q 10 12 18 16 Q 16 30 28 45"
          fill="none" stroke="#E67E22" stroke-width="6" stroke-linecap="round"/>
  </g>
  <g class="leg back" style="transform-origin: 42px 68px;">
    <rect x="38" y="62" width="8" height="24" rx="3" fill="#D35400"/>
  </g>
  <g class="leg back" style="transform-origin: 58px 68px;">
    <rect x="54" y="62" width="8" height="24" rx="3" fill="#D35400"/>
  </g>
  <ellipse cx="70" cy="55" rx="42" ry="20" fill="#E67E22"/>
  <path d="M 50 42 Q 55 50 52 62" stroke="#D35400" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M 62 40 Q 66 50 63 65" stroke="#D35400" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M 78 40 Q 82 50 79 65" stroke="#D35400" stroke-width="3" fill="none" stroke-linecap="round"/>
  <g class="leg" style="transform-origin: 88px 68px;">
    <rect x="84" y="62" width="8" height="24" rx="3" fill="#E67E22"/>
  </g>
  <g class="leg" style="transform-origin: 102px 68px;">
    <rect x="98" y="62" width="8" height="24" rx="3" fill="#E67E22"/>
  </g>
  <circle cx="108" cy="40" r="20" fill="#E67E22"/>
  <path d="M 94 26 L 90 10 L 104 22 Z" fill="#E67E22" stroke="#D35400" stroke-width="2" stroke-linejoin="round"/>
  <path d="M 120 24 L 124 8 L 130 22 Z" fill="#E67E22" stroke="#D35400" stroke-width="2" stroke-linejoin="round"/>
  <path d="M 96 24 L 93 14 L 102 22 Z" fill="#F5B7B1"/>
  <path d="M 121 22 L 124 12 L 128 21 Z" fill="#F5B7B1"/>
  <ellipse cx="112" cy="46" rx="12" ry="8" fill="#FAD7A0"/>
  <ellipse cx="102" cy="37" rx="3" ry="4" fill="#2C3E50"/>
  <ellipse cx="114" cy="37" rx="3" ry="4" fill="#2C3E50"/>
  <circle cx="103" cy="36" r="1" fill="#fff"/>
  <circle cx="115" cy="36" r="1" fill="#fff"/>
  <path d="M 108 44 L 106 47 L 110 47 Z" fill="#E74C3C"/>
  <path d="M 108 47 Q 105 50 102 48" stroke="#7B3F00" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M 108 47 Q 111 50 114 48" stroke="#7B3F00" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <line x1="96" y1="44" x2="86" y2="42" stroke="#7B3F00" stroke-width="1" stroke-linecap="round"/>
  <line x1="96" y1="46" x2="86" y2="48" stroke="#7B3F00" stroke-width="1" stroke-linecap="round"/>
  <line x1="120" y1="44" x2="130" y2="42" stroke="#7B3F00" stroke-width="1" stroke-linecap="round"/>
  <line x1="120" y1="46" x2="130" y2="48" stroke="#7B3F00" stroke-width="1" stroke-linecap="round"/>
</svg>\`;
    }

    function meow() {
      const audio = new Audio('/sfx/meow.mp3');
      audio.volume = 0.5;
      audio.playbackRate = 0.9 + Math.random() * 0.2;
      audio.play().catch(err => console.warn('[cat] meow failed:', err.message));
    }

    let running = false;

    function runCat() {
      if (running) return;
      running = true;

      const dirLeft = Math.random() < 0.5;
      const W = stage.clientWidth || window.innerWidth;
      const H = stage.clientHeight || window.innerHeight;
      const durationMs = 5000 + Math.random() * 7000;
      const bottomPx = 10 + Math.random() * Math.max(20, H - 120);

      const el = document.createElement('div');
      el.className = 'cat';
      el.innerHTML = catSvg();
      el.style.bottom = bottomPx + 'px';
      stage.appendChild(el);

      const startX = dirLeft ? W + 20 : -160;
      const endX = dirLeft ? -160 : W + 20;
      const flip = dirLeft ? 'scaleX(-1)' : 'scaleX(1)';

      el.style.left = startX + 'px';
      el.style.transform = flip;

      const startTime = performance.now();

      function frame() {
        const t = Math.min(1, (performance.now() - startTime) / durationMs);
        const x = startX + (endX - startX) * t;
        el.style.left = x + 'px';
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          el.remove();
          running = false;
        }
      }
      requestAnimationFrame(frame);

      const meowCount = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < meowCount; i++) {
        const delay = Math.random() * (durationMs - 500);
        setTimeout(meow, delay);
      }

      let hop = 0;
      const hopInterval = setInterval(() => {
        if (!el.parentNode) { clearInterval(hopInterval); return; }
        hop = (hop + 1) % 2;
        el.style.marginBottom = (hop ? 3 : 0) + 'px';
      }, 200);

      setTimeout(() => clearInterval(hopInterval), durationMs + 200);
    }

    socket.on('cat:run', () => runCat());
  <\/script>
</body>
</html>`
    });
  },

  start(ctx) {
    const log = ctx.logger('ginger-cat');

    ctx.serverBus.on('event', (evt) => {
      if (!evt || evt.type !== 'join') return;
      const sender = evt.sender?.name || 'viewer';
      log.info(`[${evt.user}] 🐱 ${sender} зайшов — кіт біжить`);
      ctx.io.to(evt.user).emit('cat:run', { sender, at: Date.now() });
    });
  }
};