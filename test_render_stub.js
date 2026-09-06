#!/usr/bin/env node
// test_render_stub.js — 用最小 DOM 桩实跑 index.html 渲染链路的回归测试.
// 背景: node --check 只查语法, 查不出作用域运行时错误 — SHOW_PROVINCES 曾误放
// renderBoard() 函数内, render() 触发 ReferenceError 整页渲染不出 (2026-09-06).
// 用法: node test_render_stub.js   (读本目录 index.html 与 d/ 最新 jsonl)
const fs = require('fs');
const path = require('path');
const here = __dirname;
const html = fs.readFileSync(path.join(here, 'index.html'), 'utf-8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

function makeEl(id) {
  return {
    id, style: {}, hidden: false, innerHTML: '', textContent: '',
    dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener() {}, onclick: null,
  };
}
const els = {};
const documentStub = {
  getElementById: id => els[id] || (els[id] = makeEl(id)),
  querySelectorAll: () => [],
  querySelector: () => null,
  body: { innerText: '' },
  documentElement: {},
  addEventListener() {},
};
// 数据桩: d/ 目录里最新的 jsonl (没有则空串, 页面走 nodata 分支)
const files = fs.readdirSync(path.join(here, 'd')).filter(f => f.endsWith('.jsonl')).sort();
const jsonl = files.length ? fs.readFileSync(path.join(here, 'd', files[files.length - 1]), 'utf-8') : '';
const fetchStub = async url => ({ ok: true, text: async () => url.includes(files[files.length - 1] || '###') ? jsonl : '' });

let topError = null;
let result = {};
try {
  const fn = new Function('document', 'fetch', 'window', 'localStorage', 'location', 'navigator',
    script);
  fn(documentStub, fetchStub, {}, { getItem: () => null, setItem() {} },
     { protocol: 'https:' }, { language: 'zh-CN' });
} catch (e) {
  topError = e;
}
setTimeout(() => {
  if (topError) { console.log('FAIL 顶层执行:', topError.message); process.exit(1); }
  const cards = els['cards'] ? els['cards'].innerHTML : '';
  const board = els['board'] ? els['board'].innerHTML : '';
  const banner = els['banner'] ? els['banner'].innerHTML : '';
  console.log('cards 渲染:', cards.length, '字节, 含 Madrid/Barcelona/Valencia 卡:',
    ['Madrid', 'Barcelona', 'Valencia'].map(n => cards.includes(n)).join('/'));
  console.log('board 渲染:', board.length, '字节');
  console.log('banner:', banner.length ? '有号横幅' : '无号(隐藏)');
  console.log('白名单外省份残留:', (cards + board).includes('Las Palmas'));
  const ok = cards.length > 100 && board.length > 100;
  console.log(ok ? 'PASS 渲染链路正常' : 'FAIL 渲染不完整');
  process.exit(ok ? 0 : 1);
}, 800);
