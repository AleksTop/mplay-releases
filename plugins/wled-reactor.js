// ═══════════════════════════════════════════════════════════════════
// WLED Reactor — реагує на події TikTok кольором на WLED-стрічці.
// HTTP JSON API, без зовнішніх npm-залежностей.
//
// КОНФІГ: _plugin_store/wled-reactor.json (per-profile, auto-seeded)
//         У _v3.json НІЧОГО не пишеться — плагін автономний.
//
// ШВИДКИЙ СТАРТ:
//   1. Імпортувати в адмінці → Плагіни → Увімкнути → Reload
//   2. Відкрити %APPDATA%\mplay\data\profiles\<profile>\_plugin_store\wled-reactor.json
//   3. Змінити "ip": "..." на IP контролера
//   4. Reload plugins (або рестарт сервера)
//   5. Тест: Плагіни → wled-reactor → Test → gift
//
// Якщо плагін видалити — конфіг можна прибрати через
// POST /api/plugins/wled-reactor/store/clear у адмінці.
// ═══════════════════════════════════════════════════════════════════

const http = require('http');

const PLUGIN_NAME = 'wled-reactor';

// ═══════════════════════════════════════════════════════════════════
// CONFIG — тільки дефолти для першого запуску.
// Користувач редагує _plugin_store/wled-reactor.json (не код).
// ═══════════════════════════════════════════════════════════════════
const CONFIG = {
  enabled: true,
  ip: '',                     // ⚠️ порожній → плагін чекає налаштування
  port: 80,

  brightness: 200,
  flashMinIntervalMs: 150,
  offlineCooldownMs: 30000,

  events: {
    gift:   { color: [255,   0, 120], flashMs: 1200, minDiamonds: 1 },
    follow: { color: [  0, 180, 255], flashMs: 1000 },
    join:   { color: [ 80, 255,  80], flashMs: 800  },
    like:   { color: [255, 255, 255], flashMs: 300,  cooldownMs: 1000 },
    share:  { color: [200,  80, 255], flashMs: 1000 },
    emote:  { color: [255, 255,  80], flashMs: 600  }
  },

  bigGiftThreshold: 500,
  bigGiftFx: 9,
  bigGiftFxMs: 3000
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function mergeCfg(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return clone(base);
  const out = clone(base);
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    if (v && typeof v === 'object' && !Array.isArray(v)
        && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = mergeCfg(out[k], v);
    } else {
      out[k] = clone(v);
    }
  }
  return out;
}

