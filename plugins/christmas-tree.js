// plugins/user/christmas-tree.js
// Плагін: анімація на оверлеї з власним widget
// Ялинка: кожні 100 лайків (накопичувально) — нова кулька.
// Повна ялинка (28 кульок) = 2800 лайків → "Merry Christmas!" + велика зірка.
//
// Сокети:
//   christmas-tree:grow   → +1 кулька
//   christmas-tree:reset  → очистити
//   christmas-tree:set    → { count: N } — встановити N кульок одразу

module.exports = {
  name: 'christmas-tree',
  core: false,

  register(ctx) {
    ctx.registerWidget({
      type: 'christmas-tree',
      label: '🎄 Ялинка',
      defaultSize: { w: 300, h: 400 },
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: transparent;
      overflow: hidden;
    }
    #wrap {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #tree { width: 100%; height: 100%; display: block; }
    .snow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 2;
    }
    .snowflake {
      position: absolute;
      top: -20px;
      color: #fff;
      user-select: none;
      animation: fall linear infinite;
      text-shadow: 0 0 4px rgba(255,255,255,0.6);
    }
    @keyframes fall {
      to { transform: translateY(110vh); }
    }
    .ornament {
      opacity: 0;
      transform-box: fill-box;
      transform-origin: center;
      animation: pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes pop {
      0%   { opacity: 0; transform: scale(0.2); }
      70%  { opacity: 1; transform: scale(1.15); }
      100% { opacity: 1; transform: scale(1); }
    }
    
    /* 🔴 ВИПРАВЛЕНО: Анімація тепер на внутрішньому елементі, а позиція — на зовнішньому */
    #star {
      transform-box: fill-box;
      transform-origin: center;
      animation: starPulse 2s ease-in-out infinite;
    }
    @keyframes starPulse {
      0%, 100% { transform: scale(1);   opacity: 1;   }
      50%      { transform: scale(1.08); opacity: 0.85; }
    }
    
    #star-full {
      opacity: 0;
      transition: opacity 0.5s;
      transform-box: fill-box;
      transform-origin: center;
    }
    body.full #star-full {
      opacity: 1;
      animation: starPulse 1s ease-in-out infinite;
    }
    body.full #star-wrap { opacity: 0; }
    
    #merry {
      position: absolute;
      top: 6%;
      left: 50%;
      transform: translateX(-50%);
      font: 800 22px 'Segoe UI', system-ui, sans-serif;
      color: #ffe082;
      text-shadow: 0 0 12px #ffb300, 0 0 24px #ff8f00;
      opacity: 0;
      transition: opacity 0.8s;
      pointer-events: none;
      white-space: nowrap;
      z-index: 3;
    }
    body.full #merry { opacity: 1; }
  </style>
