# XAVFSIZ XONADON 🏠🔥

**Uychi tumani Favqulodda Vaziyatlar bo'limi uchun raqamli nazorat platformasi**

Xonadonlarni yong'in va gaz xavfsizligi bo'yicha tekshirish jarayonini GPS + foto + vaqt tamg'asi bilan tasdiqlangan raqamli oqimga o'tkazish. 53 ta MFY, mobil ilova + web dashboard + Telegram bot.

---

## 🏗 Texnologik stek

| Qatlam | Texnologiya |
|---|---|
| Backend | Python 3.11, FastAPI 0.110+, SQLAlchemy 2.0 (async), Alembic |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Web dashboard | React 18 + TypeScript, Vite, TailwindCSS, Leaflet |
| Mobil ilova | React Native + Expo |
| Infratuzilma | Docker Compose, Nginx, Cloudflare Tunnel |

---

## 📁 Loyiha tuzilishi

```
xavfsiz-xonadon/
├── docker-compose.yml          # Ishlab chiqish muhiti
├── docker-compose.prod.yml     # Ishlab chiqarish muhiti (keyin)
├── .env.example
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-dev.txt # Test bog'liqliklari (pytest)
│   ├── alembic/
│   │   ├── env.py              # Async migratsiya sozlamasi
│   │   ├── versions/
│   │   │   └── 1cad20562dfd_initial_schema.py
│   │   └── script.py.mako
│   ├── scripts/
│   │   ├── init-db.sh          # PostGIS kengaytmalari
│   │   ├── seed_mfy.py         # 53 MFY seed
│   │   ├── seed_chegaralar.py  # MFY chegaralarini GeoJSON dan yuklash
│   │   └── create_superadmin.py
│   └── app/
│       ├── main.py             # FastAPI ilova fabrikasi
│       ├── config.py           # Muhit sozlamalari (pydantic-settings)
│       ├── database.py         # SQLAlchemy async engine + session
│       ├── models/             # SQLAlchemy modellari (14 ta jadval)
│       │   ├── user.py
│       │   ├── hudud.py
│       │   ├── muammo.py
│       │   ├── lokatsiya.py
│       │   └── audit.py
│       ├── schemas/            # Pydantic validatsiya modellari
│       │   └── auth.py
│       ├── api/                # REST marshrutizatorlar
│       │   ├── auth.py         # Auth: ro'yxat, kirish, refresh, /men
│       │   ├── users.py        # Foydalanuvchilar: tasdiqlash, bloklash, MFY
│       │   ├── xonadon.py      # Xonadonlar CRUD
│       │   ├── hudud.py        # MFY/ko'chalar (chegara GeoJSON bilan)
│       │   ├── muammo.py       # Muammolar CRUD + foto
│       │   ├── lokatsiya.py    # GPS lokatsiya logi
│       │   ├── statistika.py   # Analitika, Excel/PDF eksport
│       │   ├── topshiriq_intizom.py  # Topshiriq va intizom
│       │   └── upload.py       # Fayl yuklash
│       ├── core/               # Yadro utilitalar
│       │   ├── security.py     # JWT, bcrypt, parol validatsiyasi
│       │   ├── deps.py         # FastAPI Depends (auth, RBAC)
│       │   └── exceptions.py   # Maxsus istisnolar
│       ├── services/           # Biznes-logika xizmatlari
│       ├── ws/                 # WebSocket manager
│       └── tasks/              # APScheduler fon vazifalari
│
├── web/                        # React dashboard (4-bosqich ✅)
│   └── src/
│       ├── pages/              # 13 ta sahifa (React.lazy — route-level code splitting)
│       ├── components/         # UI komponentlar (AppLayout, Skeleton va boshq.)
│       └── types.ts            # TypeScript interfeyslar
├── mobil/                      # React Native ilova (5-bosqich ✅)
│   ├── App.tsx                 # Root: Auth gate + Stack/Tab navigatsiya
│   ├── app.json                # Expo konfiguratsiyasi
│   ├── package.json            # Expo SDK 52 + React Navigation 7
│   └── src/
│       ├── types.ts            # Mobile interfeyslar (backend bilan mos)
│       ├── contexts/
│       │   └── AuthContext.tsx  # JWT auth holati (kirish/chiqish/profil)
│       ├── services/
│       │   ├── api.ts           # Axios + JWT interceptor + token yangilash
│       │   ├── storage.ts       # AsyncStorage o'rash (token/sessiya)
│       │   └── db.ts            # SQLite offline schema (muammolar, fotolar, sinxron)
│       ├── components/
│       │   └── StatusBadge.tsx  # Status/shubhali badge komponenti
│       └── screens/
│           ├── LoginScreen.tsx           # 🔑 GR + parol orqali kirish
│           ├── HomeScreen.tsx            # 🏠 Dashboard statistikasi + tezkor amallar
│           ├── XonadonlarScreen.tsx      # 📋 Xonadon ro'yxati (qidiruv + sahifalash)
│           ├── XonadonDetailScreen.tsx   # 🏚 Xonadon detallari + muammolar
│           ├── MuammoYaratishScreen.tsx  # ⚠️ Muammo qayd etish (GPS + kamera)
│           └── SettingsScreen.tsx        # ⚙️ Profil + tizimdan chiqish
├── nginx/
│   └── default.conf            # Nginx reverse proxy + gzip + security headers
├── docker-compose.prod.yml     # Production compose (nginx + Redis + postgres + cloudflared + backup)
└── scripts/
    ├── backup.sh               # pg_dump + gpg shifrlash
    ├── restore.sh              # pg_restore + deshifrlash
    └── cloudflared-sozlash.md  # Cloudflare Tunnel sozlash qo'llanmasi
```

