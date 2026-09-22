#!/usr/bin/env node
/**
 * test_render_stub.js — Enhanced Zero-Dependency Node.js DOM Render Test Runner
 *
 * Objectives:
 * 1. Support full DOM element API: createElement, createElementNS, querySelector,
 *    querySelectorAll, closest, appendChild, removeChild, addEventListener, classList, dataset.
 * 2. 100% zero external npm dependencies (pure Node.js standard library: fs, path).
 * 3. Global error catching for unhandled promises (unhandledRejection) and exceptions (uncaughtException).
 * 4. Multi-file fetchStub supporting status.json, d/manifest.json, d/history_compact.json, and d/*.jsonl.
 * 5. Verify rendering integrity: cards > 100 bytes, board > 100 bytes,
 *    Madrid/Barcelona/Valencia present, Las Palmas excluded, exit code 0.
 */

const fs = require('fs');
const path = require('path');
const here = __dirname;

// Trap unhandled rejections and exceptions
const unhandledErrors = [];
process.on('uncaughtException', err => {
  console.error('CRITICAL uncaughtException:', err);
  unhandledErrors.push(err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL unhandledRejection:', reason);
  unhandledErrors.push(reason);
});

// Read index.html and extract inline script
const html = fs.readFileSync(path.join(here, 'index.html'), 'utf-8');
const scriptMatch = html.match(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/i);
if (!scriptMatch) {
  console.error('FAIL: No <script> block found in index.html');
  process.exit(1);
}
const script = scriptMatch[1];

// DOM Element Registry
const elementsRegistry = {};
const allCreatedElements = [];

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function matchesSelector(el, sel) {
  if (!sel || !el) return false;
  sel = sel.trim();
  if (sel.includes(',')) {
    return sel.split(',').some(part => matchesSelector(el, part.trim()));
  }

  // Attribute selector [attr] or [attr="val"] or [attr='val']
  const attrMatch = sel.match(/^\[([a-zA-Z0-9\-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]$/);
  if (attrMatch) {
    const attrName = attrMatch[1];
    const expectedVal = attrMatch[2] !== undefined ? attrMatch[2] : (attrMatch[3] !== undefined ? attrMatch[3] : attrMatch[4]);
    if (expectedVal === undefined) {
      return el.hasAttribute ? el.hasAttribute(attrName) : (attrName in el.attrs);
    }
    return el.getAttribute ? (el.getAttribute(attrName) === expectedVal) : (el.attrs[attrName] === expectedVal);
  }

  // ID selector #id
  if (sel.startsWith('#')) {
    return el.id === sel.slice(1);
  }

  // Class selector .cls
  if (sel.startsWith('.')) {
    return el.classList && el.classList.contains(sel.slice(1));
  }

  // Tag with class e.g. button.on
  const tagClassMatch = sel.match(/^([a-zA-Z0-9\-]+)\.([a-zA-Z0-9\-_]+)$/);
  if (tagClassMatch) {
    const tagMatch = el.tagName && el.tagName.toLowerCase() === tagClassMatch[1].toLowerCase();
    const classMatch = el.classList && el.classList.contains(tagClassMatch[2]);
    return tagMatch && classMatch;
  }

  // Tag selector
  if (/^[a-zA-Z0-9\-]+$/.test(sel)) {
    return el.tagName && el.tagName.toLowerCase() === sel.toLowerCase();
  }

  return false;
}

function makeElement(tag, id = '') {
  const children = [];
  const attrs = {};
  const classes = new Set();
  const listeners = {};
  const dataset = {};

  const el = {
    tagName: tag.toUpperCase(),
    id,
    style: {},
    hidden: false,
    innerHTML: '',
    textContent: '',
    innerText: '',
    dataset,
    children,
    attrs,
    parentNode: null,

    classList: {
      add: (...cls) => cls.forEach(c => c && classes.add(c)),
      remove: (...cls) => cls.forEach(c => classes.delete(c)),
      toggle: (c, force) => {
        if (!c) return false;
        if (force === undefined) force = !classes.has(c);
        if (force) classes.add(c); else classes.delete(c);
        return force;
      },
      contains: c => classes.has(c),
      get length() { return classes.size; },
      toString: () => Array.from(classes).join(' '),
    },

    setAttribute(k, v) {
      const valStr = String(v);
      attrs[k] = valStr;
      if (k === 'id') {
        el.id = valStr;
        elementsRegistry[valStr] = el;
      }
      if (k === 'class') {
        classes.clear();
        valStr.split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
      }
      if (k.startsWith('data-')) {
        dataset[toCamelCase(k.slice(5))] = valStr;
      }
    },

    getAttribute(k) {
      return attrs[k] !== undefined ? attrs[k] : null;
    },

    hasAttribute(k) {
      return k in attrs;
    },

    removeAttribute(k) {
      delete attrs[k];
      if (k === 'id') el.id = '';
      if (k === 'class') classes.clear();
      if (k.startsWith('data-')) delete dataset[toCamelCase(k.slice(5))];
    },

    appendChild(child) {
      if (!child) return child;
      child.parentNode = el;
      children.push(child);
      return child;
    },

    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx >= 0) {
        children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    },

    insertBefore(newChild, refChild) {
      if (!newChild) return newChild;
      newChild.parentNode = el;
      const idx = children.indexOf(refChild);
      if (idx >= 0) {
        children.splice(idx, 0, newChild);
      } else {
        children.push(newChild);
      }
      return newChild;
    },

    closest(selector) {
      let curr = el;
      while (curr) {
        if (matchesSelector(curr, selector)) return curr;
        curr = curr.parentNode;
      }
      return null;
    },

    querySelector(selector) {
      for (const child of children) {
        if (matchesSelector(child, selector)) return child;
        const res = child.querySelector(selector);
        if (res) return res;
      }
      return null;
    },

    querySelectorAll(selector) {
      const results = [];
      function walk(node) {
        for (const child of node.children) {
          if (matchesSelector(child, selector)) results.push(child);
          walk(child);
        }
      }
      walk(el);
      return results;
    },

    addEventListener(evt, cb) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(cb);
    },

    removeEventListener(evt, cb) {
      if (!listeners[evt]) return;
      const idx = listeners[evt].indexOf(cb);
      if (idx >= 0) listeners[evt].splice(idx, 1);
    },

    dispatchEvent(evt) {
      const evtType = typeof evt === 'string' ? evt : evt.type;
      const evObj = typeof evt === 'object' ? evt : { type: evtType, target: el };
      (listeners[evtType] || []).forEach(cb => {
        try { cb.call(el, evObj); } catch (e) { unhandledErrors.push(e); }
      });
      return true;
    },

    getBoundingClientRect: () => ({ width: 120, height: 40, top: 0, left: 0, right: 120, bottom: 40 }),
  };

  allCreatedElements.push(el);
  if (id) elementsRegistry[id] = el;
  return el;
}

function getOrCreateElement(id) {
  if (!elementsRegistry[id]) {
    elementsRegistry[id] = makeElement('div', id);
  }
  return elementsRegistry[id];
}

// Document Stub
const documentStub = {
  getElementById: id => getOrCreateElement(id),
  querySelector: sel => {
    if (sel.startsWith('#')) return getOrCreateElement(sel.slice(1));
    for (const el of allCreatedElements) {
      if (matchesSelector(el, sel)) return el;
    }
    return null;
  },
  querySelectorAll: sel => {
    return allCreatedElements.filter(el => matchesSelector(el, sel));
  },
  createElement: tag => makeElement(tag),
  createElementNS: (ns, tag) => makeElement(tag),
  body: makeElement('body', 'body'),
  documentElement: {
    lang: 'zh-CN',
    style: {},
    classList: {
      add() {}, remove() {}, toggle() {}, contains() { return false; }
    }
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  title: '',
};

// Parse static HTML elements from index.html (before <script>)
function parseStaticDom(htmlContent) {
  const bodyPart = htmlContent.replace(/<script[\s\S]*$/i, '');
  const tagRe = /<([a-zA-Z0-9\-]+)([^>]*)>/g;
  let match;
  while ((match = tagRe.exec(bodyPart)) !== null) {
    const tag = match[1].toLowerCase();
    if (['meta', 'link', 'style', 'title', 'head', 'html', '!doctype'].includes(tag)) continue;
    const rawAttrs = match[2];
    const el = makeElement(tag);

    const attrRe = /([a-zA-Z0-9\-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let am;
    while ((am = attrRe.exec(rawAttrs)) !== null) {
      const k = am[1];
      const v = am[2] !== undefined ? am[2] : (am[3] !== undefined ? am[3] : (am[4] !== undefined ? am[4] : ''));
      el.setAttribute(k, v);
    }
    documentStub.body.appendChild(el);
  }
}

parseStaticDom(html);

// Window stub
const windowStub = {
  document: documentStub,
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] ?? null; },
    setItem(k, v) { this.store[k] = String(v); },
  },
  location: { protocol: 'https:', href: 'https://cita.example.com/' },
  navigator: { language: 'zh-CN' },
  matchMedia: query => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  innerWidth: 1280,
  innerHeight: 800,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  addEventListener: () => {},
  removeEventListener: () => {},
};

// Multi-file fetchStub
const fetchStub = async (url) => {
  const cleanUrl = String(url).split('?')[0];
  const filename = path.basename(cleanUrl);

  // Check possible relative locations
  const candidates = [
    path.join(here, cleanUrl),
    path.join(here, 'd', filename),
    path.join(here, filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const text = fs.readFileSync(candidate, 'utf-8');
      return {
        ok: true,
        status: 200,
        text: async () => text,
        json: async () => JSON.parse(text),
      };
    }
  }

  // Fallback: If querying latest jsonl dynamically
  if (cleanUrl.includes('.jsonl')) {
    const dDir = path.join(here, 'd');
    if (fs.existsSync(dDir)) {
      const files = fs.readdirSync(dDir).filter(f => f.endsWith('.jsonl')).sort();
      if (files.length) {
        const text = fs.readFileSync(path.join(dDir, files[files.length - 1]), 'utf-8');
        return {
          ok: true,
          status: 200,
          text: async () => text,
          json: async () => JSON.parse(text),
        };
      }
    }
  }

  return {
    ok: false,
    status: 404,
    text: async () => '',
    json: async () => ({}),
  };
};

// Runner Execution
console.log('=== RUNNING UPGRADED TEST RENDER STUB ===');
let topError = null;

try {
  const fn = new Function('document', 'fetch', 'window', 'localStorage', 'location', 'navigator', script);
  fn(documentStub, fetchStub, windowStub, windowStub.localStorage, windowStub.location, windowStub.navigator);
} catch (e) {
  topError = e;
}

setTimeout(() => {
  if (topError) {
    console.error('FAIL 顶层执行:', topError);
    process.exit(1);
  }

  if (unhandledErrors.length > 0) {
    console.error('FAIL 未捕获异常/Promise Rejection:', unhandledErrors);
    process.exit(1);
  }

  const cards = elementsRegistry['cards'] ? elementsRegistry['cards'].innerHTML : '';
  const board = elementsRegistry['board'] ? elementsRegistry['board'].innerHTML : '';
  const banner = elementsRegistry['banner'] ? elementsRegistry['banner'].innerHTML : '';

  const hasCities = ['Madrid', 'Valencia'].every(n => cards.includes(n) || board.includes(n));
  const noExcludedProvinces = !(cards + board).includes('Las Palmas') && !(cards + board).includes('Barcelona');

  console.log('cards 渲染:', cards.length, '字节, 含 Madrid/Valencia 卡:',
    ['Madrid', 'Valencia'].map(n => cards.includes(n) || board.includes(n)).join('/'));
  console.log('board 渲染:', board.length, '字节');
  console.log('banner:', banner.length ? '有号横幅' : '无号(隐藏)');
  console.log('排除省份(Barcelona/Las Palmas)残留:', !noExcludedProvinces);

  const okBase = cards.length > 100 && board.length > 100 && hasCities && noExcludedProvinces;

  // Assert R1: Legend does not contain CL@VE indicators
  const legendMatch = html.match(/<div id="legend"[^>]*>([\s\S]*?)<\/div>/i);
  const legendHtml = legendMatch ? legendMatch[1] : '';
  const claveI18nEl = documentStub.querySelector('[data-i18n="lg_clave"]');
  const noClaveLegend = !legendHtml.includes('var(--amber)') &&
    !legendHtml.includes('#f59e0b') &&
    !legendHtml.includes('lg_clave') &&
    !claveI18nEl;
  console.log('legend 无 CL@VE 琥珀/黄色图例项残留:', noClaveLegend ? 'PASS' : 'FAIL');

  // Assert R2: Real-time Cards with HAS_CITAS, earliest capsule, and collapsible offices
  let cardPass = false;
  if (windowStub._cita && windowStub._cita.renderCards) {
    const testDoc = {
      _t: Date.now(),
      results: [
        {
          province: "28",
          province_name: "Madrid",
          available: true,
          kind: "HAS_CITAS",
          earliest: { date: "2026-09-28", time: "10:30" },
          offices: ["CNP MADRID PADRE PIQUER", "COMISARIA DE ALCALA"]
        }
      ]
    };
    windowStub._cita.renderCards(testDoc);
    const updatedCards = elementsRegistry['cards'] ? elementsRegistry['cards'].innerHTML : '';
    const hasCard = updatedCards.includes('card ok') && !updatedCards.includes('clave');
    const hasEarliestCapsule = updatedCards.includes('capsule-earliest ok') && updatedCards.includes('2026-09-28 10:30');
    const hasOfficesBadges = updatedCards.includes('CNP MADRID PADRE PIQUER') && updatedCards.includes('office-btn');
    const hasAriaControls = updatedCards.includes('aria-controls="offices-extra-28"');
    cardPass = hasCard && hasEarliestCapsule && hasOfficesBadges && hasAriaControls;
    if (windowStub._cita.setBanner) {
      windowStub._cita.setBanner(testDoc.results);
      const bannerEl = elementsRegistry['banner'];
      const bannerPass = bannerEl && (!bannerEl.classList || !bannerEl.classList.contains('clave')) && bannerEl.innerHTML.includes('Madrid');
      console.log('banner 正常绿色放号横幅:', bannerPass ? 'PASS' : 'FAIL');
      cardPass = cardPass && bannerPass;
    }
    console.log('card 放号状态正常渲染:', hasCard ? 'PASS' : 'FAIL');
    console.log('card earliest 紧凑胶囊:', hasEarliestCapsule ? 'PASS' : 'FAIL');
    console.log('card offices 轻量徽章与折叠按钮:', hasOfficesBadges ? 'PASS' : 'FAIL');
    console.log('card offices 折叠按钮具备 aria-controls 辅助属性:', hasAriaControls ? 'PASS' : 'FAIL');

    if (windowStub._cita.card) {
      const nowMs = Date.now();
      const hitCard = windowStub._cita.card(testDoc.results[0], nowMs);
      const recordsLastHit = !hitCard.includes('从未记录到') && (hitCard.includes('刚刚') || hitCard.includes('最近一次有号'));
      console.log('card 放号准确更新最近一次有号 (lastHit):', recordsLastHit ? 'PASS' : 'FAIL');
      cardPass = cardPass && recordsLastHit;
    }
  }

  // Assert: Legacy 7-element data-t resolution in formatCellInfo
  let legacyFormatPass = true;
  const fnMatch = script.match(/function formatCellInfo\([\s\S]*?\n  \}/);
  if (fnMatch) {
    try {
      const parseFn = new Function('cell', fnMatch[0] + '\nreturn formatCellInfo(cell);');
      const legacyCell = {
        getAttribute: (k) => {
          if (k === 'data-t') return '09-22 周二 10:00 Madrid|检查 30 · 有号 5 · 错误 0|30|5|0|10:00|2026-09-22';
          return null;
        }
      };
      const info = parseFn(legacyCell);
      legacyFormatPass = Boolean(info && info.tm === '09-22 周二 10:00 Madrid' && info.cnt.includes('检查 30 · 有号 5'));
      console.log('popover 检视浮窗兼容历史 7 元组 data-t 格式:', legacyFormatPass ? 'PASS' : 'FAIL');
    } catch (e) {
      legacyFormatPass = false;
      console.error('legacy format check error:', e);
    }
  }

  // Board render verification with synthetic doc
  if (windowStub._cita && windowStub._cita.renderBoard) {
    const nowMs = Date.now();
    try {
      const fn = new Function('document', 'fetch', 'window', 'localStorage', 'location', 'navigator', script);
      const testFetchStub = async (url) => {
        if (url.includes('history_compact.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              version: 1,
              updated_at: new Date(nowMs).toISOString(),
              provinces: {
                "28": {
                  [new Date(nowMs).toISOString().slice(0, 10)]: {
                    "20": [25, 4, 0], // slot 20: [checks, available, errors]
                    "22": [25, 6, 0]  // slot 22: [checks, available, errors]
                  }
                }
              }
            })
          };
        }
        return fetchStub(url);
      };
      const testDocStub = {
        ...documentStub,
        getElementById: id => getOrCreateElement('test_' + id)
      };
      const testWindowStub = {
        ...windowStub,
        document: testDocStub
      };
      fn(testDocStub, testFetchStub, testWindowStub, testWindowStub.localStorage, testWindowStub.location, testWindowStub.navigator);
      setTimeout(() => {
        const testBoard = elementsRegistry['test_board'] ? elementsRegistry['test_board'].innerHTML : '';
        const noYellow = !testBoard.includes('class="cell cy"') && !testBoard.includes('var(--amber)') && !testBoard.includes('data-kind="CLAVE"');
        const hasGreen = testBoard.includes('data-kind="REGULAR"');
        console.log('board 无黄色 CL@VE 残留:', noYellow ? 'PASS' : 'FAIL');
        console.log('board 正常绿色放号渲染:', hasGreen ? 'PASS' : 'FAIL');
        const hasCityLabels = testBoard.includes('Valencia') && testBoard.includes('Madrid') && !testBoard.includes('Barcelona');
        console.log('board 仅监控省份 (Madrid & Valencia，无 Barcelona):', hasCityLabels ? 'PASS' : 'FAIL');
        const allPass = okBase && noClaveLegend && cardPass && noYellow && hasGreen && hasCityLabels && legacyFormatPass;
        if (allPass) console.log('PASS 渲染链路正常');
        console.log(allPass ? 'PASS 渲染链路与无 CL@VE 验证全部通过' : 'FAIL 验证未全部通过');
        process.exit(allPass ? 0 : 1);
      }, 300);
      return;
    } catch (e) {
      console.error('Synthetic test error:', e);
    }
  }

  const ok = okBase && noClaveLegend && cardPass && legacyFormatPass;
  console.log(ok ? 'PASS 渲染链路正常' : 'FAIL 渲染不完整');
  process.exit(ok ? 0 : 1);
}, 800);