</head>
<body>
  <div class="snow" id="snow"></div>
  <div id="merry">🎄 Merry Christmas! 🎄</div>
  <div id="wrap">
    <svg id="tree" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="treeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#4caf50"/>
          <stop offset="60%"  stop-color="#2e7d32"/>
          <stop offset="100%" stop-color="#1b5e20"/>
        </linearGradient>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#fff59d" stop-opacity="0.9"/>
          <stop offset="60%"  stop-color="#ffb300" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#ffb300" stop-opacity="0"/>
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6"/>
        </filter>
      </defs>
      <ellipse cx="150" cy="365" rx="100" ry="8" fill="rgba(0,0,0,0.35)" filter="url(#softGlow)"/>
      <rect x="138" y="315" width="24" height="45" rx="3" fill="#5d4037"/>
      <rect x="138" y="315" width="14" height="45" rx="3" fill="#6d4c41" opacity="0.55"/>
      <polygon points="150,30 90,150 210,150" fill="url(#treeGrad)" stroke="#1b5e20" stroke-width="2" stroke-linejoin="round"/>
      <polygon points="150,90 60,230 240,230" fill="url(#treeGrad)" stroke="#1b5e20" stroke-width="2" stroke-linejoin="round"/>
      <polygon points="150,150 30,320 270,320" fill="url(#treeGrad)" stroke="#1b5e20" stroke-width="2" stroke-linejoin="round"/>
      <g id="lights"></g>
      <g id="ornaments"></g>
      
      <!-- 🔴 ВИПРАВЛЕНО: Обгорнуто в <g> для збереження позиції -->
      <g id="star-wrap" transform="translate(150, 30)">
        <g id="star">
          <circle r="26" fill="url(#starGlow)"/>
          <polygon points="0,-16 4.5,-5 16,-5 7,3 11,14 0,8 -11,14 -7,3 -16,-5 -4.5,-5" fill="#ffd54f" stroke="#f9a825" stroke-width="1.5" stroke-linejoin="round" filter="url(#glow)"/>
        </g>
      </g>
      <g id="star-full-wrap" transform="translate(150, 30)">
        <g id="star-full">
          <circle r="42" fill="url(#starGlow)"/>
          <polygon points="0,-24 6,-8 24,-8 10,4 16,22 0,12 -16,22 -10,4 -24,-8 -6,-8" fill="#ffe082" stroke="#ffab00" stroke-width="2" stroke-linejoin="round" filter="url(#glow)"/>
        </g>
      </g>
      
    </svg>
  </div>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    var params = new URLSearchParams(location.search);
    var user = params.get('user');
    var widgetId = params.get('widgetId') || '';
    var $ornaments = document.getElementById('ornaments');
    var $lights = document.getElementById('lights');
    var $snow = document.getElementById('snow');
    var SVG_NS = 'http://www.w3.org/2000/svg';
    // Слоти для кульок (знизу вгору)
    var SLOT_ROWS = [
      { y: 305, count: 7, colors: ['#ff5252','#ffd740','#40c4ff','#69f0ae','#ea80fc','#ffab40','#ff1744'] },
      { y: 270, count: 6, colors: ['#ffd740','#40c4ff','#69f0ae','#ea80fc','#ffab40','#ff5252'] },
      { y: 230, count: 5, colors: ['#40c4ff','#69f0ae','#ea80fc','#ffab40','#ff5252'] },
      { y: 190, count: 4, colors: ['#69f0ae','#ea80fc','#ffab40','#ff5252'] },
      { y: 150, count: 3, colors: ['#ea80fc','#ffab40','#ff5252'] },
      { y: 110, count: 2, colors: ['#ffab40','#ff5252'] },
      { y: 75,  count: 1, colors: ['#ff5252'] }
    ];
    function treeHalfWidth(y) {
      var t = Math.max(0, Math.min(1, (y - 30) / 290));
      return t * 120;
    }
    var SLOTS = [];
    for (var r = 0; r < SLOT_ROWS.length; r++) {
      var row = SLOT_ROWS[r];
      var hw = treeHalfWidth(row.y) - 14;
      for (var i = 0; i < row.count; i++) {
        var x = row.count === 1 ? 150 : 150 - hw + (2 * hw) * (i / (row.count - 1));
        SLOTS.push({ x: x, y: row.y, color: row.colors[i % row.colors.length] });
      }
    }
    // Перемішуємо, щоб кульки заповнювались у випадковому порядку
    for (var k = SLOTS.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1));
      var tmp = SLOTS[k]; SLOTS[k] = SLOTS[j]; SLOTS[j] = tmp;
    }
    var placed = 0;
    function makeEl(name, attrs) {
      var el = document.createElementNS(SVG_NS, name);
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) { el.setAttribute(key, attrs[key]); }
      }
      return el;
    }
    function addOrnament() {
      if (placed >= SLOTS.length) return;
      var slot = SLOTS[placed++];
      var outer = makeEl('g', { transform: 'translate(' + slot.x + ', ' + slot.y + ')' });
      var inner = makeEl('g', { 'class': 'ornament' });
      inner.appendChild(makeEl('circle', { r: '8', cy: '1.5', fill: 'rgba(0,0,0,0.35)' }));
      inner.appendChild(makeEl('circle', { r: '7', fill: slot.color, stroke: '#fff', 'stroke-width': '0.8', filter: 'url(#glow)' }));
      inner.appendChild(makeEl('circle', { cx: '-2.5', cy: '-2.5', r: '2', fill: 'rgba(255,255,255,0.85)' }));
      outer.appendChild(inner);
      $ornaments.appendChild(outer);
      if (placed === SLOTS.length) { document.body.classList.add('full'); }
    }
    function resetOrnaments() {
      while ($ornaments.firstChild) $ornaments.removeChild($ornaments.firstChild);
      placed = 0;
      document.body.classList.remove('full');
    }
    function setOrnaments(n) {
      var target = Math.max(0, Math.min(SLOTS.length, n | 0));
      resetOrnaments();
      for (var i = 0; i < target; i++) addOrnament();
    }
    // Гірлянда
    (function buildLights() {
      var colors = ['#ffeb3b', '#ff5252', '#40c4ff', '#69f0ae'];
      var edges = [
        [[150, 30], [90, 150]],
        [[150, 30], [210, 150]],
        [[150, 90], [60, 230]],
        [[150, 90], [240, 230]],
        [[150, 150], [30, 320]],
        [[150, 150], [270, 320]]
      ];
      var idx = 0;
      for (var e = 0; e < edges.length; e++) {
        var a = edges[e][0], b = edges[e][1];
        var steps = 6;
        for (var s = 1; s < steps; s++) {
          var t = s / steps;
          var x = a[0] + (b[0] - a[0]) * t;
          var y = a[1] + (b[1] - a[1]) * t;
          var c = makeEl('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: '2.4', fill: colors[idx % colors.length], opacity: '0.9', filter: 'url(#glow)' });
          var anim = makeEl('animate', { attributeName: 'opacity', values: '0.35;1;0.35', dur: (1.4 + Math.random() * 1.2).toFixed(2) + 's', repeatCount: 'indefinite', begin: (Math.random() * 2).toFixed(2) + 's' });
          c.appendChild(anim);
          $lights.appendChild(c);
          idx++;
        }
      }
    })();
    // Сніг
    (function buildSnow() {
      var flakes = ['❄', '❅', '❆', '•', '*'];
      var count = 25;
      for (var i = 0; i < count; i++) {
        var s = document.createElement('div');
        s.className = 'snowflake';
        s.textContent = flakes[Math.floor(Math.random() * flakes.length)];
        s.style.left = (Math.random() * 100) + '%';
        s.style.fontSize = (6 + Math.random() * 10) + 'px';
        s.style.animationDuration = (5 + Math.random() * 8) + 's';
        s.style.animationDelay = (-Math.random() * 10) + 's';
        s.style.opacity = (0.4 + Math.random() * 0.5).toFixed(2);
        $snow.appendChild(s);
      }
    })();
    // Сокети
    var socket = null;
    if (user) {
      socket = io({ query: { user: user } });
      socket.on('christmas-tree:grow', function () { addOrnament(); });
      socket.on('christmas-tree:reset', function () { resetOrnaments(); });
      socket.on('christmas-tree:set', function (data) {
        var n = (data && data.count) || 0;
        setOrnaments(n);
      });
    }
    // postMessage з редактора скрінів
    window.addEventListener('message', function (e) {
      var msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'ping') {
        try { window.parent.postMessage({ type: 'pong', widgetId: widgetId }, '*'); } catch (err) {}
        return;
      }
      if (msg.type === 'test-fire') {
        var burst = msg.count || 5;
        for (var i = 0; i < burst; i++) {
          (function (delay) { setTimeout(addOrnament, delay); })(i * 150);
        }
      }
    });
    try { window.parent.postMessage({ type: 'ready', widgetId: widgetId }, '*'); } catch (err) {}
  </script>
</body>
</html>`
    });
  },

  start(ctx) {
    const log = ctx.logger('christmas-tree');
    // Скільки лайків на одну кульку
    const LIKES_PER_LEAF = 100;
    // Максимум кульок (має співпадати з SLOTS.length у widget HTML)
    const MAX_ORNAMENTS = 28;
    // Стан: user -> { total, emitted }
    const state = new Map();
    function getState(user) {
      if (!state.has(user)) { state.set(user, { total: 0, emitted: 0 }); }
      return state.get(user);
    }
    ctx.serverBus.on('event', (evt) => {
      if (!evt || evt.type !== 'like') return;
      const s = getState(evt.user);
      const batchCount = evt.payload && evt.payload.count ? evt.payload.count : 1;
      // Накопичуємо загальну кількість
      s.total += batchCount;
      // Скільки кульок має бути за поточної суми
      const shouldHave = Math.min(MAX_ORNAMENTS, Math.floor(s.total / LIKES_PER_LEAF));
      // Скільки нових треба додати
      const newCount = shouldHave - s.emitted;
      if (newCount <= 0) return;
      s.emitted = shouldHave;
      for (let i = 0; i < newCount; i++) {
        log.info('[' + evt.user + '] +1 кулька (лайків: ' + s.total + ', кульок: ' + shouldHave + '/' + MAX_ORNAMENTS + ')');
        ctx.io.to(evt.user).emit('christmas-tree:grow');
      }
    });
  }
};