---

## 🌐 Ishlab chiqarish muhiti (production)

| Narsa | Qiymat |
|---|---|
| Dashboard | https://fvv.xron.uz |
| API | https://fvv.xron.uz/api |
| Health check | https://fvv.xron.uz/api/health |
| WebSocket (lokatsiya) | `wss://fvv.xron.uz/api/ws/lokatsiya` |
| Compose fayl | `docker-compose.prod.yml` |
| Host nginx | `/etc/nginx/sites-available/fvv.xron.uz` (`127.0.0.1:8091` ga proxy) |
| TLS | Cloudflare (SSL/TLS mode = Flexible), origin HTTP qabul qiladi |

Qayta deploy:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Web va mobil ilova API'ni bir xil origin orqali chaqiradi (`/api`), shuning uchun
domen o'zgarsa faqat `mobil/app.json` → `extra.apiUrl`, `CORS_ORIGINS` (`.env`) va
host nginx `server_name` yangilanadi.

---

## 🚀 Ishga tushirish (1-bosqich — Poydevor)

### Talablar
- Docker 24+ va Docker Compose v2
- Python 3.11 (lokal ishlab chiqish uchun)

### 1. Muhit sozlash

```bash
cp .env.example .env
# .env faylini ochib, kerakli o'zgaruvchilarni to'ldiring
```

### 2. Docker orqali ishga tushirish

```bash
docker compose up -d
```

Bu quyidagilarni ishga tushiradi:
- **PostgreSQL 16 + PostGIS 3.4** (`localhost:5432`)
- **FastAPI backend** (`localhost:8000`)
- **Adminer** (`localhost:8080`) — DB boshqaruvi

Backend avtomatik ravishda:
1. Alembic migratsiyasini bajaradi (barcha jadvallar ENUM turlar)
2. 53 ta MFY ma'lumotini kiritadi
3. Superadmin yaratadi

### 3. Lokal ishlab chiqish

```bash
cd backend

# Virtual muhit
python3 -m venv venv
source venv/bin/activate

# Bog'liqliklar
pip install -r requirements.txt

# Dockerda Postgres ishga tushirilgan bo'lishi kerak:
# docker compose up -d postgres

# Migratsiya
alembic upgrade head

# Seed
python scripts/seed_mfy.py
python scripts/create_superadmin.py
# MFY chegaralari (ixtiyoriy, GeoJSON fayl bo'lsa):
# python scripts/seed_chegaralar.py scripts/data/mfy_chegaralar.geojson

# Serverni ishga tushirish
uvicorn app.main:app --reload --port 8000
```

### 4. API hujjatlari

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/api/health

### 5. Superadmin ma'lumotlari

| Maydon | Qiymat |
|---|---|
| Guvohnoma raqami | `ADMIN001` |
| Parol | `SUPERADMIN_PAROL` env'dan olinadi (`scripts/create_superadmin.py`) |
| Rol | `superadmin` |

⚠️ Parol repo'da saqlanmaydi. Lokal ishga tushirishda `SUPERADMIN_PAROL` bering:

```bash
SUPERADMIN_PAROL='<parol>' python scripts/create_superadmin.py
```

---

## 🔐 Auth API

### Ro'yxatdan o'tish (xodim)
```bash
curl -X POST http://localhost:8000/api/auth/royxat \
  -H "Content-Type: application/json" \
  -d '{
    "guvohnoma_raqami": "XODIM005",
    "parol": "XavfsizParol1",
    "familiya": "Karimov",
    "ism": "Akmal",
    "sharif": "Alievich",
    "lavozim": "Katta inspektor",
    "telefon": "+998901112233"
  }'
```

