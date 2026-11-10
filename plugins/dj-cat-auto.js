// plugins/user/dj-cat-auto.js
// DJ Ginger Cat - Auto-Play Edition. Насичений синтез без зовнішніх файлів.

module.exports = {
  name: 'dj-cat-auto',
  version: '1.0.0',
  core: false,
  priority: 60,

  register(ctx) {
    ctx.registerWidget({
      type: 'dj-cat-auto',
      label: '🐱 DJ Cat (Auto-Play)',
      defaultSize: { w: 800, h: 600 },
      html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&display=swap');
  
  html, body {
    margin: 0; width: 100%; height: 100%;
    background: transparent; overflow: hidden;
    font-family: 'Orbitron', system-ui, sans-serif;
    user-select: none;
  }

  #stage {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-end;
    background: radial-gradient(circle at center, rgba(10, 0, 20, 0.9) 0%, transparent 80%);
    transition: background 0.5s;
  }
  
  #stage.fever {
    background: radial-gradient(circle at center, rgba(255, 0, 50, 0.3) 0%, transparent 80%);
  }

  /* Підлога */
  .floor {
    position: absolute; bottom: 0; left: -50%; width: 200%; height: 40%;
    background-image: 
      linear-gradient(rgba(0, 255, 255, 0.15) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 255, 255, 0.15) 1px, transparent 1px);
    background-size: 50px 50px;
    transform: perspective(600px) rotateX(65deg);
    animation: moveFloor 2s linear infinite;
    pointer-events: none;
  }
  @keyframes moveFloor {
    from { transform: perspective(600px) rotateX(65deg) translateY(0); }
    to { transform: perspective(600px) rotateX(65deg) translateY(50px); }
  }
  #stage.fever .floor {
    background-image: 
      linear-gradient(rgba(255, 50, 50, 0.4) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 50, 50, 0.4) 1px, transparent 1px);
    animation-duration: 0.5s;
  }

  /* UI */
  .ui-panel {
    position: absolute; top: 20px; padding: 15px;
    background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; backdrop-filter: blur(10px);
    color: #fff; font-family: 'Share Tech Mono', monospace;
  }
  
  #instruments { right: 20px; display: flex; flex-direction: column; gap: 8px; }
  .inst { 
    display: flex; justify-content: space-between; gap: 15px; font-size: 13px;
    padding: 4px 8px; border-radius: 4px; transition: all 0.2s;
  }
  .inst.active { background: rgba(0, 255, 255, 0.3); transform: scale(1.05); }

  #fever-box { left: 20px; width: 200px; }
  .fever-text { font-size: 12px; margin-bottom: 5px; display: flex; justify-content: space-between; }
  .fever-bar { width: 100%; height: 10px; background: #222; border-radius: 5px; overflow: hidden; }
  .fever-fill { width: 0%; height: 100%; background: linear-gradient(90deg, #0ff, #f0f); transition: width 0.2s; box-shadow: 0 0 10px #0ff; }
  #stage.fever .fever-fill { background: linear-gradient(90deg, #ff0, #f00); box-shadow: 0 0 10px #f00; }

  /* Кіт */
  .cat-wrap { position: relative; width: 300px; height: 350px; z-index: 10; margin-bottom: 20px; }
  .cat { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; height: 100%; transition: transform 0.1s; }
  .cat.bounce { animation: bounce 0.3s ease-out; }
  @keyframes bounce {
    0% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-15px); }
    100% { transform: translateX(-50%) translateY(0); }
  }
  .cat.rage { animation: rage 0.15s infinite alternate; }
  @keyframes rage {
    from { transform: translateX(-50%) rotate(-8deg) scale(1.05); }
    to { transform: translateX(-50%) rotate(8deg) scale(1.05); }
  }

  /* Частинки */
  .orb {
    position: absolute; width: 15px; height: 15px; border-radius: 50%;
    pointer-events: none; z-index: 20;
  }
  .nick { position: absolute; color: #fff; font-size: 14px; font-weight: bold; text-shadow: 0 0 10px currentColor; pointer-events: none; z-index: 30; }

  /* Еквалайзер */
  #viz { position: absolute; bottom: 0; left: 0; right: 0; height: 60px; display: flex; align-items: flex-end; gap: 3px; padding: 0 20px; opacity: 0.7; }
  .bar { flex: 1; background: linear-gradient(to top, #0ff, #f0f); border-radius: 2px 2px 0 0; transition: height 0.05s; }
</style>
</head>
<body>
  <div id="stage">
    <div class="floor"></div>

    <div class="ui-panel" id="fever-box">
      <div class="fever-text"><span>🔥 FEVER</span><span id="f-pct">0%</span></div>
      <div class="fever-bar"><div class="fever-fill" id="f-fill"></div></div>
    </div>

    <div class="ui-panel" id="instruments">
      <div class="inst" data-t="drum"><span>🥁 Барабан</span><span>1-9 💎</span></div>
      <div class="inst" data-t="guitar"><span>🎸 Гітара</span><span>10-49 💎</span></div>
      <div class="inst" data-t="bass"><span>🎸 Бас</span><span>50-199 💎</span></div>
      <div class="inst" data-t="synth"><span>🎹 Синт</span><span>200-999 💎</span></div>
      <div class="inst" data-t="epic"><span>🎺 Епік</span><span>1000+ 💎</span></div>
    </div>

    <div class="cat-wrap">
      <div class="cat" id="cat">
        <svg viewBox="0 0 300 350" width="100%" height="100%">
          <!-- Хвіст -->
          <path id="tail" d="M 220 250 Q 280 230 270 160" fill="none" stroke="#D35400" stroke-width="16" stroke-linecap="round"/>
          <!-- Тіло -->
          <ellipse cx="150" cy="240" rx="80" ry="90" fill="#E67E22"/>
          <ellipse cx="150" cy="250" rx="50" ry="70" fill="#FAD7A0"/>
          <!-- Голова -->
          <g id="head">
            <circle cx="150" cy="120" r="65" fill="#E67E22"/>
            <polygon points="95,75 85,15 125,60" fill="#E67E22" stroke="#D35400" stroke-width="4"/>
            <polygon points="205,75 215,15 175,60" fill="#E67E22" stroke="#D35400" stroke-width="4"/>
            <polygon points="98,70 92,30 118,60" fill="#F5B7B1"/>
            <polygon points="202,70 208,30 182,60" fill="#F5B7B1"/>
            <ellipse cx="150" cy="145" rx="45" ry="30" fill="#FAD7A0"/>
            <!-- Окуляри DJ -->
            <rect x="90" y="95" width="50" height="30" rx="5" fill="#111" stroke="#0ff" stroke-width="3"/>
            <rect x="160" y="95" width="50" height="30" rx="5" fill="#111" stroke="#0ff" stroke-width="3"/>
            <line x1="140" y1="110" x2="160" y2="110" stroke="#111" stroke-width="6"/>
            <circle cx="115" cy="110" r="7" fill="#0ff"/>
            <circle cx="185" cy="110" r="7" fill="#0ff"/>
            <!-- Ніс -->
            <polygon points="145,140 155,140 150,148" fill="#E74C3C"/>
          </g>
        </svg>
      </div>
      <!-- Пульт -->
      <svg viewBox="0 0 400 120" width="100%" style="position: absolute; bottom: -20px; z-index: 5;">
        <rect x="20" y="20" width="360" height="100" rx="15" fill="#1a1a1a" stroke="#f0f" stroke-width="4"/>
        <circle cx="100" cy="70" r="35" fill="#050505" stroke="#0ff" stroke-width="3"/>
        <circle cx="300" cy="70" r="35" fill="#050505" stroke="#0ff" stroke-width="3"/>
        <rect x="170" y="50" width="20" height="15" fill="#f0f" rx="3"/>
        <rect x="210" y="50" width="20" height="15" fill="#0ff" rx="3"/>
      </svg>
    </div>

    <div id="viz"></div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const user = new URLSearchParams(location.search).get('user');
    const socket = io({ query: { user } });

    // --- АУДІО СИСТЕМА (Tone.js) ---
    let kick, snare, hihat, guitar, bass, synth, epic, lead;
    let analyser;
    let autoBeat;
    let isReady = false;

    // Ініціалізація звуків з ефектами (Reverb, Delay)
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
    const delay = new Tone.FeedbackDelay("8n", 0.4).toDestination();
    delay.wet.value = 0.3;

    try {
      // Барабани
      kick = new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 4 }).connect(reverb);
      snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.2 } }).connect(reverb);
      hihat = new Tone.MetalSynth({ frequency: 400, envelope: { attack: 0.001, decay: 0.1 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).connect(reverb);
      hihat.volume.value = -15;

      // Гітара (Pluck)
      guitar = new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.9 }).connect(delay);
      
      // Бас (Mono)
      bass = new Tone.MonoSynth({ oscillator: { type: "square" }, envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.8 } }).toDestination();
      
      // Синт (FM)
      synth = new Tone.FMSynth().connect(delay);
      
      // Епік (Poly)
      epic = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.1, release: 2 } }).toDestination();
      
      // Лід для чату
      lead = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.05, release: 0.5 } }).connect(delay);

      analyser = new Tone.Analyser("waveform", 32);
      Tone.Destination.connect(analyser);

      // Фонова музика (Autoplay Loop)
      autoBeat = new Tone.Loop(time => {
        // Дуже тихий біт, який грає постійно
        if (Tone.context.state === 'running') {
          kick.triggerAttackRelease("C1", "8n", time);
          if (Math.random() > 0.5) hihat.triggerAttackRelease("32n", time + 0.5);
        }
      }, "4n").start(0);

      // Намагаємося запустити аудіо-контекст
      async function startAudio() {
        if (isReady) return;
        await Tone.start();
        Tone.Transport.start();
        isReady = true;
        console.log('[DJ Cat] Audio Context Started');
        // Робимо фон ледь чутним
        Tone.Destination.volume.value = -15;
      }

      // Автозапуск при кліку або одразу (для OBS)
      document.body.addEventListener('click', startAudio, { once: true });
      startAudio(); // Спроба одразу

    } catch(e) { console.error("Audio init error", e); }

    // --- ВІЗУАЛІЗАЦІЯ ---
    const viz = document.getElementById('viz');
    const bars = [];
    for(let i=0; i<32; i++) {
      const b = document.createElement('div'); b.className = 'bar'; b.style.height = '2px';
      viz.appendChild(b); bars.push(b);
    }
    function drawViz() {
      requestAnimationFrame(drawViz);
      if (!analyser) return;
      const vals = analyser.getValue();
      for(let i=0; i<bars.length; i++) {
        bars[i].style.height = Math.max(2, Math.abs(vals[i]) * 120) + 'px';
      }
    }
    drawViz();

    // --- АНІМАЦІЇ ТА ЕФЕКТИ ---
    const cat = document.getElementById('cat');
    const tail = document.getElementById('tail');
    const stage = document.getElementById('stage');
    const fFill = document.getElementById('f-fill');
    const fPct = document.getElementById('f-pct');
    let fever = 0;
    let inFever = false;

    // Хвіст
    let tAngle = 0, tDir = 1;
    setInterval(() => {
      tAngle += (inFever ? 15 : 3) * tDir;
      if(tAngle > 20 || tAngle < -20) tDir *= -1;
      tail.setAttribute('transform', \`rotate(\${tAngle}, 220, 250)\`);
    }, 50);

    function bounce() {
      cat.classList.remove('bounce', 'rage');
      void cat.offsetWidth;
      cat.classList.add(inFever ? 'rage' : 'bounce');
    }

    function spawnEffect(color, text, emoji) {
      const orb = document.createElement('div');
      orb.className = 'orb';
      orb.style.background = color;
      orb.style.boxShadow = \`0 0 15px \${color}\`;
      orb.textContent = emoji;
      orb.style.left = (Math.random() * 60 + 20) + '%';
      orb.style.bottom = '150px';
      document.body.appendChild(orb);

      const nick = document.createElement('div');
      nick.className = 'nick';
      nick.textContent = text;
      nick.style.color = color;
      nick.style.textShadow = \`0 0 10px \${color}\`;
      nick.style.left = orb.style.left;
      nick.style.bottom = '180px';
      document.body.appendChild(nick);

      orb.animate([{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: 'translateY(-200px) scale(1.5)', opacity: 0 }], { duration: 1000, easing: 'ease-out' }).onfinish = () => orb.remove();
      nick.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-100px)', opacity: 0 }], { duration: 1200, easing: 'ease-out' }).onfinish = () => nick.remove();
    }

    function addFever(amount) {
      if (inFever) return;
      fever = Math.min(100, fever + amount);
      fFill.style.width = fever + '%';
      fPct.textContent = Math.round(fever) + '%';

      if (fever >= 100) {
        inFever = true;
        stage.classList.add('fever');
        cat.classList.add('rage');
        Tone.Destination.volume.value = -5; // Робимо голосніше
        epic.triggerAttackRelease(["C3", "E3", "G3", "C4"], "2n");
        
        document.body.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }], { duration: 200, iterations: 10 });

        setTimeout(() => {
          inFever = false;
          fever = 0;
          stage.classList.remove('fever');
          cat.classList.remove('rage');
          fFill.style.width = '0%';
          fPct.textContent = '0%';
          Tone.Destination.volume.value = -15;
        }, 6000);
      }
    }

    // --- ОБРОБКА ПОДІЙ ---
    
    // 1. Команди чату (!note C4)
    socket.on('game:play-note', (data) => {
      if (!isReady || !lead) return;
      try { lead.triggerAttackRelease(data.note, "8n"); } catch(e){}
      spawnEffect('#0ff', data.sender, '🎵');
      bounce();
      addFever(5); // Ноти з чату дають +5% Fever
    });

    // 2. Подарунки
    socket.on('game:gift-instrument', (data) => {
      if (!isReady) return;
      const { type, sender, diamonds } = data;
      
      // Підсвічування таблиці
      document.querySelectorAll('.inst').forEach(el => el.classList.remove('active'));
      const row = document.querySelector(\`.inst[data-t="\${type}"]\`);
      if (row) { row.classList.add('active'); setTimeout(() => row.classList.remove('active'), 400); }

      addFever(diamonds / 10);
      bounce();

      if (type === 'drum' && kick) {
        kick.triggerAttackRelease("C2", "8n");
        snare.triggerAttackRelease("16n");
        spawnEffect('#ff0', sender + ' 🥁', '🥁');
      } 
      else if (type === 'guitar' && guitar) {
        guitar.triggerAttackRelease("E4", "8n");
        setTimeout(() => guitar.triggerAttackRelease("G4", "8n"), 150);
        spawnEffect('#f80', sender + ' 🎸', '🎸');
      }
      else if (type === 'bass' && bass) {
        bass.triggerAttackRelease("C2", "4n");
        spawnEffect('#f0f', sender + ' 🎸 Bass', '🎸');
      }
      else if (type === 'synth' && synth) {
        synth.triggerAttackRelease(["C4", "E4", "G4"], "4n");
        spawnEffect('#0ff', sender + ' 🎹', '🎹');
      }
      else if (type === 'epic' && epic) {
        epic.triggerAttackRelease(["C3", "E3", "G3", "C4"], "2n");
        spawnEffect('#f00', sender + ' 🎺 EPIC!', '🎺');
        document.body.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }], { duration: 300, iterations: 5 });
      }
    });

  </script>
</body>
</html>`
    });

    // --- СЕРВЕРНА ЛОГІКА ---
    ctx.serverBus.on('event', (evt) => {
      if (!evt || !evt.user) return;
      if (evt.type === 'trigger.fired') return;

      const senderName = evt.sender?.name || 'Viewer';

      // Команди чату
      if (evt.type === 'chat') {
        const comment = String(evt.payload?.comment || '').trim();
        const noteMatch = comment.match(/^!note\s+([A-G][#b]?[0-9]?)$/i);
        if (noteMatch) {
          let note = noteMatch[1].toUpperCase();
          if (!/[0-9]/.test(note)) note += '4';
          ctx.io.to(evt.user).emit('game:play-note', { note, sender: senderName });
        }
      }

      // Подарунки
      if (evt.type === 'gift') {
        if (evt.payload?.repeatEnd === false) return; 
        
        const diamonds = (evt.payload?.diamondCount || 1) * (evt.payload?.count || 1);
        
        let instType = 'drum';
        if (diamonds >= 1000) instType = 'epic';
        else if (diamonds >= 200) instType = 'synth';
        else if (diamonds >= 50) instType = 'bass';
        else if (diamonds >= 10) instType = 'guitar';

        ctx.io.to(evt.user).emit('game:gift-instrument', { 
          type: instType,
          sender: senderName,
          diamonds: diamonds
        });
      }
    });
  }
};