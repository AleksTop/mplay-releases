// Плагін: скляна Mason jar для подарунків з реальними іконками TikTok
// - Реакція на подарунок: іконка падає в банку, рахунок зростає
// - Combo (x10) рахується один раз, коли repeatEnd === true
// - Іконки беруться з /api/gifts/:user (реальні PNG з TikTok CDN)
// - Persistent store: totalDiamonds переживає перезапуск сервера
//
// Widget: Banka-widget
// Сокети: Banka:update, Banka:state, Banka:reset, Banka:getState

module.exports = {
  name: 'Banka',
  core: false,
  priority: 50,

  register(ctx) {
    ctx.registerWidget({
      type: 'Banka',
      label: '🍯 Банка подарунків',
      defaultSize: { w: 400, h: 640 },
      html: `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%; height: 100%;
    background: transparent;
    overflow: hidden;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }

  #stage {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px;
  }

  /* ═══════════════ POPUP ═══════════════ */
  #popup {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    opacity: 0;
    pointer-events: none;
    z-index: 100;
    background: linear-gradient(135deg, rgba(30,12,50,0.95), rgba(20,8,35,0.95));
    border: 1px solid rgba(200,150,255,0.35);
    border-radius: 14px;
    padding: 10px 16px 10px 10px;
    min-width: 260px;
    max-width: 340px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow:
      0 12px 32px rgba(0,0,0,0.6),
      0 0 0 1px rgba(255,255,255,0.06) inset,
      0 0 24px rgba(160,80,255,0.15);
    color: #fff;
    transition: opacity 0.35s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  #popup.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  #popup::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0; height: 0;
    border: 8px solid transparent;
    border-top-color: rgba(20,8,35,0.95);
  }

  .pop-avatar {
    width: 44px; height: 44px;
    border-radius: 50%;
    background: rgba(0,0,0,0.4);
    border: 2px solid rgba(200,150,255,0.5);
    flex-shrink: 0;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    color: rgba(255,255,255,0.6);
  }
  .pop-avatar img { width: 100%; height: 100%; object-fit: cover; display: none; }
  .pop-avatar.has-img img { display: block; }
  .pop-avatar.has-img .pop-letter { display: none; }

  .pop-text { flex: 1; min-width: 0; }
  .pop-user {
    font-size: 14px; font-weight: 700;
    color: #ffd54f;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .pop-action {
    font-size: 12px; opacity: 0.85;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 1px;
  }
  .pop-coins {
    font-size: 15px; font-weight: 700;
    color: #ffe082;
    margin-top: 2px;
    text-shadow: 0 0 8px rgba(255,200,0,0.5);
  }

  /* ═══════════════ JAR (Mason) ═══════════════ */
  .jar-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    margin-top: 24px;
    padding-bottom: 10px;
  }

  .jar-shadow {
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 200px; height: 16px;
    background: radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 40%, transparent 80%);
    border-radius: 50%;
    filter: blur(4px);
    z-index: 0;
  }

  .jar-lid {
    width: 186px; height: 32px;
    background: linear-gradient(180deg, #5a5f68 0%, #b8bcc4 8%, #dde1e8 22%, #9aa0aa 45%, #c8cdd5 68%, #8a8f99 85%, #4a4f58 100%);
    border-radius: 8px 8px 3px 3px;
    position: relative;
    z-index: 5;
    margin-bottom: -3px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.35), inset -4px 0 8px rgba(0,0,0,0.20), inset 4px 0 8px rgba(255,255,255,0.15);
  }
  .jar-lid-ridge {
    position: absolute; left: 4px; right: 4px; height: 2px;
    background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0.35) 100%);
    border-radius: 1px;
  }
  .jar-lid-ridge:nth-child(1) { top: 7px; }
  .jar-lid-ridge:nth-child(2) { top: 14px; }
  .jar-lid-ridge:nth-child(3) { top: 21px; }
  .jar-lid::before, .jar-lid::after {
    content: ''; position: absolute; left: 2px; right: 2px; height: 1px; background: rgba(60,65,75,0.6);
  }
  .jar-lid::before { top: 3px; }
  .jar-lid::after  { bottom: 3px; }

  .jar-neck {
    width: 168px; height: 10px;
    background: linear-gradient(180deg, #6e737d 0%, #b0b5bf 30%, #8a8f99 60%, #5a5f68 100%);
    border-radius: 0 0 4px 4px; position: relative; z-index: 4; margin-bottom: -2px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.4);
  }

  .jar-body {
    width: 200px; height: 300px;
    background: linear-gradient(180deg, rgba(215,228,245,0.12) 0%, rgba(200,215,235,0.08) 40%, rgba(190,205,228,0.06) 100%);
    border: 4px solid rgba(225,235,250,0.60); border-top-width: 3px;
    border-radius: 10px 10px 38px 38px;
    position: relative; overflow: hidden;
    box-shadow: inset -12px 0 22px rgba(255,255,255,0.20), inset 12px 0 22px rgba(0,0,0,0.22), inset 0 -10px 18px rgba(0,0,0,0.25), inset 0 6px 12px rgba(0,0,0,0.15), 0 14px 32px rgba(0,0,0,0.45);
    backdrop-filter: blur(4px); z-index: 3;
  }
  .jar-body::before {
    content: ''; position: absolute; top: 24px; left: 20px; width: 16px; height: 180px;
    background: linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.20) 55%, transparent 100%);
    border-radius: 50%; filter: blur(2.5px); pointer-events: none; z-index: 4;
  }
  .jar-body::after {
    content: ''; position: absolute; bottom: 34px; right: 24px; width: 8px; height: 60px;
    background: linear-gradient(180deg, rgba(255,255,255,0.30) 0%, transparent 100%);
    border-radius: 50%; filter: blur(2px); pointer-events: none; z-index: 4;
  }

  #fill {
    position: absolute; bottom: 0; left: 0; right: 0; height: 0%;
    background: linear-gradient(180deg, rgba(255,210,100,0.35) 0%, rgba(255,170,40,0.55) 60%, rgba(230,120,20,0.75) 100%);
    transition: height 0.8s cubic-bezier(0.25, 1, 0.5, 1);
    pointer-events: none; z-index: 1;
  }

  #items {
    position: absolute; inset: 0; pointer-events: none; z-index: 2;
  }

  .jar-item {
    position: absolute; font-size: 20px; line-height: 22px; width: 22px; height: 22px;
    text-align: center; user-select: none;
    will-change: transform, opacity;
    animation: dropIn 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
  }
  
  @keyframes dropIn {
    0%   { opacity: 0; transform: translateY(-250px) rotate(-35deg) scale(0.4); }
    55%  { opacity: 1; }
    82%  { transform: translateY(3px) rotate(6deg) scale(1.08); }
    100% { opacity: 1; transform: translateY(0) rotate(var(--rot, 0deg)) scale(1); }
  }

  .jar-item.fall-out {
    animation: fallOut 0.6s forwards cubic-bezier(0.5, 0, 1, 1);
    z-index: 0;
  }
  
  @keyframes fallOut {
    0% { transform: translateY(0) rotate(var(--rot, 0deg)); opacity: 1; }
    100% { transform: translateY(150px) rotate(calc(var(--rot, 0deg) + 90deg)); opacity: 0; }
  }

  .jar-item-img { display: flex; align-items: center; justify-content: center; }
  .jar-item-img img {
    width: 100%; height: 100%; object-fit: contain; display: block;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); pointer-events: none;
  }

  /* ═══════════════ INFO PANEL ═══════════════ */
  .info-panel {
    margin-top: 18px;
    background: linear-gradient(135deg, rgba(40,20,70,0.92), rgba(25,10,45,0.92));
    border: 1px solid rgba(180,140,255,0.30); border-radius: 16px; padding: 12px 18px;
    display: flex; align-items: center; gap: 14px; min-width: 240px;
    box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset;
    backdrop-filter: blur(6px);
  }
  .info-avatar {
    width: 52px; height: 52px; border-radius: 50%; background: rgba(0,0,0,0.4);
    border: 2px solid rgba(200,160,255,0.5); flex-shrink: 0; overflow: hidden;
    display: flex; align-items: center; justify-content: center; font-size: 24px; color: rgba(255,255,255,0.5);
  }
  .info-avatar img { width: 100%; height: 100%; object-fit: cover; display: none; }
  .info-avatar.has-img img { display: block; }
  .info-avatar.has-img .info-letter { display: none; }

  .info-text { flex: 1; min-width: 0; }
  .info-name {
    font-size: 13px; font-weight: 600; color: #ffd54f;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;
  }
  .info-total {
    font-size: 22px; font-weight: 800; color: #fff; line-height: 1.2; margin-top: 2px;
    display: flex; align-items: baseline; gap: 4px; transition: transform 0.25s;
  }
  .info-total.pulse { animation: totalPulse 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
  @keyframes totalPulse {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.18); color: #ffe082; }
    100% { transform: scale(1); }
  }
  .info-total .coin { font-size: 18px; }
  .info-total .num { font-variant-numeric: tabular-nums; }
  .info-last {
    font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 180px; min-height: 14px;
  }

  @media (max-height: 600px) {
    .jar-body { height: 250px; }
    .info-panel { padding: 8px 14px; }
    .info-avatar { width: 42px; height: 42px; font-size: 20px; }
    .info-total { font-size: 18px; }
  }
  @media (max-width: 320px) {
    .jar-body { width: 170px; }
    .jar-lid { width: 156px; }
    .jar-neck { width: 140px; }
  }
</style>
</head>
<body>
  <div id="stage">
    <div id="popup">
      <div class="pop-avatar" id="popAvatar">
        <span class="pop-letter" id="popLetter">?</span>
        <img id="popImg" alt="">
      </div>
      <div class="pop-text">
        <div class="pop-user" id="popUser">—</div>
        <div class="pop-action" id="popAction">—</div>
        <div class="pop-coins" id="popCoins"></div>
      </div>
    </div>

    <div class="jar-wrap">
      <div class="jar-shadow"></div>
      <div class="jar-lid">
        <div class="jar-lid-ridge"></div>
        <div class="jar-lid-ridge"></div>
        <div class="jar-lid-ridge"></div>
      </div>
      <div class="jar-neck"></div>
      <div class="jar-body">
        <div id="fill"></div>
        <div id="items"></div>
      </div>
    </div>

    <div class="info-panel">
      <div class="info-avatar" id="infoAvatar">
        <span class="info-letter" id="infoLetter">?</span>
        <img id="infoImg" alt="">
      </div>
      <div class="info-text">
        <div class="info-name" id="infoName">Очікування…</div>
        <div class="info-total" id="infoTotal">
          <span class="coin">💎</span>
          <span class="num" id="infoTotalNum">0</span>
        </div>
        <div class="info-last" id="infoLast"></div>
      </div>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    (function() {
      var params = new URLSearchParams(location.search);
      var user = params.get('user');
      var widgetId = params.get('widgetId') || '';

      // ─── Каталог подарунків (реальні іконки TikTok) ───
      var giftCatalog = {};        // { [giftId]: { image, name } }

      function loadGiftCatalog() {
        if (!user) return;
        fetch('/api/gifts/' + encodeURIComponent(user))
          .then(function(r) { return r.ok ? r.json() : []; })
          .then(function(list) {
            if (!Array.isArray(list)) return;
            var next = {};
            for (var i = 0; i < list.length; i++) {
              var g = list[i];
              if (g && g.id != null && g.image) {
                next[String(g.id)] = { image: g.image, name: g.name || '' };
              }
            }
            giftCatalog = next;
          })
          .catch(function(e) {
            console.warn('[Banka] catalog load failed:', e.message);
          });
      }

      // ─── Layout ───
      var JAR_W = 200;
      var JAR_H = 300;
      var BORDER = 4;
      var PAD = 8;
      var CELL = 24;
      var INNER_W = JAR_W - BORDER * 2 - PAD * 2;
      var INNER_H = JAR_H - BORDER * 2 - PAD * 2;
      var COLS = Math.max(1, Math.floor(INNER_W / CELL));
      var VISUAL_CAP = COLS * Math.max(1, Math.floor(INNER_H / CELL));
      var FILL_CAP = 2000;

      var $items = document.getElementById('items');
      var $fill = document.getElementById('fill');
      var $totalNum = document.getElementById('infoTotalNum');
      var $totalWrap = document.getElementById('infoTotal');
      var $infoName = document.getElementById('infoName');
      var $infoLast = document.getElementById('infoLast');
      var $infoAvatar = document.getElementById('infoAvatar');
      var $infoImg = document.getElementById('infoImg');
      var $infoLetter = document.getElementById('infoLetter');

      var $popup = document.getElementById('popup');
      var $popUser = document.getElementById('popUser');
      var $popAction = document.getElementById('popAction');
      var $popCoins = document.getElementById('popCoins');
      var $popAvatar = document.getElementById('popAvatar');
      var $popImg = document.getElementById('popImg');
      var $popLetter = document.getElementById('popLetter');

      var total = 0;
      var popupTimer = null;

      // ─── Хелпери ───
      function fmt(n) {
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }

      function iconFor(giftName, diamondCount) {
        var g = String(giftName || '').toLowerCase();
        if (g.indexOf('rose') !== -1) return '🌹';
        if (g.indexOf('heart') !== -1) return '💗';
        if (g.indexOf('hand') !== -1) return '🤲';
        if (g.indexOf('kiss') !== -1) return '💋';
        if (g.indexOf('star') !== -1) return '⭐';
        if (g.indexOf('fire') !== -1 || g.indexOf('flame') !== -1) return '🔥';
        if (g.indexOf('crown') !== -1 || g.indexOf('king') !== -1) return '👑';
        if (g.indexOf('lion') !== -1) return '🦁';
        if (g.indexOf('dragon') !== -1) return '🐉';
        if (g.indexOf('rocket') !== -1) return '🚀';
        if (g.indexOf('cake') !== -1) return '🎂';
        if (g.indexOf('coffee') !== -1) return '☕';
        if (g.indexOf('music') !== -1) return '🎵';
        if (g.indexOf('gg') === 0) return '🎮';
        if (diamondCount >= 1000) return '💎';
        if (diamondCount >= 100) return '💠';
        if (diamondCount >= 10) return '💗';
        return '🪙';
      }

      function slotPosition(i) {
        var col = i % COLS;
        var row = Math.floor(i / COLS);
        var x = PAD + col * CELL + (CELL - 22) / 2;
        var y = INNER_H - (row + 1) * CELL + (CELL - 22) / 2;
        var jx = (Math.random() - 0.5) * 4;
        var jy = (Math.random() - 0.5) * 3;
        return { x: x + jx, y: y + jy };
      }

      // ─── Додати іконку (з анімацією випадання) ───
      function addItem(icon) {
        // Отримуємо всі активні іконки (які не випадають зараз)
        var activeItems = Array.from($items.querySelectorAll('.jar-item:not(.fall-out)'));
        
        if (activeItems.length >= VISUAL_CAP) {
          // Беремо найстарішу іконку (першу в списку, вона внизу)
          var oldest = activeItems[0];
          oldest.classList.add('fall-out');
          // Видаляємо з DOM після завершення анімації
          setTimeout(function() {
            if (oldest.parentNode) oldest.parentNode.removeChild(oldest);
          }, 600);
          
          // Видаляємо її з активного списку, щоб не враховувати при розрахунку позицій
          activeItems.shift();
        }

        // Створюємо новий елемент
        var el = document.createElement('div');
        el.className = 'jar-item';
        var rot = (Math.random() - 0.5) * 30;
        el.style.setProperty('--rot', rot.toFixed(1) + 'deg');

        if (icon && typeof icon === 'object' && icon.image) {
          var img = document.createElement('img');
          img.src = icon.image;
          img.alt = icon.emoji || '';
          img.referrerPolicy = 'no-referrer';
          img.onerror = function() {
            try { el.removeChild(img); } catch(e) {}
            el.textContent = icon.emoji || '🪙';
            el.classList.remove('jar-item-img');
          };
          el.classList.add('jar-item-img');
          el.appendChild(img);
        } else {
          el.textContent = (typeof icon === 'string') ? icon : '🪙';
        }

        // Початкова позиція для нової іконки (остання у списку)
        var initialPos = slotPosition(activeItems.length);
        el.style.left = initialPos.x + 'px';
        el.style.top = initialPos.y + 'px';

        $items.appendChild(el);
        activeItems.push(el);

        // Плавно переміщуємо всі інші іконки на нові позиції
        activeItems.forEach(function(item, i) {
          var p = slotPosition(i);
          if (item !== el) {
            // Для існуючих іконок додаємо плавний перехід
            item.style.transition = 'left 0.3s, top 0.3s';
            item.style.left = p.x + 'px';
            item.style.top = p.y + 'px';
            // Прибираємо transition, щоб не заважав анімації dropIn
            setTimeout(function() { item.style.transition = ''; }, 350);
          }
        });
      }

      function updateFill() {
        var pct = Math.min(100, (total / FILL_CAP) * 100);
        $fill.style.height = pct + '%';
      }

      function updateTotal(newTotal, animate) {
        var prev = total;
        total = newTotal;
        $totalNum.textContent = fmt(total);
        updateFill();
        if (animate && total !== prev) {
          $totalWrap.classList.remove('pulse');
          void $totalWrap.offsetWidth;
          $totalWrap.classList.add('pulse');
          setTimeout(function() { $totalWrap.classList.remove('pulse'); }, 600);
        }
      }

      function setAvatar(container, img, letter, url, name) {
        if (url) {
          img.src = url;
          img.onload = function() { container.classList.add('has-img'); };
          img.onerror = function() { container.classList.remove('has-img'); };
        } else {
          container.classList.remove('has-img');
        }
        letter.textContent = (name && name[0]) ? name[0].toUpperCase() : '?';
      }

      function showPopup(d) {
        $popUser.textContent = d.sender || 'Гість';
        $popAction.textContent = 'donated ' + (d.giftName || 'подарунок') +
          (d.count > 1 ? ' x' + d.count : '');
        $popCoins.textContent = '+' + (d.coins || d.diamonds || 0) + ' 💎';
        setAvatar($popAvatar, $popImg, $popLetter, d.avatar, d.sender);
        $popup.classList.add('show');
        if (popupTimer) clearTimeout(popupTimer);
        popupTimer = setTimeout(function() {
          $popup.classList.remove('show');
        }, 3200);
      }

      function addGiftIcon(d) {
        var giftIdStr = d.giftId != null ? String(d.giftId) : '';
        var entry = giftIdStr ? giftCatalog[giftIdStr] : null;
        if (entry && entry.image) {
          addItem({
            image: entry.image,
            emoji: d.icon || iconFor(d.giftName, d.diamondCount || 0)
          });
        } else {
          addItem(d.icon || iconFor(d.giftName, d.diamondCount || 0));
        }
      }

      // ─── Socket ───
      var socket = null;
      if (user) {
        socket = io({ query: { user: user } });

        socket.on('connect', function() {
          socket.emit('Banka:getState');
        });

        socket.on('plugins:reloaded', function() {
          console.log('[Banka] plugins reloaded, reloading page');
          location.reload();
        });

        socket.on('Banka:state', function(d) {
          if (!d) return;
          updateTotal(d.total || 0, false);
          
          if (d.lastSender) {
            $infoName.textContent = d.lastSender;
            setAvatar($infoAvatar, $infoImg, $infoLetter, d.lastAvatar, d.lastSender);
          } else {
            // Очищення плашки, якщо даних немає
            $infoName.textContent = 'Очікування…';
            $infoAvatar.classList.remove('has-img');
            $infoLetter.textContent = '?';
          }
          
          if (d.lastGift) {
            $infoLast.textContent = '+' + (d.lastCoins || 0) + ' за ' + d.lastGift;
          } else {
            $infoLast.textContent = '';
          }
        });

        socket.on('Banka:update', function(d) {
          if (!d) return;
          updateTotal(d.total || 0, true);
          $infoName.textContent = d.sender || 'Гість';
          setAvatar($infoAvatar, $infoImg, $infoLetter, d.avatar, d.sender);
          $infoLast.textContent = '+' + (d.coins || 0) + ' за ' +
            (d.giftName || 'подарунок') +
            (d.count > 1 ? ' x' + d.count : '');
          showPopup(d);
          addGiftIcon(d);
        });

        socket.on('Banka:reset', function() {
          while ($items.firstChild) $items.removeChild($items.firstChild);
          updateTotal(0, false);
          $infoName.textContent = 'Очікування…';
          $infoLast.textContent = '';
          $infoAvatar.classList.remove('has-img');
          $infoLetter.textContent = '?';
        });
      }

      // ─── Widget heartbeat + test-fire ───
      window.addEventListener('message', function(e) {
        var msg = e.data;
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'ping') {
          try { window.parent.postMessage({ type: 'pong', widgetId: widgetId }, '*'); } catch (err) {}
        }
        if (msg.type === 'test-fire') {
          var roseId = null;
          for (var gid in giftCatalog) {
            if (giftCatalog[gid].name &&
                giftCatalog[gid].name.toLowerCase() === 'rose') {
              roseId = gid;
              break;
            }
          }
          var fake = {
            sender: 'TestUser',
            giftId: roseId,
            giftName: 'Rose',
            count: 10,
            coins: 10,
            diamondCount: 1,
            icon: '🌹',
            total: total + 10
          };
          updateTotal(fake.total, true);
          $infoName.textContent = fake.sender;
          $infoLast.textContent = '+10 за Rose x10';
          setAvatar($infoAvatar, $infoImg, $infoLetter, '', fake.sender);
          showPopup(fake);
          addGiftIcon(fake);
        }
      });
      try { window.parent.postMessage({ type: 'ready', widgetId: widgetId }, '*'); } catch (err) {}

      loadGiftCatalog();
      setInterval(loadGiftCatalog, 5 * 60 * 1000);
    })();
  </script>
</body>
</html>`
    });
  },

  start(ctx) {
    const log = ctx.logger('Banka');
    log.info('🍯 Banka v2 запущено (Banka + реальні іконки)');

    // ─── Обробка gift ───
    ctx.serverBus.on('event', (evt) => {
      try {
        if (!evt || evt.type !== 'gift') return;
        if (!evt.user) return;
        if (!evt.payload) return;

        if (!evt.payload.repeatEnd) return;

        const diamonds = (evt.payload.diamondCount || 1) * (evt.payload.count || 1);
        const giftName = evt.payload.giftName || 'Подарунок';
        const count = evt.payload.count || 1;
        const giftId = evt.payload.giftId || null;
        const sender = evt.sender || {};
        const senderName = sender.name || 'Гість';

        const store = ctx.getStore('Banka', evt.user);
        const currentTotal = store.get('totalDiamonds', 0) + diamonds;
        store.set('totalDiamonds', currentTotal);
        store.set('lastSender', senderName);
        store.set('lastGift', giftName);
        store.set('lastCoins', diamonds);
        store.set('lastAvatar', sender.avatar || '');

        log.info(`[${evt.user}] ${senderName} → ${giftName} x${count} (+${diamonds}💎), всього: ${currentTotal}`);

        const icon = pickIcon(giftName, evt.payload.diamondCount || 1);

        ctx.io.to(evt.user).emit('Banka:update', {
          total: currentTotal,
          coins: diamonds,
          count,
          sender: senderName,
          avatar: sender.avatar || '',
          giftId,
          giftName,
          diamondCount: evt.payload.diamondCount || 1,
          icon
        });
      } catch (err) {
        log.error('Помилка обробки gift:', err && err.message ? err.message : err);
      }
    });

    // ─── Socket: getState + reset ───
    ctx.io.on('connection', (socket) => {
      const user = socket.handshake.query.user;
      if (!user) return;

      socket.on('Banka:getState', () => {
        try {
          const store = ctx.getStore('Banka', user);
          socket.emit('Banka:state', {
            total: store.get('totalDiamonds', 0),
            lastSender: store.get('lastSender', ''),
            lastGift: store.get('lastGift', ''),
            lastCoins: store.get('lastCoins', 0),
            lastAvatar: store.get('lastAvatar', '')
          });
        } catch (e) {
          socket.emit('Banka:state', { total: 0 });
        }
      });

      socket.on('Banka:reset', () => {
        try {
          const store = ctx.getStore('Banka', user);
          store.set('totalDiamonds', 0);
          store.set('lastSender', '');
          store.set('lastGift', '');
          store.set('lastCoins', 0);
          store.set('lastAvatar', '');
          ctx.io.to(user).emit('Banka:reset');
          log.info(`[${user}] банку скинуто`);
        } catch (e) { /* ignore */ }
      });
    });
  }
};