### Kirish
```bash
curl -X POST http://localhost:8000/api/auth/kirish \
  -H "Content-Type: application/json" \
  -d '{
    "guvohnoma_raqami": "ADMIN001",
    "parol": "<superadmin paroli>"
  }'
```

Javob:
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "user": { ... }
  }
}
```

### Profil ko'rish
```bash
curl http://localhost:8000/api/auth/men \
  -H "Authorization: Bearer <access_token>"
```

---

## 📊 Ma'lumotlar bazasi sxemasi

| # | Jadval | Tavsif |
|---|---|---|
| 1 | `users` | Foydalanuvchilar (3 ta rol) |
| 2 | `mfy` | Mahalla fuqarolar yig'ini (53 ta) |
| 3 | `kochalar` | Ko'chalar |
| 4 | `xonadonlar` | Xonadonlar |
| 5 | `xodim_mfy` | Xodim ↔ MFY biriktirish |
| 6 | `muammolar` | Aniqlangan muammolar |
| 7 | `fotolar` | Muammo fotolari (oldin/keyin) |
| 8 | `lokatsiya_log` | Xodim GPS logi |
| 9 | `topshiriqlar` | Rahbar topshiriqlari |
| 10 | `intizom` | Intizom qaydlari |
| 11 | `audit_log` | Audit jurnali |

6 ta PostgreSQL ENUM turi, 3 ta GIST indeks, 2 ta qisman indeks, 2 ta trigger.

---

## 🗺 Bosqichlar

| Bosqich | Holat | Tavsif |
|---|---|---|
| 1. Poydevor | ✅ Bajarildi | DB sxemasi, Auth API, seed, Docker |
| 2. Muammolar + Xonadon + Hudud API | ✅ Bajarildi | CRUD muammo/xonadon/kocha, foto, filtrlash, rolli ruxsat |
| 3. Test qamrovi | ✅ Bajarildi | 283 ta test (schema + servis + API), 100% o'tuvchi |
| 4. Web dashboard | ✅ Bajarildi | React 18 + Vite + TailwindCSS, 8 ta sahifa |
| 5. Mobil ilova | ✅ Bajarildi | React Native + Expo, 6 ekran, offline-first, GPS + kamera, JWT auth |
| 6. Real-time & xarita | ✅ Bajarildi | WebSocket, GPS, XaritaPage |
| 7. Muddat/intizom | ✅ Bajarildi | Topshiriq/Intizom API, Telegram bot |
| 8. Analitika | ✅ Bajarildi | Stat, Excel, PDF, diagrammalar (Recharts) |
| 9. Produksiya | ✅ Bajarildi | Nginx, backup/restore, APScheduler, Redis, VACUUM |

---

## ✅ Test qamrovi

**Jami: 302 ta test, 100% o'tuvchi**

| Test fayli | Qatlam | Test soni | Qamrov |
|---|---|---|---|
| `test_schemas_user.py` | Schema validatsiya | 25 | UserCreate, UserUpdate, UserLogin, Token |
| `test_schemas_muammo.py` | Schema validatsiya | 43 | MuammoCreate, MuammoUpdate, MuammoYopish, MuammoFotoQoshish, MuammoFilter, MuammoResponse |
| `test_schemas_xonadon.py` | Schema validatsiya | 18 | XonadonCreate, XonadonUpdate, XonadonResponse, XonadonFilter |
| `test_schemas_hudud.py` | Schema validatsiya | 12 | KochaCreate, KochaResponse, MfyResponse |
| `test_services_auth.py` | Servis (unit) | 22 | login, create_user, get_me, yangilash_token |
| `test_services_muammo.py` | Servis (unit) | 28 | CRUD muammo, yopish, foto qo'shish, filtrlash |
| `test_services_xonadon.py` | Servis (unit) | 25 | CRUD xonadon, kochalar, mfylar, _xonadon_to_response |
| `test_api_auth.py` | API (integratsiya) | 32 | POST /kirish, POST /register, GET /me, POST /token/yangilash |
| `test_api_muammo.py` | API (integratsiya) | 27 | POST, GET list, GET by id, PATCH, yopish, foto qo'shish |
| `test_api_xonadon.py` | API (integratsiya) | 27 | POST, GET list, GET by id, PATCH, DELETE /xonadonlar |
| `test_api_hudud.py` | API (integratsiya) | 11 | GET /mfylar, GET /mfylar/{id}, GET /kochalar, POST /kochalar |
| `test_api_boshqaruv.py` | API (integratsiya) | 13 | GET /foydalanuvchilar, PATCH /foydalanuvchilar/{id}/rol |
| `test_schemas_statistika.py` | Schema validatsiya | 18 | UmumiyStatistika, MuammoTuriStat, MFYStatistika, StatistikaResponse |

**O'rnatilgan APScheduler vazifalari:**
- Har kuni 03:00 — 90 kundan eski lokatsiya loglarni tozalash
- Har yakshanba 04:00 — 180 kundan eski audit loglarni tozalash  
- Har yakshanba 05:00 — PostgreSQL VACUUM ANALYZE

### Testlash naqshlari
- **Schema testlar**: Pydantic model validatsiyasi (asosiy qiymatlar, edge case'lar, xato holatlar)
- **Servis testlar**: `AsyncMock` DB session, `pytest.mark.asyncio`
- **API testlar**: `TestClient` + `dependency_overrides` (get_db, get_current_user), rolli ruxsat tekshiruvi
- **Barcha endpointlar**: success, 404, 403, 422 holatlar qamrab olingan

Ishga tushirish:
```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest -v
```

---

## 🔒 Xavfsizlik

- Parollar: bcrypt, cost=12
- JWT: HS256, access 30 min, refresh 30 kun
- RBAC: server-tomon tekshirish (har endpointda)
- Rate limit: `/api/auth/kirish` — 5/15min
- Audit log: barcha POST/PATCH/DELETE yoziladi
- SQL injection: faqat SQLAlchemy ORM
- CORS: faqat dashboard domeni

---

## 🚀 Ishlab chiqarishga chiqarish (9-bosqich)

```bash
# 1. Muhit
cp .env.example .env
# BARCHA o'zgaruvchilarni to'ldiring! JWT_SECRET kamida 64 belgi!

