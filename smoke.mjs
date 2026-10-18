import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('barycenter.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) throw new Error('script not found');
let code = m[1];
code += '\nglobalThis.__T={state,Rv,at,N,T0,ST,RS,PL,planet,Rof,setDate,parseIn,fmtIn,setWindow,chartT,applyJump,applyTheme,PAL,getTH:()=>TH,sunTint,sunShift,jd,fmt,openModal,closeModal,resize,getSizes:()=>[W1,H1,W2,H2,W3,H3]};';

let checks = 0, fails = 0;
const ok = (name, cond, detail) => {
  checks++;
  if (!cond) { fails++; console.log('FAIL ' + name + ' :: ' + detail); }
  else console.log('ok   ' + name + ' :: ' + detail);
};

const listeners = { win: {}, el: {} };
const docL = {};
const hdrStub = { offsetHeight: 56 };
const mainStub = { style: {} };
const sideStub = { style: {}, offsetHeight: 392 };
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
    focus() {}, select() {},
    getContext() { return ctxStub(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 190 }; },
    closest(sel) { return this.dataset && this.dataset.a ? this : null; },
    parentElement: parent || null
  };
  return e;
}

const panels = {
  c1: { clientWidth: 620, style: {}, classList: { contains: c => c === 'panel' },
        get offsetHeight() {
          const c = 104 + (parseInt(nodes.c1.style.height) || 0);
          return this.style.alignSelf === 'start' ? c : Math.max(c, 480);
        } },
  c2: { clientWidth: 620, style: {}, classList: { contains: c => c === 'panel' },
        get offsetHeight() {
          const c = 96 + (parseInt(nodes.c2.style.height) || 0);
          return this.style.alignSelf === 'start' ? c : Math.max(c, 480);
        } },
  c3: { clientWidth: 900, classList: { contains: () => false } }
};
const nodes = {};
['dist','surf','play','speed','speedv','chips','c1','c2','c3','sel','jump','theme','modal','mbg','mclose','about','wrap3'].forEach(id => {
  nodes[id] = el(id, panels[id] || null);
});
nodes.speed.value = '3';
nodes.wrap3.offsetHeight = 240;
nodes.modal.hidden = true;
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
    createElement: tag => el('tmp', null),
    querySelectorAll: () => [],
    querySelector: sel => {
      if (sel === 'header') return hdrStub;
      if (sel === 'main') return mainStub;
      if (sel === '.side') return sideStub;
      return { offsetHeight: 240, style: {} };
    },
    activeElement: null,
    addEventListener(t, f) { (docL[t] = docL[t] || []).push(f); },
    documentElement: { _a:{}, setAttribute(k,v){this._a[k]=v;}, getAttribute(k){return this._a[k]||null;} }
  },
  setTimeout: (f, ms) => { f(); return 0; },
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
ok('максимум |R| совпадает с расчётом', Math.abs(mx - 1547601) < 2000, mx.toFixed(0) + ' км');
ok('минимум |R| совпадает с расчётом', Math.abs(mn - 11494) < 2000, mn.toFixed(0) + ' км');
ok('точек столько же', T.N === 60868, String(T.N));

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

const pd = () => {};
T.setWindow(T.T0 + 300 * 365.25, T.T0 + 400 * 365.25);
const t0 = T.state.t;
nodes.c3._l.mousedown[0]({ clientX: 300, shiftKey: false, preventDefault: pd });
listeners.win.mousemove[0]({ clientX: 600 });
listeners.win.mouseup[0]({ clientX: 600 });
ok('протяжка по графику меняет дату', Math.abs(T.state.t - t0) > 365 * 5,
   T.fmtIn(t0) + ' -> ' + T.fmtIn(T.state.t));
ok('дата остаётся в окне', T.state.t >= T.state.wa && T.state.t <= T.state.wb,
   T.fmtIn(T.state.t));