// ─── Вибір іконки за назвою подарунка (fallback) ───
function pickIcon(giftName, diamondCount) {
  const g = String(giftName || '').toLowerCase();
  if (g.indexOf('rose') !== -1) return '🌹';
  if (g.indexOf('heart') !== -1) return '💗';
  if (g.indexOf('hand') !== -1) return '🤲';
  if (g.indexOf('kiss') !== -1) return '💋';
  if (g.indexOf('star') !== -1) return '⭐';
  if (g.indexOf('fire') !== -1 || g.indexOf('flame') !== -1) return '🔥';
  if (g.indexOf('crown') !== -1 || g.indexOf('king') !== -1) return '👑';
  if (g.indexOf('lion') !== -1) return '🦁';
  if (g.indexOf('dragon') !== -1) return '🐉';
  if (g.indexOf('rocket') !== -1) return '🚀';
  if (g.indexOf('cake') !== -1) return '🎂';
  if (g.indexOf('coffee') !== -1) return '☕';
  if (g.indexOf('music') !== -1) return '🎵';
  if (g.indexOf('tiktok') !== -1) return '🎵';
  if (g.indexOf('gg') === 0) return '🎮';
  if (diamondCount >= 1000) return '💎';
  if (diamondCount >= 100) return '💠';
  if (diamondCount >= 10) return '💗';
  return '🪙';
}