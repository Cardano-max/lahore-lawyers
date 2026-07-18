# Lahore Lawyers — Directory

A simple, beautiful, **offline** app to find lawyers of the **Lahore Bar Association (2026)** by area.
Type an area (e.g. *Model Town*, *Johar Town*, *Gulberg*) and instantly see every lawyer there —
with photo, name, phone, address, and a big **Call** button.

- **15,790 lawyers**, **15,703 photos** — the complete LBA voter directory.
- Works **100% offline** once opened (installable on iPhone & Android).
- Smart, forgiving search — typing `Shuj` finds *Shujaabad*, *Shuja Colony*, etc.
- No login, no internet needed, no ads. Just open and search.

---

## How to publish it (put it online, free)

This is a plain website (no build step). Host it free on **GitHub Pages** under your account **cardano-max**.

### Option A — GitHub Desktop (easiest, no commands)
1. Install **GitHub Desktop** → https://desktop.github.com and sign in as `cardano-max`.
2. **File → Add Local Repository…** and choose this `lawyer-app` folder.
   (If it says it isn't a repository, click **create a repository** — keep the defaults.)
3. Write a summary like "first version" and click **Commit to main**.
4. Click **Publish repository** (name it e.g. `lahore-lawyers`, keep it **Public**).
5. On github.com open the repo → **Settings → Pages** → under *Build and deployment*
   set **Source = Deploy from a branch**, **Branch = main**, **/(root)** → **Save**.
6. Wait ~1 minute. Your app is live at:
   **https://cardano-max.github.io/lahore-lawyers/**

### Option B — Git command line
```bash
cd lawyer-app
git init && git add . && git commit -m "Lahore Lawyers directory"
git branch -M main
git remote add origin https://github.com/cardano-max/lahore-lawyers.git
git push -u origin main
```
Then enable **Settings → Pages → Deploy from a branch → main → /(root)**.

> A local git repository has already been initialised and committed for you,
> so with Option B you can skip straight to `git remote add …` and `git push`.

---

## How to install on a phone
Open the live link in the phone's browser, then:
- **iPhone (Safari):** tap **Share** → **Add to Home Screen**. (The app also shows this tip.)
- **Android (Chrome):** tap the **⋮** menu → **Install app** / **Add to Home screen**.

It then opens like a normal app and works with no internet.

---

## What's inside
```
lawyer-app/
  index.html            the app page
  styles.css  app.js     design + logic
  manifest.webmanifest   makes it installable
  sw.js                  service worker (offline)
  icons/                 app icons
  data/lawyers.json      all 15,790 lawyers (2.7 MB)
  photos/                15,703 photos (~66 MB), keyed by member ID
```

## Data & privacy — please read before publishing
- The information comes from the **official LBA Voter List (2026)** and **Casting List (2026)**.
- Publishing puts **names, phone numbers, home/office addresses and photos** on the public internet.
  That is the point of a directory, but make sure you are comfortable/authorised to publish it.
- The national ID (NIC/CNIC) numbers were **deliberately left out** for privacy.
- If you want it private, you can host it behind a password (ask and this can be added).

## Updating the data later
The app just reads `data/lawyers.json` and the `photos/` folder. New yearly lists can be
re-processed into the same format and dropped in. Ask if you want the processing scripts.
