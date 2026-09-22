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

  const hasCities = ['Madrid', 'Barcelona', 'Valencia'].every(n => cards.includes(n) || board.includes(n));
  const noLasPalmas = !(cards + board).includes('Las Palmas');

  console.log('cards 渲染:', cards.length, '字节, 含 Madrid/Barcelona/Valencia 卡:',
    ['Madrid', 'Barcelona', 'Valencia'].map(n => cards.includes(n) || board.includes(n)).join('/'));
  console.log('board 渲染:', board.length, '字节');
  console.log('banner:', banner.length ? '有号横幅' : '无号(隐藏)');
  console.log('白名单外省份残留:', !noLasPalmas);

  const ok = cards.length > 100 && board.length > 100 && hasCities && noLasPalmas;
  console.log(ok ? 'PASS 渲染链路正常' : 'FAIL 渲染不完整');
  process.exit(ok ? 0 : 1);
}, 800);
