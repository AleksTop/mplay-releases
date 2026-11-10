// plugins/user/rose.js
// Плагін: Троянда, що розквітає від лайків.
// 100 лайків = 1 пелюстка. 100 пелюсток = "Прийшла Весна!"

module.exports = {
  name: 'rose',
  core: false,

  register(ctx) {
    ctx.registerWidget({
      type: 'rose-widget',
      label: '🌹 Троянда (лайки)',
      defaultSize: { w: 400, h: 400 },
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
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #stage {
    position: relative;
    width: 300px;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Стебло */
  .stem {
    position: absolute;
    bottom: 0;
    width: 8px;
    height: 150px;
    background: linear-gradient(to top, #2e7d32, #4caf50);
    border-radius: 4px;
    z-index: 1;
  }
  
  /* Листя */
  .leaf {
    position: absolute;
    bottom: 80px;
    width: 40px;
    height: 20px;
    background: #4caf50;
    border-radius: 50% 0;
    transform-origin: left center;
    z-index: 1;
  }
  .leaf.left { left: 146px; transform: rotate(-30deg); }
  .leaf.right { right: 146px; transform: rotate(210deg); border-radius: 0 50%; }
  
  /* Контейнер для пелюсток */
  #petals-container {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0; height: 0;
    z-index: 2;
  }
  
  /* Сама пелюстка */
  .petal {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 26px;
    height: 38px;
    background: radial-gradient(circle at 50% 100%, #ff5252, #b71c1c);
    border-radius: 50% 50% 10% 10% / 60% 60% 40% 40%;
    box-shadow: inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2);
    opacity: 0;
    /* Анімація появи */
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s;
    will-change: transform, opacity;
  }
  
  /* Центр квітки */
  .center {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 16px; height: 16px;
    background: #ffd54f;
    border-radius: 50%;
    z-index: 3;
    box-shadow: 0 0 10px #ffca28;
  }

  /* Напис "Прийшла Весна!" */
  #spring-text {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) scale(0);
    font: 800 24px 'Segoe UI', system-ui, sans-serif;
    color: #fff;
    text-shadow: 0 0 10px #4caf50, 0 0 20px #2e7d32;
    white-space: nowrap;
    z-index: 10;
    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    background: rgba(0,0,0,0.5);
    padding: 5px 15px;
    border-radius: 20px;
  }
  #spring-text.show {
    transform: translateX(-50%) scale(1);
  }
</style>
</head>
<body>
  <div id="stage">
    <div class="stem"></div>
    <div class="leaf left"></div>
    <div class="leaf right"></div>
    <div class="center"></div>
    <div id="petals-container"></div>
    <div id="spring-text">🌸 Прийшла Весна! 🌸</div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const params = new URLSearchParams(location.search);
    const user = params.get('user');
    const widgetId = params.get('widgetId') || '';
    const container = document.getElementById('petals-container');
    const springText = document.getElementById('spring-text');
    
    let totalPetals = 0;

    function addPetal(index) {
      const el = document.createElement('div');
      el.className = 'petal';
      
      // 1. Використовуємо "Золотий кут" (137.5°) для ідеальної спіралі
      const angle = index * 137.508;
      
      // 2. Відстань від центру збільшується (sqrt для рівномірного заповнення)
      const radius = Math.sqrt(index) * 14; 
      
      // 3. Розмір пелюстки: від маленьких в центрі до великих ззовні
      const scale = 0.4 + (index / 100) * 0.8;

      // Початковий стан (згорнута в центрі)
      // translate(-50%, -50%) центрує саму пелюстку
      el.style.transform = \`translate(-50%, -50%) rotate(\${angle}deg) translateY(0px) scale(0)\`;
      
      container.appendChild(el);

      // Анімація розкриття
      setTimeout(() => {
        el.style.opacity = '1';
        // translateY(-radius) виштовхує пелюстку назовні
        el.style.transform = \`translate(-50%, -50%) rotate(\${angle}deg) translateY(-\${radius}px) scale(\${scale})\`;
      }, 20);
    }

    // Функція для повного скидання
    function resetRose() {
      container.innerHTML = '';
      totalPetals = 0;
      springText.classList.remove('show');
    }

    // Сокет
    let socket = null;
    if (user) {
      socket = io({ query: { user } });
      
      socket.on('connect', () => {
        socket.emit('rose:getState');
      });

      socket.on('rose:add-petal', (data) => {
        if (data && data.total !== undefined) {
           if (data.total > totalPetals) {
             for (let i = totalPetals; i < data.total; i++) {
               addPetal(i);
             }
             totalPetals = data.total;
           }
        } else {
           addPetal(totalPetals);
           totalPetals++;
        }
      });

      socket.on('rose:bloom', () => {
        springText.classList.add('show');
      });

      socket.on('rose:reset', () => {
        resetRose();
      });
    }

    // Обробка повідомлень від редактора (прев'ю)
    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      
      if (msg.type === 'ping') {
        try { window.parent.postMessage({ type: 'pong', widgetId }, '*'); } catch (err) {}
      }
      
      if (msg.type === 'test-fire') {
        for (let i = 0; i < 20; i++) { // Додаємо 20 пелюсток для тесту
          if (totalPetals < 100) {
            addPetal(totalPetals);
            totalPetals++;
          }
        }
        if (totalPetals >= 100) {
          springText.classList.add('show');
        }
      }
    });

    try { window.parent.postMessage({ type: 'ready', widgetId }, '*'); } catch (err) {}
  </script>
</body>
</html>`
    });
  },

  start(ctx) {
    const log = ctx.logger('rose');
    
    ctx.serverBus.on('event', (evt) => {
      if (evt.type !== 'like') return;

      const store = ctx.getStore('rose', evt.user);
      
      let likeCount = store.get('likeCount', 0) + (evt.payload.count || 1);
      store.set('likeCount', likeCount);

      let petalCount = store.get('petalCount', 0);
      const newPetals = Math.floor(likeCount / 100);

      if (newPetals > petalCount) {
        petalCount = newPetals;
        store.set('petalCount', petalCount);
        
        log.info(`[${evt.user}] ${evt.sender.name} досяг ${likeCount} лайків! Пелюсток: ${petalCount}/100`);
        
        ctx.io.to(evt.user).emit('rose:add-petal', { total: petalCount });

        if (petalCount >= 100) {
          log.info(`[${evt.user}] 🌸 Прийшла Весна! Троянда повністю розквітла!`);
          ctx.io.to(evt.user).emit('rose:bloom');
        }
      }
    });

    ctx.io.on('connection', (socket) => {
      const user = socket.handshake.query.user;
      if (!user) return;

      socket.on('rose:getState', () => {
        const store = ctx.getStore('rose', user);
        const petals = store.get('petalCount', 0);
        if (petals > 0) {
          socket.emit('rose:add-petal', { total: petals });
        }
        if (petals >= 100) {
          socket.emit('rose:bloom');
        }
      });
    });
  }
};