nodes.c3._l.mousedown[0]({ clientX: 200, shiftKey: true, preventDefault: pd });
listeners.win.mousemove[0]({ clientX: 600 });
listeners.win.mouseup[0]({ clientX: 600 });
const zoomed = T.state.wb - T.state.wa;
ok('Shift + протяжка сужает окно', zoomed < after, (zoomed / 365.25).toFixed(1) + ' лет');

ok('разбор даты 19.04.1804', T.fmtIn(T.parseIn('19.04.1804')) === '19.04.1804', T.fmtIn(T.parseIn('19.04.1804')));
ok('разбор только года', T.fmtIn(T.parseIn('1804')) === '01.01.1804', T.fmtIn(T.parseIn('1804')));
ok('разбор ISO', T.fmtIn(T.parseIn('1804-04-19')) === '19.04.1804', T.fmtIn(T.parseIn('1804-04-19')));
ok('мусор отвергается', T.parseIn('вчера') === null, String(T.parseIn('вчера')));
ok('дата до н. э. разбирается', T.fmtIn(T.parseIn('05.07.3322 до н. э.')) === '05.07.3322 до н. э.', T.fmtIn(T.parseIn('05.07.3322 до н. э.')));
ok('отрицательный год разбирается', Math.abs(T.parseIn('-3321') - T.jd(-3321,1,1)) < 0.001, T.fmtIn(T.parseIn('-3321')));
ok('эра в подписи', T.fmt(T.jd(-3321,7,5)).includes('до н. э.'), T.fmt(T.jd(-3321,7,5)));

T.setWindow(T.T0 + 400 * 365.25, T.T0 + 450 * 365.25);
nodes.jump.value = '12.03.1600';
T.applyJump();
ok('ввод даты вне окна сдвигает окно',
   T.state.t >= T.state.wa && T.state.t <= T.state.wb && Math.abs(T.state.t - T.jd(1600,3,12)) < 2,
   T.fmtIn(T.state.t) + ', окно ' + T.fmtIn(T.state.wa) + '–' + T.fmtIn(T.state.wb));

nodes.jump.value = '2400';
T.applyJump();
ok('ввод года в пределах ряда', T.fmtIn(T.state.t) === '01.01.2400', T.fmtIn(T.state.t));

let crash = null;
try { frame(1500); } catch (e) { crash = e; }
ok('1500 кадров без падения', !crash, crash ? crash.message : 'ок');

const p = T.planet(T.PL[4], (T.state.t - 2451545.0) / 36525);
ok('Юпитер в разумных пределах', p.r > 4.9 && p.r < 5.5, 'r=' + p.r.toFixed(3) + ' а.е.');

const de = sandbox.document.documentElement;
T.applyTheme();
nodes.theme._l.click[0]();
ok('переключатель уводит в тёмную', de.getAttribute('data-theme') === 'dark' && T.getTH() === T.PAL.dark,
   'data-theme=' + de.getAttribute('data-theme'));
nodes.theme._l.click[0]();
ok('переключатель возвращает светлую', de.getAttribute('data-theme') === 'light' && T.getTH() === T.PAL.light,
   'data-theme=' + de.getAttribute('data-theme'));

const c0 = T.sunTint(0).disc, c1 = T.sunTint(1).disc;
const rgb = s => s.match(/\d+/g).map(Number);
ok('при нулевом смещении диск бледный', rgb(c0)[0] > 245 && rgb(c0)[2] > 200, c0);
ok('при максимальном смещении диск красный', rgb(c1)[0] - rgb(c1)[1] > 100, c1);
const mid = rgb(T.sunTint(0.5).disc);
ok('середина шкалы — золото', Math.abs(mid[0] - 247) < 4 && Math.abs(mid[2] - 115) < 6, T.sunTint(0.5).disc);
let mono = true;
for (let i = 1; i <= 20; i++) {
  const a = rgb(T.sunTint((i - 1) / 20).disc), b = rgb(T.sunTint(i / 20).disc);
  if (b[2] > a[2] + 0.5) mono = false;
}
ok('шкала монотонна по синему', mono, 'проверено 20 шагов');
ok('sunShift нормирует на 1.6 млн', Math.abs(T.sunShift(T.jd(1804,4,19)) - 1466025/1.6e6) < 0.01,
   T.sunShift(T.jd(1804,4,19)).toFixed(3));