# 2. Ishlab chiqarish stackini ishga tushirish
docker compose -f docker-compose.prod.yml up -d

# 3. Seed va superadmin
docker compose -f docker-compose.prod.yml exec backend python scripts/seed_mfy.py
docker compose -f docker-compose.prod.yml exec backend python scripts/create_superadmin.py

# 4. Backup
# Backup alohida `backup` servisi orqali ishlaydi (backup.sh endi backend imijida emas):
docker compose -f docker-compose.prod.yml ps backup
```

### Ishlab chiqarish arxitekturasi

```
                        ┌─────────────┐
                        │   Nginx 80  │ ← TLS (keyin)
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
      /api/* → backend    / → web static    /uploads/ → media
      :8000               dist/              volume

backend ──→ PostgreSQL 16 + PostGIS (internal network only)
         ──→ Redis 7 (rate limiting, caching)
```

### Cloudflare Tunnel (asosiy prod yo'li)

Production'da kirish Cloudflare Tunnel orqali ishlaydi: `cloudflared` konteyneri ichki tarmoqda `nginx:80` ga ulanadi, TLS Cloudflare tomonidan tugatiladi — serverda tashqi 80/443 portlarini ochish shart emas.

1. Cloudflare Zero Trust dashboard'da tunnel yarating va tokenni oling.
2. `.env` ga qo'shing: `TUNNEL_TOKEN=eyJ...`
3. Stackni ishga tushiring — `cloudflared` servisi avtomatik ulanadi.

Batafsil qo'llanma: [`scripts/cloudflared-sozlash.md`](scripts/cloudflared-sozlash.md)

### MFY chegaralarini yuklash

`/api/mfylar` javobidagi `chegara` maydoni (GeoJSON) bazadan olinadi. Chegara poligonlari OpenStreetMap yoki QGIS eksportidan olinadi (har feature'da `raqami` property, geometry — Polygon, EPSG:4326). Ma'lumot faylini FVV taqdim etadi.

```bash
# Faylni backend/scripts/data/mfy_chegaralar.geojson ga joylang, keyin:
docker compose -f docker-compose.prod.yml exec backend \
  python scripts/seed_chegaralar.py scripts/data/mfy_chegaralar.geojson
```

Skript idempotent — `mfy.raqami` bo'yicha match qilib UPDATE qiladi, qayta yurgizish xavfsiz.

### Backup va tiklash

```bash
# Backup olish
./scripts/backup.sh

# Tiklash
./scripts/restore.sh /backups/xavfsiz_20260714_020000.sql.gz
# yoki shifrlangan:
BACKUP_ENCRYPT_PASSWORD=... ./scripts/restore.sh /backups/xavfsiz_20260714_020000.sql.gz.gpg
```

---

## 📄 Litsenziya

Uychi tumani FVV bo'limi buyurtmasi. Ichki foydalanish uchun.

---

*Oxirgi yangilanish: 2026-07-14 · Barcha 9 bosqich yakunlandi · 302 test*
