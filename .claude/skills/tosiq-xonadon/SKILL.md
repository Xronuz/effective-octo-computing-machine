---
name: tosiq-xonadon
description: Xavfsiz Xonadon loyihasiga xos to'siqlar — Docker/PostGIS/simulyator holati, backend va mobil ilovani tekshira olish-olmaslik. Shu loyihada "nega sekin ishlayapsan", "nima kerak sizga", "muhitni tekshir" so'ralganda ishlatiladi. Umumiy (loyihadan tashqari) tahlil uchun global `tosiq` skilliga qarang.
---

# To'siq hisoboti — Xavfsiz Xonadon

Bu skill **shu loyihaga xos** muhit muammolarini aniqlaydi.
Umumiy ish-jarayoni tahlili (sessiyalar bo'yicha statistika, ruxsatlar,
brauzer paneli) — global **`tosiq`** skillida. Ikkalasi bir-birini to'ldiradi:
avval global `tosiq`, keyin shu yerdagi loyiha tekshiruvlari.

Barcha yo'llar loyiha ildiziga nisbatan:
`/Users/xronuz/Desktop/Xagent AI/workspace/xavfsiz-xonadon`

## 1. Diagnostikani ishga tushiring

```bash
bash .claude/skills/tosiq-xonadon/doctor.sh
```

Mashina o'qishi uchun (bir necha bandni filtrlash kerak bo'lsa):

```bash
bash .claude/skills/tosiq-xonadon/doctor.sh --json
```

Skript **hech nimani o'zgartirmaydi** va parollarni chop etmaydi. `.env` ni faqat
bazaga ulanish uchun o'qiydi. ~3 soniya ishlaydi.

Har bir band uchta belgidan biri bilan chiqadi:

| Belgi | Ma'nosi |
|---|---|
| `[OK]` | muammo yo'q |
| `[CLAUDE]` | Claude o'zi hal qiladi — foydalanuvchiga aytish shart emas |
| `[SIZ]` | faqat foydalanuvchi hal qila oladi (GUI ilova, parol, brew, Xcode) |

## 2. Qachon chaqirish kerak

Chaqiring:

- Foydalanuvchi "nega sekin ishlayapsan", "nima kerak sizga", "nega ko'p token
  ketyapti" deb so'raganda.