ok('окно теории закрыто при старте', nodes.modal.hidden === true, 'hidden=' + nodes.modal.hidden);
nodes.about._l.click[0]();
frame(1);
ok('кнопка открывает окно', nodes.modal.hidden === false && nodes.modal.classList.contains('on'), 'hidden=' + nodes.modal.hidden);
docL.keydown[0]({ key: 'Escape' });
ok('Escape закрывает окно', nodes.modal.hidden === true, 'hidden=' + nodes.modal.hidden);
nodes.about._l.click[0]();
nodes.mbg._l.click[0]();
ok('клик по фону закрывает', nodes.modal.hidden === true, 'hidden=' + nodes.modal.hidden);

nodes.jump.value = '01.01.1000';
T.applyJump();
ok('после ввода поле показывает человеческую дату', nodes.jump.value === T.fmt(T.state.t), nodes.jump.value);
nodes.jump._l.focus[0]();
ok('при фокусе поле переходит в цифровой вид', nodes.jump.value === T.fmtIn(T.state.t), nodes.jump.value);

ok('иконка встроена как data-uri', /<link rel="icon"[^>]*href="data:image\/svg\+xml,/.test(html), 'есть');
ok('логотип в шапке', /<svg class="mark"/.test(html), 'есть');
ok('внешних ссылок нет', !/https?:\/\//.test(html), 'ни одной');

ok('колонки заданы явно', /^\d+px \d+px 300px$/.test(mainStub.style.gridTemplateColumns || ''),
   mainStub.style.gridTemplateColumns);
ok('панели выровнены по высоте', nodes.c1.parentElement.style.minHeight === nodes.c2.parentElement.style.minHeight,
   nodes.c1.parentElement.style.minHeight);

sandbox.window.innerWidth = 1000; sandbox.window.innerHeight = 1400;
T.resize();
ok('узкий экран — одна колонка', /^\d+px$/.test(mainStub.style.gridTemplateColumns || ''),
   mainStub.style.gridTemplateColumns);
const [nw, nh] = T.getSizes();
ok('узкий экран — сцена квадратная', nw === nh && nw <= 560, nw + '×' + nh);
sandbox.window.innerWidth = 1440; sandbox.window.innerHeight = 900;
T.resize();

const [w1,h1,w2,h2,w3,h3] = T.getSizes();
ok('сцены квадратные', w1 === h1 && w2 === h2 && w1 > 200, w1 + '×' + h1);
ok('сцены одинаковые', w1 === w2, w1 + ' / ' + w2);
const fits = h => 30 + 56 + 12 + h + 96 + 12 + 240 <= h * 0 + 900;
ok('на 1440×900 влезает по вертикали', 30 + 56 + 12 + h1 + 104 + 12 + 240 <= 900,
   (30 + 56 + 12 + h1 + 104 + 12 + 240) + ' px из 900');

sandbox.window.innerWidth = 1920; sandbox.window.innerHeight = 1080;
T.resize();
const [fw] = T.getSizes();
ok('на 1920×1080 влезает по вертикали', 30 + 56 + 12 + fw + 104 + 12 + 240 <= 1080,
   fw + ' px сцена, итого ' + (30 + 56 + 12 + fw + 104 + 12 + 240) + ' из 1080');
ok('на FullHD сцена крупнее', fw > w1, fw + ' > ' + w1);
ok('на FullHD влезает по ширине', 2*(fw+26)+300+24 <= 1524, (2*(fw+26)+300+24) + ' из 1524');
sandbox.window.innerWidth = 1440; sandbox.window.innerHeight = 900;
T.resize();

console.log('\nпроверок: ' + checks + ', провалов: ' + fails);
process.exit(fails ? 1 : 0);