module.exports = {
  name: PLUGIN_NAME,
  core: false,
  priority: 60,

  register(ctx) {
    const log = ctx.logger(PLUGIN_NAME);
    const runtime = new Map();

    // 🔴 НОВЕ: Реєстрація схеми налаштувань для UI
    ctx.registerSettings({
      ip: { type: 'text', label: 'IP-адреса контролера WLED', default: '', required: true },
      port: { type: 'number', label: 'Порт', default: 80, min: 1, max: 65535 },
      brightness: { type: 'number', label: 'Яскравість (0-255)', default: 200, min: 0, max: 255 },
      flashMinIntervalMs: { type: 'number', label: 'Мін. інтервал між запитами (мс)', default: 150 },
      offlineCooldownMs: { type: 'number', label: 'Пауза при офлайні (мс)', default: 30000 }
    });

    function getRt(user) {
      if (!runtime.has(user)) {
        runtime.set(user, {
          lastRequestAt: 0,
          lastFlashByType: {},
          offlineUntil: 0,
          consecutiveFails: 0,
          baseState: null,       // ← тільки в пам'яті
          flashTimer: null,
          lastError: ''
        });
      }
      return runtime.get(user);
    }

    // ─── Конфіг: тільки _plugin_store, з авто-сідом ───
    function getStore(user) {
      try { return ctx.getStore(PLUGIN_NAME, user); }
      catch (e) { return null; }
    }

    function getCfg(user) {
      const store = getStore(user);
      if (!store) return clone(CONFIG);
      let saved = store.get('cfg', null);
      if (!saved || typeof saved !== 'object') {
        // Перший запуск — засіваємо дефолтами, щоб користувач міг редагувати файл
        saved = clone(CONFIG);
        try { store.set('cfg', saved); } catch (e) {}
      }
      return mergeCfg(CONFIG, saved);
    }

    function saveCfg(user, cfg) {
      const store = getStore(user);
      if (!store) return false;
      try { store.set('cfg', cfg); return true; }
      catch (e) { return false; }
    }

    // ─── Низькорівневий HTTP ───
    function httpRequest(user, method, path, body) {
      return new Promise((resolve, reject) => {
        const cfg = getCfg(user);
        const rt = getRt(user);
        if (rt.offlineUntil > Date.now()) {
          return reject(new Error('offline-cooldown'));
        }
        if (!cfg.ip) return reject(new Error('no-ip-configured'));

        const data = body ? JSON.stringify(body) : null;
        const req = http.request({
          host: cfg.ip,
          port: cfg.port || 80,
          path,
          method,
          timeout: 1500,
          headers: data ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          } : {}
        }, (res) => {
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => {
            try {
              const text = Buffer.concat(chunks).toString('utf8');
              resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null });
            } catch (e) {
              resolve({ status: res.statusCode, body: null });
            }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('timeout')));
        if (data) req.write(data);
        req.end();
      });
    }

    // ─── Базовий стан: тільки в пам'яті, перечитуємо при рестарті ───
    async function fetchBaseState(user, force) {
      const rt = getRt(user);
      if (!force && rt.baseState) return rt.baseState;

      const cfg = getCfg(user);
      try {
        const r = await httpRequest(user, 'GET', '/json/state', null);
        if (r.status === 200 && r.body) {
          rt.baseState = {
            on: r.body.on !== false,
            bri: typeof r.body.bri === 'number' ? r.body.bri : cfg.brightness,
            seg: (r.body.seg || []).map(s => ({
              id: s.id,
              col: s.col,
              fx: s.fx,
              on: s.on !== false
            }))
          };
          log.info(`[${user}] 📸 WLED base state (${rt.baseState.seg.length} сегм.)`);
          return rt.baseState;
        }
      } catch (e) { /* fallback нижче */ }

      rt.baseState = {
        on: true,
        bri: cfg.brightness,
        seg: [{ id: 0, col: [[255, 200, 0]], on: true }]
      };
      return rt.baseState;
    }

    // ─── Rate limit + circuit breaker ───
    function canSend(user) {
      const cfg = getCfg(user);
      const rt = getRt(user);
      const now = Date.now();
      if (rt.offlineUntil > now) return false;
      if (now - rt.lastRequestAt < cfg.flashMinIntervalMs) return false;
      return true;
    }

    async function postState(user, patch) {
      if (!canSend(user)) return false;
      const rt = getRt(user);
      rt.lastRequestAt = Date.now();
      try {
        const r = await httpRequest(user, 'POST', '/json/state', patch);
        if (r.status !== 200) throw new Error('HTTP ' + r.status);
        if (rt.consecutiveFails > 0) {
          log.info(`[${user}] ✅ WLED знову онлайн`);
          rt.consecutiveFails = 0;
          rt.lastError = '';
        }
        return true;
      } catch (e) {
        rt.consecutiveFails++;
        rt.lastError = e.message;
        if (rt.consecutiveFails === 3) {
          const cfg = getCfg(user);
          rt.offlineUntil = Date.now() + cfg.offlineCooldownMs;
          log.warn(`[${user}] ⚠️ WLED недоступний (${e.message}) — пауза ${Math.round(cfg.offlineCooldownMs/1000)}с`);
        }
        return false;
      }
    }

    // ─── Спалах ───
    async function flash(user, color, flashMs, opts) {
      opts = opts || {};
      const cfg = getCfg(user);
      const rt = getRt(user);
      const base = await fetchBaseState(user);
      const bri = typeof opts.bri === 'number' ? opts.bri : cfg.brightness;

      let seg;
      if (opts.segOverride) {
        seg = opts.segOverride;
      } else {
        seg = (base.seg && base.seg.length ? base.seg : [{ id: 0 }]).map(s => ({
          ...s,
          on: true,
          col: [color],
          fx: 0
        }));
      }

      const ok = await postState(user, { on: true, bri, seg });
      if (!ok) return false;

      if (rt.flashTimer) clearTimeout(rt.flashTimer);
      rt.flashTimer = setTimeout(async () => {
        rt.flashTimer = null;
        try {
          await postState(user, {
            on: base.on,
            bri: base.bri,
            seg: base.seg && base.seg.length
              ? base.seg
              : [{ col: [[255, 200, 0]], on: true }]
          });
        } catch (e) { /* ignore */ }
      }, Math.max(200, flashMs || 1000));

      return true;
    }

    // ─── Події ───
    async function handleEvent(evt) {
      if (!evt || !evt.user) return;
      const user = evt.user;
      const cfg = getCfg(user);
      if (!cfg.enabled) return;
      if (!cfg.ip) return;   // не налаштовано — тихо

      const t = evt.type;
      const ev = cfg.events && cfg.events[t];
      if (!ev) return;

      const isTest = !!(evt.sender && evt.sender.uid === 'test_uid');

      if (ev.cooldownMs && !isTest) {
        const rt = getRt(user);
        const last = rt.lastFlashByType[t] || 0;
        if (Date.now() - last < ev.cooldownMs) return;
        rt.lastFlashByType[t] = Date.now();
      }

      if (t === 'gift') {
        const diamonds = (evt.payload?.diamondCount || 1) * (evt.payload?.count || 1);
        if (!isTest && diamonds < (ev.minDiamonds || 1)) return;

        if (!isTest && diamonds >= cfg.bigGiftThreshold) {
          const base = await fetchBaseState(user);
          const seg = (base.seg && base.seg.length ? base.seg : [{ id: 0 }]).map(s => ({
            ...s, on: true, fx: cfg.bigGiftFx, sx: 128, ix: 128
          }));
          const ok = await flash(user, [255, 0, 0], cfg.bigGiftFxMs, {
            bri: 255,
            segOverride: seg
          });
          if (ok) log.info(`[${user}] 🌈 big gift ${diamonds}💎 → fx=${cfg.bigGiftFx}`);
          return;
        }

        const bri = isTest
          ? 220
          : Math.min(255, Math.max(80, 80 + diamonds * 4));
        const flashMs = isTest ? 2000 : ev.flashMs;
        await flash(user, ev.color, flashMs, { bri });
        if (isTest) log.info(`[${user}] 🧪 test gift → ${ev.color.join(',')}`);
        return;
      }

      const flashMs = isTest ? 2000 : ev.flashMs;
      await flash(user, ev.color, flashMs);
      if (isTest) log.info(`[${user}] 🧪 test ${t} → ${ev.color.join(',')}`);
    }

    ctx.serverBus.on('event', (evt) => {
      if (!evt || evt.type === 'trigger.fired') return;
      handleEvent(evt).catch(e => log.warn(`[${evt.user}] ${e.message}`));
    });

    // ─── Сервіс ───
    try {
      if (typeof ctx.registerService === 'function') {
        ctx.registerService(PLUGIN_NAME, {
          getCfg,
          saveCfg,
          flash,
          warmup: async (user) => { await fetchBaseState(user, true); return true; },
          resetConfig: (user) => {
            const store = getStore(user);
            if (!store) return false;
            store.set('cfg', clone(CONFIG));
            return true;
          },
          getRuntime: (user) => {
            const rt = getRt(user);
            return {
              offlineUntil: rt.offlineUntil,
              consecutiveFails: rt.consecutiveFails,
              lastError: rt.lastError,
              baseState: rt.baseState
            };
          }
        });
      }
    } catch (e) { log.warn('registerService: ' + e.message); }

    log.info(`💡 WLED reactor готовий (${Object.keys(CONFIG.events).length} подій, конфіг у _plugin_store)`);
  },

  start(ctx) {
    const log = ctx.logger(PLUGIN_NAME);
    try {
      const storage = ctx.getService('storage');
      const svc = ctx.getService(PLUGIN_NAME);
      if (!storage || !svc) return;
      const active = typeof storage.getActiveUser === 'function'
        ? storage.getActiveUser() : null;
      if (!active) { log.info('💡 WLED: активний профіль не вибрано'); return; }

      const cfg = svc.getCfg(active);
      if (!cfg.ip) {
        log.warn(`💡 WLED: IP не налаштовано. Відкрий _plugin_store/wled-reactor.json у профілі "${active}" і постав "ip": "192.168.x.x", потім Reload plugins.`);
        return;
      }
      log.info(`💡 WLED для "${active}": ${cfg.ip}:${cfg.port}`);
      svc.warmup(active).catch(e => log.warn('warmup: ' + e.message));
    } catch (e) { log.warn('start: ' + e.message); }
  }
};