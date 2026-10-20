import pw from 'file:///C:/Users/alexa/.workbuddy-ai/binaries/node/workspace/node_modules/playwright-core/index.js';
const { chromium } = pw;
import path from 'path';

const EXE = process.env.LOCALAPPDATA + '\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const URL = 'file:///D:/GitHub/BarySim/barycenter.html';
const OUT = 'D:/GitHub/BarySim/shots';

const SIZES = [
  { name: '1920x1080', w: 1920, h: 1080 },
  { name: '1440x900',  w: 1440, h: 900 },
  { name: '1366x768',  w: 1366, h: 768 },
  { name: '1280x720',  w: 1280, h: 720 },
  { name: '1000x1400', w: 1000, h: 1400 },
  { name: '800x1200',  w: 800,  h: 1200 },
  { name: '1000x700',  w: 1000, h: 700 },
  { name: '700x1000',  w: 700,  h: 1000 },
  { name: '390x844',   w: 390,  h: 844 },
];

let checks = 0, fails = 0;
function check(name, ok, detail) {
  checks++;
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + ' :: ' + (detail ?? ''));
}

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

for (const s of SIZES) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const m = await page.evaluate(() => {
    const r = el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const q = s => document.querySelector(s);
    return {
      scrollH: document.documentElement.scrollHeight,
      scrollW: document.documentElement.scrollWidth,
      innerH: window.innerHeight,
      innerW: window.innerWidth,
      header: r(q('header')),
      main: r(q('main')),
      c1: r(q('#c1')),
      c2: r(q('#c2')),
      c3: r(q('#c3')),
      p1: r(q('main > section:nth-child(1)')),
      p2: r(q('main > section:nth-child(2)')),
      side: r(q('.side')),
      wrap3: r(q('#wrap3')),
      app: r(q('.app')),
    };
  });

  const over = m.scrollH - m.innerH;
  console.log(`\n=== ${s.name} ===`);
  console.log(`  прокрутка: scrollH ${m.scrollH} vs innerH ${m.innerH}  ${over > 0 ? 'ПЕРЕПОЛНЕНИЕ +' + over : 'ok (' + (-over) + ' запас)'}`);
  console.log(`  ширина: scrollW ${m.scrollW} vs innerW ${m.innerW} ${m.scrollW > m.innerW ? 'ГОРИЗ. СКРОЛЛ' : 'ok'}`);
  console.log(`  header ${m.header.h}px  main ${m.main.h}px  wrap3 ${m.wrap3.h}px  app ${m.app.h}px`);
  console.log(`  c1 ${m.c1.w}×${m.c1.h}  c2 ${m.c2.w}×${m.c2.h}  панели ${m.p1.w}×${m.p1.h} / ${m.p2.w}×${m.p2.h}  side ${m.side.w}×${m.side.h}`);
  console.log(`  c3 ${m.c3.w}×${m.c3.h}`);
  if (errs.length) console.log('  ОШИБКИ: ' + errs.join(' | '));

  await page.screenshot({ path: path.join(OUT, s.name + '.png'), fullPage: false });

  const isPhone = s.w <= 760;
  check(`${s.name}: нет горизонтальной прокрутки`, m.scrollW <= m.innerW, m.scrollW + ' из ' + m.innerW);
  check(`${s.name}: нет вертикальной прокрутки`, isPhone || m.scrollH <= m.innerH,
        m.scrollH + ' из ' + m.innerH + (isPhone ? ' (телефон, прокрутка допустима)' : ''));
  check(`${s.name}: сцены квадратные`, m.c1.w === m.c1.h && m.c2.w === m.c2.h, m.c1.w + '×' + m.c1.h);
  check(`${s.name}: сцены одной высоты`, isPhone || m.p1.h === m.p2.h, m.p1.h + ' / ' + m.p2.h);
  check(`${s.name}: канвас внутри панели`, m.c1.w <= m.p1.w - 20, m.c1.w + ' из ' + m.p1.w);
  if (!errs.length) check(`${s.name}: без ошибок JS`, true, '—');
  else check(`${s.name}: без ошибок JS`, false, errs.join(' | '));

  await page.close();
}

// блок чисел под датой не должен менять высоту при смене даты
for (const vp of [{ width: 1000, height: 1400 }, { width: 1920, height: 1080 }]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const seen = [];
  for (const d of ['28.05.2012', '15.12.2020', '01.01.2348', '01.01.1664']) {
    await page.fill('#jump', d);
    await page.press('#jump', 'Enter');
    await page.waitForTimeout(200);
    seen.push(await page.evaluate(() => {
      const nums = document.querySelector('.nums');
      const spans = [...nums.children];
      return {
        h: +nums.getBoundingClientRect().height.toFixed(1),
        y: Math.round(document.getElementById('play').getBoundingClientRect().y),
        clip: spans.filter(s => s.scrollWidth > s.clientWidth).length,
      };
    }));
  }
  const hs = new Set(seen.map(r => r.h));
  const ys = new Set(seen.map(r => r.y));
  check(`${vp.width}×${vp.height}: блок чисел не меняет высоту`, hs.size === 1, [...hs].join(' / '));
  check(`${vp.width}×${vp.height}: кнопка не прыгает`, ys.size === 1, [...ys].join(' / '));
  check(`${vp.width}×${vp.height}: числа не обрезаны`, seen.every(r => r.clip === 0),
        seen.reduce((a, r) => a + r.clip, 0) + ' обрезанных');
  await page.close();
}

await browser.close();
console.log('\n' + (fails ? 'ПРОВАЛОВ: ' + fails + ' из ' + checks : 'все ' + checks + ' проверок пройдены'));
process.exit(fails ? 1 : 0);
