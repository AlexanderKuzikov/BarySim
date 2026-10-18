import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('cinematic.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) throw new Error('script not found');
let code = m[1];
code += '\nglobalThis.__T={state,shotAt,proj,bary,Rof,compress,PL,planetPos,SHOTS,TOTAL,T0,N,RS,fmt,jd,initSim};';

let checks = 0, fails = 0;
const ok = (n, c, d) => { checks++; if (!c) { fails++; console.log('FAIL ' + n + ' :: ' + d); } else console.log('ok   ' + n + ' :: ' + d); };

function ctxStub() {
  const t = {};
  return new Proxy(t, {
    get(o, p) {
      if (p in o) return o[p];
      if (p === 'createRadialGradient' || p === 'createLinearGradient') return () => ({ addColorStop() {} });
      return function () {};
    },
    set(o, p, v) { o[p] = v; return true; }
  });
}
function el(id) {
  return {
    id, style: {}, dataset: {}, textContent: '', _l: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); },
    getContext() { return ctxStub(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1440, height: 900 }; }
  };
}
const nodes = {};
['stage', 'hud', 'cap', 'date', 'dist', 'prog', 'hint'].forEach(id => nodes[id] = el(id));

let now = 0;
const rafQ = [];
const sandbox = {
  console, Math, JSON, Number, String, Array, Object, Date, isFinite, parseFloat,
  document: { getElementById: id => nodes[id], createElement: () => { const c = el('tmp'); c.width = c.height = 64; return c; } },
  window: { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1, addEventListener() {} },
  performance: { now: () => now },
  requestAnimationFrame: f => rafQ.push(f),
  setTimeout: (f,ms) => 0
};
sandbox.globalThis = sandbox;

let err = null;
try { vm.createContext(sandbox); vm.runInContext(code, sandbox, { timeout: 60000 }); }
catch (e) { err = e; }
ok('загрузка без исключений', !err, err ? err.message : 'ok');
if (err) process.exit(1);

function frame(n) {
  for (let i = 0; i < n; i++) {
    now += 16.7;
    const q = rafQ.splice(0, rafQ.length);
    for (const f of q) f(now);
  }
}
const T = sandbox.__T;
frame(1);

ok('старт 1 января 1709', T.fmt(T.jd(1709,1,1)) === '1 января 1709', T.fmt(T.jd(1709,1,1)));
ok('дата читается верно для J2000', T.fmt(T.jd(2000, 1, 1)) === '1 января 2000', T.fmt(T.jd(2000, 1, 1)));

ok('сцена 1 на 3 с', T.shotAt(3).i === 0, 'i=' + T.shotAt(3).i);
ok('сцена 2 на 11 с', T.shotAt(11).i === 1, 'i=' + T.shotAt(11).i);
ok('сцена 3 на 15 с', T.shotAt(15).i === 2, 'i=' + T.shotAt(15).i);
ok('сцена 3 на 29 с', T.shotAt(29).i === 2, 'i=' + T.shotAt(29).i);

const cam0 = { yaw: 0.4, el: 1.0, dist: 5.6e6, fov: 0.8 };
const ctr = T.proj([0, 0, 0], cam0);
ok('центр проецируется в центр', Math.abs(ctr.x - 720) < 1 && Math.abs(ctr.y - 450) < 1, ctr.x.toFixed(1) + ',' + ctr.y.toFixed(1));

const far = T.proj([0, 1e6, 0], cam0);
ok('дальняя точка выше центра', far && far.y < 450, far ? far.y.toFixed(1) : 'null');
const up = T.proj([0, 0, 1e6], cam0);
ok('точка над плоскостью ближе к камере', up && up.d < ctr.d, up ? Math.round(up.d/1000) + ' < ' + Math.round(ctr.d/1000) + ' тыс. км' : 'null');
const right = T.proj([1e6, 0, 0], cam0);
ok('точка справа правее центра', right && right.x > 720, right ? right.x.toFixed(1) : 'null');

const b = T.bary(T.jd(1804, 4, 19));
ok('максимум 1804 в данных', Math.abs(Math.hypot(...b) - 1466078) < 3000, Math.round(Math.hypot(...b)) + ' км');

const camS = { yaw: 0.6, el: 56 * Math.PI / 180, dist: 5.6e6, fov: 46 * Math.PI / 180 };
const sp = T.proj([-b[0], -b[1], -b[2]], camS);
const off = Math.hypot(sp.x - 720, sp.y - 450);
ok('Солнце смещено от барицентра на экране', off > 40 && off < 450, Math.round(off) + ' px');

let crash = null;
try { frame(900); } catch (e) { crash = e; }
ok('900 кадров, сцены 1–2', !crash, crash ? crash.message : 'clock=' + T.state.clock.toFixed(2));

try { frame(600); } catch (e) { crash = e; }
ok('сцена 3 без исключений', !crash, crash ? crash.message : 'clock=' + T.state.clock.toFixed(2));

const before = T.state.clock;
T.state.clock = T.TOTAL - 0.05;
frame(20);
ok('цикл замыкается', T.state.clock < 1, 'clock=' + T.state.clock.toFixed(2) + ' (было ' + before.toFixed(1) + ')');
ok('после цикла дата около 1709', Math.abs(T.state.sim - T.jd(1709,1,1)) < 1500, T.fmt(T.state.sim));

ok('сжатие: Меркурий 0.18', Math.abs(T.compress(0.387) - 0.18) < 0.01, T.compress(0.387).toFixed(3));
ok('сжатие: Нептун 1.0', Math.abs(T.compress(30.07) - 1) < 0.01, T.compress(30.07).toFixed(3));

const pj = T.planetPos(T.PL[4], 0);
ok('Юпитер на орбите', Math.abs(Math.hypot(pj[0], pj[1]) - 5.2) < 0.6, Math.hypot(pj[0], pj[1]).toFixed(2) + ' а.е.');

let crash2 = null;
try { frame(2500); } catch (e) { crash2 = e; }
ok('2500 кадров без падения', !crash2, crash2 ? crash2.message : 'ок');

console.log('\nпроверок: ' + checks + ', провалов: ' + fails);
process.exit(fails ? 1 : 0);
