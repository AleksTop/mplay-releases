// plugins/user/simple-synth.js
// Музична гра: синтезатор, керований чатом та подарунками.
// Використовує Tone.js в оверлеї для генерації звуку без mp3.

module.exports = {
  name: 'simple-synth',
  core: false,
  priority: 60,

  register(ctx) {
    // ─── Віджет для OBS ───
    ctx.registerWidget({
      type: 'simple-synth',
      label: '🎹 Синтезатор (Гра)',
      defaultSize: { w: 800, h: 400 },
      html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  html, body {
    margin: 0; width: 100%; height: 100%;
    background: transparent; overflow: hidden;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  #stage {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-end;
    padding-bottom: 40px; gap: 10px;
    overflow: hidden;
  }
  .note-vis {
    position: absolute;
    bottom: 0;
    width: 40px; height: 40px;
    background: #4CAF50;
    border-radius: 50%;
    box-shadow: 0 0 20px #4CAF50;
    opacity: 0;
    pointer-events: none;
  }
  .username {
    position: absolute;
    color: white;
    font-size: 14px;
    font-weight: bold;
    text-shadow: 0 2px 4px black;
    pointer-events: none;
  }
  #keys {
    display: flex; gap: 4px;
    background: rgba(0,0,0,0.5);
    padding: 10px; border-radius: 12px;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .key {
    width: 50px; height: 150px;
    background: #fff; border-radius: 6px;
    box-shadow: inset 0 -5px 0 #ccc, 0 4px 8px rgba(0,0,0,0.5);
    transition: 0.1s;
    display: flex; align-items: flex-end; justify-content: center;
    padding-bottom: 10px; color: #888; font-weight: bold;
  }
  .key.black {
    width: 30px; height: 90px;
    background: #222; color: #666;
    box-shadow: inset 0 -5px 0 #000, 0 4px 8px rgba(0,0,0,0.8);
    margin: 0 -15px; z-index: 2;
  }
  .key.active {
    background: #4CAF50; color: white;
    box-shadow: inset 0 -2px 0 #2E7D32, 0 0 15px #4CAF50;
    transform: translateY(3px);
  }
  .key.black.active {
    background: #388E3C;
  }
</style>
</head>
<body>
  <div id="stage">
    <div id="keys">
      <div class="key" data-note="C4">C</div>
      <div class="key black" data-note="C#4">C#</div>
      <div class="key" data-note="D4">D</div>
      <div class="key black" data-note="D#4">D#</div>
      <div class="key" data-note="E4">E</div>
      <div class="key" data-note="F4">F</div>
      <div class="key black" data-note="F#4">F#</div>
      <div class="key" data-note="G4">G</div>
      <div class="key black" data-note="G#4">G#</div>
      <div class="key" data-note="A4">A</div>
      <div class="key black" data-note="A#4">A#</div>
      <div class="key" data-note="B4">B</div>
      <div class="key" data-note="C5">C5</div>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const user = new URLSearchParams(location.search).get('user');
    const socket = io({ query: { user } });
    
    // Ініціалізація синтезатора Tone.js
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 }
    }).toDestination();
    
    // Для подарунків - інший звук (більш басовий/різкий)
    const giftSynth = new Tone.MembraneSynth().toDestination();

    const keys = document.querySelectorAll('.key');
    
    // Візуалізація натискання клавіші
    function pressKey(note, color) {
      const key = document.querySelector(\`.key[data-note="\${note}"]\`);
      if (key) {
        key.classList.add('active');
        setTimeout(() => key.classList.remove('active'), 300);
      }
      
      // Створюємо візуальний ефект (ноту, що летить вгору)
      const noteEl = document.createElement('div');
      noteEl.className = 'note-vis';
      noteEl.style.left = Math.random() * 80 + 10 + '%';
      noteEl.style.background = color;
      noteEl.style.boxShadow = '0 0 20px ' + color;
      
      document.body.appendChild(noteEl);
      
      // Анімація польоту
      noteEl.animate([
        { transform: 'translateY(0) scale(1)', opacity: 1 },
        { transform: 'translateY(-300px) scale(2)', opacity: 0 }
      ], {
        duration: 800,
        easing: 'ease-out'
      }).onfinish = () => noteEl.remove();
    }

    // Подія: хтось написав !note
    socket.on('game:play-note', (data) => {
      try { synth.triggerAttackRelease(data.note, "8n"); } catch(e){}
      pressKey(data.note, '#4CAF50');
      showUsername(data.sender, '#4CAF50');
    });

    // Подія: подарунок (удар)
    socket.on('game:gift-beat', (data) => {
      giftSynth.triggerAttackRelease("C2", "8n");
      showUsername(data.sender + " 🎁", '#FF9800');
    });
    
    // Для тестування при натисканні мишкою
    keys.forEach(k => {
      k.addEventListener('mousedown', () => {
        const note = k.dataset.note;
        synth.triggerAttackRelease(note, "8n");
        pressKey(note, '#2196F3');
      });
    });

    function showUsername(name, color) {
      const el = document.createElement('div');
      el.className = 'username';
      el.textContent = name;
      el.style.color = color;
      el.style.left = Math.random() * 60 + 20 + '%';
      el.style.bottom = '180px';
      document.body.appendChild(el);
      
      el.animate([
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(-50px)', opacity: 0 }
      ], {
        duration: 1000,
        easing: 'ease-out'
      }).onfinish = () => el.remove();
    }
  </script>
</body>
</html>`
    });

    // ─── Слухаємо події сервера ───
    ctx.serverBus.on('event', (evt) => {
      if (!evt || !evt.user) return;
      if (evt.type === 'trigger.fired') return; // Ігноруємо каскади

      const senderName = evt.sender?.name || 'Viewer';

      // 1. Команда в чаті (!note C4)
      if (evt.type === 'chat') {
        const comment = String(evt.payload?.comment || '').trim();
        const match = comment.match(/^!note\s+([A-Ga-g][#b]?[0-9]?)$/);
        
        if (match) {
          // Витягуємо ноту, нормалізуємо (C# -> C#4)
          let note = match[1].toUpperCase();
          if (!/[0-9]/.test(note)) note += '4'; // Додаємо октаву за замовчуванням
          
          ctx.io.to(evt.user).emit('game:play-note', { note, sender: senderName });
        }
      }

      // 2. Подарунки (кожен подарунок — це удар барабана)
      if (evt.type === 'gift') {
        // Перевіряємо, чи це фінальна подія (щоб комбо не спамило)
        if (evt.payload?.repeatEnd === false) return;
        
        ctx.io.to(evt.user).emit('game:gift-beat', { 
          sender: senderName,
          diamonds: evt.payload.diamondCount || 1 
        });
      }
    });
  }
};