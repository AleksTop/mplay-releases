// plugins/user/Tank.js
// Танк їздить по всьому екрану з постійною швидкістю, а на кожні 1000 лайків — стріляє.

module.exports = {
  name: 'Tank',
  core: false,

  register(ctx) {
    ctx.registerWidget({
      type: 'Tank',
      label: '💥 Танк (реагує на лайки)',
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
  #stage { 
    position: absolute; 
    inset: 0; 
    overflow: hidden; 
  }
  
  /* Контейнер для переміщення по осі X */
  #tank-mover {
    position: absolute;
    bottom: 20px;
    left: 0;
    will-change: transform;
    /* Додаємо плавність при розвороті */
    transition: transform 0.3s ease-in-out; 
  }
  
  /* Внутрішній контейнер для віддачі (щоб не ламати рух) */
  #tank-body {
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.6));
    transition: transform 0.1s ease-out;
  }

  .tank svg { display: block; }
  
  .tank .track {
    animation: trackMove 1s linear infinite;
  }
  @keyframes trackMove {
    from { stroke-dashoffset: 20; }
    to   { stroke-dashoffset: 0; }
  }

  .muzzle-flash {
    position: absolute;
    display: none;
    font-size: 40px;
    top: 40px;
    pointer-events: none;
    z-index: 10;
    transform-origin: center;
  }

  .projectile {
    position: absolute;
    width: 20px; height: 6px;
    background: #ff9800;
    border-radius: 50%;
    box-shadow: 0 0 10px #ff9800, 0 0 20px #ff5722;
    display: none;
    z-index: 5;
  }