- Vazifa **bajarilmaydigan** holatga tushganda (masalan: mobil ekranni ko'rish
  kerak, lekin simulyator yo'q).
- Sessiya boshida, agar vazifa backend yoki mobil bilan bog'liq bo'lsa.

**Chaqirmang:**

- Har bir navbatda. Bitta sessiyada bir marta yetarli.
- Foydalanuvchi allaqachon "bilaman, keyin qilaman" degan band bo'yicha ikkinchi marta.
- Faqat web/CSS o'zgarishi uchun — u qism Docker'siz ham to'liq ishlaydi.

## 3. Hisobot shabloni

Faqat **joriy vazifaga tegishli** bandlarni yozing. Uchta bo'limdan keraklisini
oling — bo'sh bo'limni umuman chiqarmang.

```
### 🔴 Meni to'sib turibdi
<nima qila olmayapman> — sababi: <band>.
Sizdan: <bitta aniq amal>

### 🟡 Aylanma yo'l bilan qilyapman
<qanday qilyapman> — <nima sababdan to'g'ridan-to'g'ri qila olmayman>.
Tuzatilsa: <nima yaxshilanadi>

### 💸 Ortiqcha token
<qaysi takrorlanuvchi ish> — <sessiyaga taxminan qancha qo'shimcha>.
Sizdan: <bitta aniq amal>
```

Qoidalar:

- **Har band uchun bitta aniq amal.** "Muhitni sozlang" emas — `open -a Docker`.
- **Avval bloklanmagan ishni tugating**, keyin hisobot bering. Hech nima
  qilmasdan to'xtab so'rash — faqat vazifaning 100% i bloklanganda.
- Terminal buyruqlarini alohida ```bash blokda bering (foydalanuvchida "Run" tugmasi chiqadi).
- O'zbekchada yozing.
- Foydalanuvchi rad etsa yoki "keyin" desa — o'sha bandni boshqa ko'tarmang,
  cheklov ostida ishlashda davom eting va nimani tekshira olmaganingizni ayting.

## 4. Ushbu mashinada tasdiqlangan to'siqlar

2026-08-02 da shu kompyuterda haqiqatan tekshirilgan. Sabablari o'zgarmasa,
qayta tekshirmasdan ishonish mumkin.

### 🔴 iOS simulyator runtime yo'q — mobil ilova umuman ko'rinmaydi

`xcode-select -p` → `/Applications/Xcode.app/...` (Xcode bor), lekin
`xcrun simctl list runtimes` **bo'sh**, `xcrun simctl list devices` ham bo'sh.
Android SDK ham yo'q (`~/Library/Android/sdk` mavjud emas).

Ta'siri: `mobil/` dagi har bir o'zgarish (oxirgi 30 commit'ning ~33% i) ko'r-ko'rona
yoziladi. Screenshot yo'q, tap/scroll yo'q, runtime xatosi ko'rinmaydi — faqat
foydalanuvchi telefonida sinaladi, xato bo'lsa yana bir aylanish ketadi.

Sizdan: Xcode → Settings → Components → iOS Simulator runtime (~7 GB, parol so'raydi).

### 🔴 Docker o'chiq + PostGIS mos emas — backend/API tekshirib bo'lmaydi

Uchta bir-biriga bog'liq fakt:

1. `docker info` → `Cannot connect to the Docker daemon`. Docker.app o'rnatilgan,
   lekin ishga tushirilmagan.
2. Lokal Homebrew `postgresql@14` 5432 da ishlayapti, `xavfsiz_xonadon` bazasi
   mavjud — ammo **0 ta jadval** va PostGIS yo'q.
3. `brew list postgis` → `postgresql@17`, `postgresql@18` uchun qurilgan.
   PostgreSQL 14 da `CREATE EXTENSION postgis` →
   `PostGIS built for PostgreSQL 17.0 cannot be loaded in PostgreSQL 14.22`.
   Ya'ni lokal postgres'ni tuzatib bo'lmaydi.

Ta'siri: backend ishga tushmaydi → web'da login sahifasidan nariga o'tib bo'lmaydi
(tekshirildi: "Kirmoqda..." holatida abadiy qotib qoladi, xato ham chiqarmaydi) →
dashboard, xarita, statistika ekranlarining birortasini ko'rib bo'lmaydi.

Sizdan (ikki buyruq, tartib muhim — 5432 porti to'qnashadi):

```bash
brew services stop postgresql@14 && open -a Docker
```

Docker ko'tarilgach Claude qolganini o'zi bajaradi (`docker compose up -d`,
`alembic upgrade head`, seed skriptlari, superadmin yaratish).

### 💸 Ruxsatlar ro'yxati bo'sh — har bir buyruq tasdiq so'raydi

`.claude/settings.local.json` da faqat bitta qoida: `Bash(git fetch *)`.
Qolgan hamma narsa — `git status`, `git log`, `npm run`, `pytest`, `psql`,
`ls`, `grep` — har safar tasdiq so'raydi.

Ta'siri: bu sekinlikning **eng katta sababi**. Har bir tasdiq kutish = to'xtab
qolgan sessiya, va Claude ko'pincha buyruqlarni birlashtirib yuborishga
harakat qiladi (bu esa xato bo'lsa qayta ishlashni qimmatlashtiradi).

Sizdan: Claude'ga ayting — "o'qish buyruqlarini allowlist qil" — yoki
`/fewer-permission-prompts` skillini ishga tushiring.

### 🟡 web'da avtomatik test yo'q

`web/package.json` da `vitest` va `@testing-library/react` bor, ammo
`web/src` da **0 ta** `*.test.*` fayli va `package.json` da `test` skripti yo'q.

Ta'siri: frontend mantiqini (filtrlar, sana hisoblari, holat o'tishlari) faqat
brauzerni ochib qo'lda tekshirish mumkin — bu har bir tekshiruvda bir necha
tool chaqiruvi. Backend'da esa 627 ta test 22 soniyada o'tadi.

Bu Claude o'zi tuzata oladigan narsa — so'rasangiz vitest sozlab beradi.

## 5. Claude o'zi hal qiladigan narsalar (so'ramang, shunchaki ayting)

| Vaziyat | Claude nima qiladi |
|---|---|
| Vite ishlamayapti | `preview_start` bilan `web` konfiguratsiyasini ko'taradi |
| `node_modules` yo'q | `npm install --prefix web` / `--prefix mobil` |
| Sxema bo'sh | Baza tayyor bo'lsa `alembic upgrade head` + seed |
| Backend o'chiq | `backend/venv/bin/uvicorn app.main:app --reload` |
| `timeout` buyrug'i yo'q | Bash tool'ning `timeout` parametridan foydalanadi |
| Simulyator o'chiq (runtime bor bo'lsa) | `xcrun simctl boot` |

## Gotchas

- **`timeout` buyrug'i macOS'da yo'q.** `timeout 180 pytest` → `command not found`.
  Bash tool'ning `timeout` parametrini ishlating (`brew install coreutils` shart emas).
- **`python3` emas, `backend/venv/bin/python`.** System Python'da loyiha
  bog'liqliklari yo'q. Testlar: `cd backend && venv/bin/python -m pytest -q`
  → 627 passed, ~22s, bazasiz (hammasi mock).
- **`psql -U postgres` ishlamaydi** — bunday rol yo'q. Homebrew o'rnatmasida
  superuser roli — `xronuz` (trust auth, parolsiz). Ilova roli `xavfsiz_user`
  superuser **emas**, shuning uchun `CREATE EXTENSION` qila olmaydi.
- **`git config core.hooksPath` = `mobil/.husky`** (repo ildizidan ham).
  Har bir commit `cd mobil && npx lint-staged` ishga tushiradi — `mobil/` da
  lint xatosi bo'lsa, `backend/` o'zgarishini commit qilib bo'lmaydi.
- **Docker'ni yoqishdan oldin `brew services stop postgresql@14`.**
  `docker-compose.yml` postgres'ni `127.0.0.1:5432` ga bog'laydi — Homebrew
  postgres o'sha portni egallab turibdi, `docker compose up` xato beradi.
- **Loyiha 1.6 GB, shundan 744 MB `node_modules`** (`web` 273M + `mobil` 471M).
  Ular `.gitignore` da, lekin fayl qidirishda chetlab o'tilishi kerak —
  aks holda qidiruv sekinlashadi. Kuzatiladigan fayllar atigi 624 ta.
- **Web login backend'siz xato ko'rsatmaydi** — tugma "Kirmoqda..." holatida
  qotib qoladi (console'da ham, network'da ham hech nima yo'q). Bu backend
  o'chiqligining birinchi alomati, UI bug'i emas.

## Troubleshooting

| Xato | Sabab / yechim |
|---|---|
| `Cannot connect to the Docker daemon at unix:///Users/xronuz/.docker/run/docker.sock` | Docker Desktop yopiq → `open -a Docker`, ~1-2 daqiqa kuting |
| `PostGIS built for PostgreSQL 17.0 cannot be loaded in PostgreSQL 14.22` | Lokal postgres'da PostGIS ishlamaydi. Docker'dan foydalaning |
| `permission denied to create extension "postgis"` | `xavfsiz_user` superuser emas → `psql -U $(whoami)` bilan ulaning |
| `role "postgres" does not exist` | Homebrew o'rnatmasida superuser = `$(whoami)`, `postgres` emas |
| `psql: ERROR: unrecognized parameter "no_relocate" in ... postgis_tiger_geocoder.control` | Xuddi shu versiya to'qnashuvi. `pg_available_extensions` so'rovi ham shu sababdan yiqiladi |
| `(eval):1: command not found: timeout` | macOS'da `timeout` yo'q — Bash tool timeout parametrini ishlating |
| `(eval):1: no matches found: web/src/**/*.test.*` | zsh globbing — `find` ishlating yoki `setopt null_glob` |
