import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('barycenter.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) throw new Error('script not found');
let code = m[1];
code += '\nglobalThis.__T={state,Rv,at,N,T0,ST,RS,PL,planet,Rof};';

let checks = 0, fails = 0;
const ok = (name, cond, detail) => {
  checks++;
  if (!cond) { fails++; console.log('FAIL ' + name + ' :: ' + detail); }
  else console.log('ok   ' + name + ' :: ' + detail);
};

const listeners = { win: {}, el: {} };
function ctxStub() {
  const t = {};
  return new Proxy(t, {
    get(o, p) {
      if (p in o) return o[p];
      return function () {};
    },
    set(o, p, v) { o[p] = v; return true; }
  });
}
function el(id, parent) {
  const e = {
    id, style: {}, dataset: {}, children: [],
    textContent: '', className: '',
    _l: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); },
    getContext() { return ctxStub(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 190 }; },
    closest(sel) { return this.dataset && this.dataset.a ? this : null; },
    parentElement: parent || null
  };
  return e;
}

const panels = {
  c1: { clientWidth: 620, classList: { contains: c => c === 'panel' } },
  c2: { clientWidth: 620, classList: { contains: c => c === 'panel' } },
  c3: { clientWidth: 900, classList: { contains: () => false } }
};
const nodes = {};
['date','dist','surf','play','speed','speedv','chips','c1','c2','c3','sel'].forEach(id => {
  nodes[id] = el(id, panels[id] || null);
});
nodes.speed.value = '3';
const chipBtns = ['1500','1600','1800','1900','1960'].map((a, i) => {
  const b = el('chip' + i, null);
  b.dataset = { a: a, b: ['2500','1800','2200','2100','2040'][i] };
  return b;
});
nodes.chips.children = chipBtns;

let now = 0;
const rafQ = [];
const sandbox = {
  console,
  Math, JSON, Float64Array, Number, String, Array, Object, Date, isFinite, parseFloat,
  document: {
    getElementById: id => nodes[id],
    createElement: tag => el('tmp', null)
  },
  window: {
    innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
    addEventListener(t, f) { (listeners.win[t] = listeners.win[t] || []).push(f); }
  },
  performance: { now: () => now },
  requestAnimationFrame: f => { rafQ.push(f); }
};
sandbox.globalThis = sandbox;
sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;

let err = null;
try {
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { timeout: 60000 });
} catch (e) { err = e; }
ok('загрузка без исключений', !err, err ? err.message : 'ok');

function frame(n) {
  for (let i = 0; i < n; i++) {
    now += 16.7;
    const q = rafQ.splice(0, rafQ.length);
    for (const f of q) f(now);
  }
}

frame(1);
const T = sandbox.__T;
ok('экспорт состояния', !!T, T ? 'есть' : 'нет');
if (!T) process.exit(1);

frame(60);
ok('время идёт', T.state.t > T.T0 + 200 * 365.25, 't=' + T.state.t.toFixed(1));
ok('t внутри окна', T.state.t >= T.state.wa && T.state.t <= T.state.wb,
   't=' + T.state.t.toFixed(0) + ' wa=' + T.state.wa.toFixed(0) + ' wb=' + T.state.wb.toFixed(0));

let mx = 0, mn = Infinity, imx = 0, imn = 0;
for (let i = 0; i < T.N; i++) {
  if (T.Rv[i] > mx) { mx = T.Rv[i]; imx = i; }
  if (T.Rv[i] < mn) { mn = T.Rv[i]; imn = i; }
}
ok('максимум |R| совпадает с расчётом', Math.abs(mx - 1494409) < 2000, mx.toFixed(0) + ' км');
ok('минимум |R| совпадает с расчётом', Math.abs(mn - 6522) < 2000, mn.toFixed(0) + ' км');
ok('точек столько же', T.N === 36524, String(T.N));

const d = T.at(2461331.5);
const R = Math.hypot(d[0], d[1], d[2]);
ok('2026-10-18 сходится с Horizons', Math.abs(R - 781400) < 5000, Math.round(R) + ' км');

let finite = true;
for (let i = 0; i < 400; i++) {
  frame(1);
  if (!isFinite(T.state.t)) { finite = false; break; }
}
ok('400 кадров без NaN', finite, 't=' + T.state.t.toFixed(0));

const playBtn = nodes.play;
playBtn._l.click[0]({ target: playBtn });
ok('пауза переключается', T.state.play === false, 'play=' + T.state.play);
frame(30);
const tPaused = T.state.t;
frame(30);
ok('на паузе время стоит', Math.abs(T.state.t - tPaused) < 1e-6, 'dt=' + (T.state.t - tPaused).toFixed(3));
playBtn._l.click[0]({ target: playBtn });

nodes.speed.value = '9';
nodes.speed._l.input[0]();
ok('темп применяется', T.state.speed === 9, 'speed=' + T.state.speed);

const before = T.state.wb - T.state.wa;
nodes.chips._l.click[0]({ target: chipBtns[1], currentTarget: nodes.chips });
const after = T.state.wb - T.state.wa;
ok('чип меняет окно', Math.abs(before - after) > 1, 'было ' + (before / 365.25).toFixed(0) + ' лет, стало ' + (after / 365.25).toFixed(0));

nodes.c3._l.mousedown[0]({ clientX: 300 });
listeners.win.mousemove[0]({ clientX: 500 });
listeners.win.mouseup[0]({ clientX: 500 });
const zoomed = T.state.wb - T.state.wa;
ok('выделение на графике сужает окно', zoomed < after, (zoomed / 365.25).toFixed(1) + ' лет');

let crash = null;
try { frame(1500); } catch (e) { crash = e; }
ok('1500 кадров без падения', !crash, crash ? crash.message : 'ок');

const p = T.planet(T.PL[4], (T.state.t - 2451545.0) / 36525);
ok('Юпитер в разумных пределах', p.r > 4.9 && p.r < 5.5, 'r=' + p.r.toFixed(3) + ' а.е.');

console.log('\nпроверок: ' + checks + ', провалов: ' + fails);
process.exit(fails ? 1 : 0);
