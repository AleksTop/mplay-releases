// Плагін: парад глядачів унизу екрана
// Кожен, хто пише в чат — отримує свого чоловічка свого кольору
// з ніком над головою. Хаотичний рух з відбиттям від країв.
// Якщо гравець знову пише — таймер оновлюється.
// Якщо 3 хв не пише — чоловічок зникає.

module.exports = {
  name: 'chatters-parade',
  core: false,

  register(ctx) {
    ctx.registerWidget({
      type: 'chatters-parade',
      label: '🚶 Парад глядачів',
      defaultSize: { w: 1920, h: 220 },
      html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  html, body {
    margin: 0; width: 100%; height: 100%;
    background: transparent; overflow: hidden;
  }
  #stage { position: absolute; inset: 0; }
  .person {
    position: absolute;
    bottom: 20px;
    transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center;
    gap: 3px;
    pointer-events: none;
    will-change: transform, left;
    transition: opacity 0.5s;
  }
  .person .nick {
    font: 700 11px 'Segoe UI', system-ui, sans-serif;
    color: #fff;
    background: rgba(0,0,0,0.55);
    padding: 2px 7px;
    border-radius: 10px;
    white-space: nowrap;
    text-shadow: 0 1px 2px #000;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .person svg {
    display: block;
    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
    animation: bob 0.6s ease-in-out infinite alternate;
  }
  @keyframes bob {
    from { transform: translateY(0); }
    to   { transform: translateY(-3px); }
  }
  @keyframes popIn {
    0%   { transform: translateX(-50%) scale(0.2); opacity: 0; }
    60%  { transform: translateX(-50%) scale(1.2); opacity: 1; }
    100% { transform: translateX(-50%) scale(1); opacity: 1; }
  }
  .person.appear { animation: popIn 0.35s ease-out; }
</style>
</head>
<body>
  <div id="stage"></div>
  <script src="/socket.io/socket.io.js"><\/script>
  <script>
    const user = new URLSearchParams(location.search).get('user');
    const socket = io({ query: { user } });
    const stage = document.getElementById('stage');

    // Колір з імені (детермінований, стабільний)
    function colorFromName(name) {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
      }
      const hue = Math.abs(hash) % 360;
      return 'hsl(' + hue + ', 70%, 60%)';
    }

    // SVG чоловічок з кольоровим тілом
    function personSvg(color) {
      return '<svg width="34" height="46" viewBox="0 0 34 46">'
        + '<circle cx="17" cy="9" r="7" fill="' + color + '"/>'
        + '<rect x="10" y="16" width="14" height="18" rx="4" fill="' + color + '"/>'
        + '<rect x="7" y="33" width="6" height="11" rx="2" fill="' + color + '"/>'
        + '<rect x="21" y="33" width="6" height="11" rx="2" fill="' + color + '"/>'
        + '<rect x="4" y="18" width="5" height="12" rx="2.5" fill="' + color + '"/>'
        + '<rect x="25" y="18" width="5" height="12" rx="2.5" fill="' + color + '"/>'
        + '</svg>';
    }

    function escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      }[c]));
    }

    const people = new Map(); // name -> { el, x, vx, _removeTimer }
    const MAX_PEOPLE = 30;
    const IDLE_MS = 3 * 60 * 1000;   // 3 хвилини

    const W = () => stage.clientWidth || window.innerWidth;
    const H = () => stage.clientHeight || window.innerHeight;

    function scheduleRemove(name) {
      const p = people.get(name);
      if (!p) return;
      clearTimeout(p._removeTimer);
      p._removeTimer = setTimeout(() => {
        p.el.style.opacity = '0';
        setTimeout(() => {
          p.el.remove();
          people.delete(name);
        }, 500);
      }, IDLE_MS);
    }

    function createPerson(name) {
      // Ліміт — видаляємо найстарішого
      if (people.size >= MAX_PEOPLE) {
        const oldestKey = people.keys().next().value;
        const oldest = people.get(oldestKey);
        if (oldest) {
          clearTimeout(oldest._removeTimer);
          oldest.el.remove();
          people.delete(oldestKey);
        }
      }

      const color = colorFromName(name);
      const el = document.createElement('div');
      el.className = 'person appear';
      const startX = 40 + Math.random() * (W() - 80);
      el.style.left = startX + 'px';
      el.innerHTML =
        '<div class="nick">' + escapeHtml(name) + '</div>'
        + personSvg(color);
      stage.appendChild(el);

      // Прибираємо клас appear після анімації
      setTimeout(() => el.classList.remove('appear'), 400);

      const speed = 0.15 + Math.random() * 0.45;   // px per frame
      const dir = Math.random() < 0.5 ? 1 : -1;

      people.set(name, {
        el,
        x: startX,
        vx: speed * dir,
        _removeTimer: null
      });

      scheduleRemove(name);
    }

    function tick() {
      const w = W();
      for (const [name, p] of people) {
        // Хаотичний рух: іноді змінюємо швидкість
        if (Math.random() < 0.025) {
          p.vx += (Math.random() - 0.5) * 0.4;
        }
        p.vx = Math.max(-0.9, Math.min(0.9, p.vx));
        if (Math.abs(p.vx) < 0.1) {
          p.vx += p.vx >= 0 ? 0.12 : -0.12;
        }

        p.x += p.vx;

        // Відбиття від країв
        if (p.x < 20) { p.x = 20; p.vx = Math.abs(p.vx); }
        if (p.x > w - 20) { p.x = w - 20; p.vx = -Math.abs(p.vx); }

        // Нахил у бік руху
        const tilt = p.vx * 6;
        p.el.style.left = p.x + 'px';
        p.el.style.transform = 'translateX(-50%) rotate(' + tilt + 'deg)';
      }
      requestAnimationFrame(tick);
    }

    socket.on('chatters:join', (data) => {
      if (!data || !data.name) return;
      if (people.has(data.name)) {
        scheduleRemove(data.name);
        return;
      }
      createPerson(data.name);
    });

    socket.on('chatters:clear', () => {
      for (const [, p] of people) {
        clearTimeout(p._removeTimer);
        p.el.remove();
      }
      people.clear();
    });

    tick();
  <\/script>
</body>
</html>`
    });
  },

  start(ctx) {
    const log = ctx.logger('chatters-parade');

    // Просто транслюємо кожне чат-повідомлення в overlay.
    // Widget сам вирішує: якщо людини ще немає — створити;
    // якщо є — оновити таймер неактивності.
    ctx.serverBus.on('event', (evt) => {
      if (!evt || evt.type !== 'chat') return;
      const name = evt.sender?.name;
      if (!name) return;
      ctx.io.to(evt.user).emit('chatters:join', { name });
    });
  }
};