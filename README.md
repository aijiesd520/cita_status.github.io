# cita previa 4010 放号监控 · 状态页

中文 | [English](README.en.md) | [Español](README.es.md)

社区公益项目：对西班牙居留办卡（4010 按指纹）预约放号做被动探测，把"哪个省、什么时候出现过号"公开给约不到号的人。本目录 = GitHub 公开仓库的工作树 + GitHub Pages 站点。

**看板**：每城一张实时状态卡 + 一张 GitHub 贡献图样式的表格——7 行（每天一行，旧→新自上而下，今天在最底）× 48 格（每格 30 分钟，00:00→24:00）。有号 1..6 次 = 六档绿由浅到深，出错红，无号深灰，未采集浅灰；行首是日期+星期，底部是小时刻度；手机自适应、点按格子看详情。所有时间均为马德里时间，日期一律 `MM-DD` 格式避免歧义。

## 部署 5 步（在跑监控的电脑上）

0. 前提：`monitor/run.py` 已能跑通（见 `../HANDOFF.md`），本机装有 git 和 python3。

1. **GitHub 建一个公开仓库**（如 `cita-status`），开启 Pages：
   仓库 Settings → Pages → Source 选 `main` 分支 `/ (root)`。

2. **把本目录变成那个仓库**（首次一次）：

   ```bash
   cd monitor/stauts_page
   git init
   git add -A
   git commit -m "status page 初版"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/cita-status.git
   git push -u origin main
   ```

   凭据用系统凭据管理器（Windows: Git Credential Manager）保存，**不要把 token 写进任何文件**。
   git 用户名/邮箱没配过的话先 `git config --global user.name/user.email`。

3. **监控节奏**：`monitor/.env` 的 `DELAY=300`（默认值，即 5 分钟一轮，与页面 30 分钟格/六档绿配套）。

4. **与 run.py 同时常驻推送脚本**（监控每写一轮 status.json，它就追加一行历史并 push）：

   ```bash
   python run.py                # 窗口 A: 探针监控（现有）
   python push_github.py        # 窗口 B: 推送 + GitHub Pages 数据源
   ```

5. **验证**：浏览器打开 `https://<你的用户名>.github.io/cita-status/`。
   Pages 首次构建要 1-2 分钟；之后每次 push 最长再延迟 ~10 分钟（Pages 缓存）。

## 本地预览 / 验收配色

```bash
python push_github.py --selftest   # 推送脚本自检
python demo.py                     # 生成假数据（会清空 d/！）
python -m http.server              # 打开 http://127.0.0.1:8000
```

demo 数据是假的——**推公开仓库前删掉 `d/` 再推**。

## 说明

- 公开仓库 = 全部探测数据公开（公益目的，确认可接受再用）。
- 每轮 1 个 commit（5 分钟一轮 ≈ 288/天），GitHub 无硬性限制；若在意可在 push_github.py 里改批量推送（未实现）。
- `.env` 的 `PUSH_URL` 保持留空：推送由本目录脚本负责，二者不并用。
- 二次开发 / 换机部署 / 排错：**先读 `HANDOFF.md`**（面向 agent 的交接文档）。