</style>
</head>
<body>
  <div id="stage">
    <div id="tank-mover">
      <div id="tank-body" class="tank">
        <!-- SVG танк буде вставлено через JS -->
      </div>
    </div>
  </div>
  
  <script src="/socket.io/socket.io.js"><\/script>
  <script>
    const user = new URLSearchParams(location.search).get('user');
    const socket = io({ query: { user } });
    const stage = document.getElementById('stage');
    const mover = document.getElementById('tank-mover');
    const body = document.getElementById('tank-body');

    let tankWidth = 180;
    let x = -tankWidth;
    let dir = 1; // 1 = right, -1 = left
    let speed = 150; // пікселів на секунду
    let lastTime = performance.now();
    let isRecoiling = false;

    function tankSvg() {
      return \`
<svg width="180" height="100" viewBox="0 0 180 100">
  <!-- Треки (гусениці) -->
  <rect x="10" y="70" width="140" height="25" rx="12" fill="#2c3e50" stroke="#1a252f" stroke-width="2"/>
  <!-- Колеса -->
  <circle cx="30" cy="82.5" r="10" fill="#34495e" stroke="#1a252f" stroke-width="2"/>
  <circle cx="65" cy="82.5" r="10" fill="#34495e" stroke="#1a252f" stroke-width="2"/>
  <circle cx="100" cy="82.5" r="10" fill="#34495e" stroke="#1a252f" stroke-width="2"/>
  <circle cx="135" cy="82.5" r="10" fill="#34495e" stroke="#1a252f" stroke-width="2"/>
  
  <!-- Корпус -->
  <path d="M 20 70 L 150 70 L 160 50 L 30 50 Z" fill="#27ae60" stroke="#1e8449" stroke-width="2"/>
  
  <!-- Башта -->
  <rect x="60" y="25" width="60" height="25" rx="5" fill="#2ecc71" stroke="#1e8449" stroke-width="2"/>
  
  <!-- Дульний гальмо -->
  <rect x="140" y="32" width="40" height="10" rx="3" fill="#7f8c8d" stroke="#2c3e50" stroke-width="2"/>
  
  <!-- Люк -->
  <circle cx="90" cy="25" r="8" fill="#1e8449" stroke="#145a32" stroke-width="2"/>
</svg>\`;
    }

    // Додаємо танк та снаряди
    function initTank() {
      body.innerHTML = tankSvg();
      
      const flash = document.createElement('div');
      flash.className = 'muzzle-flash';
      flash.innerHTML = '💥';
      body.appendChild(flash);

      const proj = document.createElement('div');
      proj.className = 'projectile';
      stage.appendChild(proj); // Снаряд додаємо прямо в stage, щоб він не рухався разом з танком
    }

    // Головний цикл руху (requestAnimationFrame)
    function tick(now) {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const maxX = stage.clientWidth;
      x += speed * dir * dt;

      // Перевірка на вихід за межі
      if (x > maxX + 50) {
        dir = -1;
        mover.style.transition = 'none'; // Миттєвий розворот
        x = maxX + 50;
        setTimeout(() => { mover.style.transition = 'transform 0.3s ease-in-out'; }, 50);
      } else if (x < -tankWidth - 50) {
        dir = 1;
        mover.style.transition = 'none';
        x = -tankWidth - 50;
        setTimeout(() => { mover.style.transition = 'transform 0.3s ease-in-out'; }, 50);
      }

      // Оновлюємо позицію (перевертаємо SVG за допомогою scaleX)
      // Використовуємо translateX для руху та scaleX для напрямку
      mover.style.transform = \`translateX(\${x}px) scaleX(\${dir})\`;

      requestAnimationFrame(tick);
    }

    function shoot() {
      // Отримуємо точну позицію дула
      const rect = body.getBoundingClientRect();
      const flash = body.querySelector('.muzzle-flash');
      const proj = stage.querySelector('.projectile');

      // 1. Віддача (анімація самого танка всередині контейнера)
      if (!isRecoiling) {
        isRecoiling = true;
        body.style.transform = \`translateX(\${-dir * 15}px)\`;
        setTimeout(() => {
          body.style.transform = 'translateX(0)';
          setTimeout(() => { isRecoiling = false; }, 100);
        }, 100);
      }

      // 2. Спалах
      flash.style.left = dir === 1 ? '110px' : '30px';
      flash.style.top = '30px';
      flash.style.display = 'block';
      flash.style.opacity = '1';
      flash.style.transform = \`scaleX(\${dir})\`;
      
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => { flash.style.display = 'none'; }, 200);
      }, 50);

      // 3. Снаряд
      proj.style.display = 'block';
      proj.style.transition = 'none';
      
      const startX = dir === 1 ? rect.right : rect.left;
      const startY = rect.top + 35;
      
      proj.style.left = startX + 'px';
      proj.style.top = startY + 'px';
      
      // Летимо через весь екран за 0.4 секунди
      setTimeout(() => {
        proj.style.transition = 'left 0.4s linear, opacity 0.4s';
        const endX = dir === 1 ? stage.clientWidth + 100 : -100;
        proj.style.left = endX + 'px';
        proj.style.opacity = '0.5';
        
        setTimeout(() => {
          proj.style.display = 'none';
          proj.style.opacity = '1';
        }, 400);
      }, 20);

      // 4. Звук
      try {
        const audio = new Audio('/sfx/shot.mp3');
        audio.volume = 0.6;
        audio.play().catch(() => {});
      } catch (e) {}
    }

    // Запуск
    window.addEventListener('load', () => {
      initTank();
      // Стартова позиція (за лівим краєм екрану)
      x = -tankWidth;
      lastTime = performance.now();
      requestAnimationFrame(tick);
    });

    // Слухаємо команду пострілу
    socket.on('tank:shoot', () => {
      shoot();
    });
  <\/script>
</body>
</html>`
    });
  },

  start(ctx) {
    const log = ctx.logger('Tank');

    ctx.serverBus.on('event', (evt) => {
      if (!evt || evt.type !== 'like') return;
      
      const store = ctx.getStore('Tank', evt.user);
      const oldLikes = store.get('likes', 0);
      const newLikes = oldLikes + (evt.payload.count || 1);
      
      // Рахуємо, скільки разів перетнули межу 1000
      const oldShots = Math.floor(oldLikes / 1000);
      const newShots = Math.floor(newLikes / 1000);
      
      store.set('likes', newLikes);

      if (newShots > oldShots) {
        const shotsCount = newShots - oldShots;
        log.info(`[${evt.user}] 💥 ${newLikes} лайків! Пострілів: ${shotsCount}`);
        
        // Відправляємо подію пострілу
        for (let i = 0; i < shotsCount; i++) {
          setTimeout(() => {
            ctx.io.to(evt.user).emit('tank:shoot');
          }, i * 1000); 
        }
      }
    });

    // Скидання лічильника
    ctx.io.on('connection', (socket) => {
      const user = socket.handshake.query.user;
      if (!user) return;
      
      socket.on('tank:reset', () => {
        const store = ctx.getStore('Tank', user);
        store.set('likes', 0);
        log.info(`[${user}] Танк скинуто`);
      });
    });
  }
};