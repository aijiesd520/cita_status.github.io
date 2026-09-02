# Cita Previa 4010 Slot Monitor · Status Page

[中文](README.md) | English | [Español](README.es.md)

A community, non-profit project: passive monitoring of appointment availability for the Spanish residence-card fingerprinting procedure (4010), publishing "which province had slots, and when" for people who cannot get an appointment. This directory = the working tree of the public GitHub repository + the GitHub Pages site.

**Dashboard**: one live status card per province + one GitHub-contribution-graph-style table — 7 rows (one per day, oldest → newest top to bottom, today on the last row) × 48 cells (30 min each, 00:00→24:00). 1..6 availability hits = six shades of green from light to dark, errors red, "no slots" dark gray, "no data" light gray. Row labels are date + weekday, hour ruler at the bottom. Mobile-friendly (cells scale to the screen, tap a cell for details). All times are Madrid time; dates are always in unambiguous `MM-DD` format.

## Deployment in 5 steps (on the machine running the monitor)

0. Prerequisites: `monitor/run.py` already works (see `../HANDOFF.md`); git and Python 3 installed.

1. **Create a public GitHub repository** (e.g. `cita-status`) and enable Pages:
   repo Settings → Pages → Source: `main` branch, `/ (root)`.

2. **Turn this directory into that repository** (first time only):

   ```bash
   cd monitor/stauts_page
   git init
   git add -A
   git commit -m "status page"
   git branch -M main
   git remote add origin https://github.com/<your-user>/cita-status.git
   git push -u origin main
   ```

   Store credentials in the system credential manager (Windows: Git Credential Manager). **Never put a token into any file.**
   If git user.name/email are not configured yet: `git config --global user.name/user.email` first.

3. **Monitoring cadence**: `DELAY=300` in `monitor/.env` (the default; one round every 5 minutes, matching the 30-minute cells / six green shades).

4. **Run the pusher alongside run.py** (each round written to status.json is appended to the history and pushed):

   ```bash
   python run.py                # terminal A: the probe monitor (existing)
   python push_github.py        # terminal B: push + GitHub Pages data source
   ```

5. **Verify**: open `https://<your-user>.github.io/cita-status/`.
   First Pages build takes 1–2 minutes; afterwards each push may take up to ~10 more minutes (Pages cache).

## Local preview / color acceptance

```bash
python push_github.py --selftest   # pusher self-test
python demo.py                     # generate fake data (wipes d/!)
python -m http.server              # open http://127.0.0.1:8000
```

Demo data is fake — **delete `d/` before pushing to the public repository**.

## Notes

- A public repository = all probe data is public (by design, non-profit; make sure that is acceptable).
- 1 commit per round (5-min cadence ≈ 288/day); GitHub has no hard limit. If it ever matters, batch pushes in push_github.py (not implemented).
- Keep `PUSH_URL` in `.env` empty: pushing is handled by this directory's script; do not use both.
- For further development / migrating machines / troubleshooting: **read `HANDOFF.md` first** (agent-facing handoff document).
