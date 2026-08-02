#!/usr/bin/env bash
# doctor.sh — Xavfsiz Xonadon ish muhitidagi to'siqlarni aniqlaydi.
#
# Har bir tekshiruv uchta natijadan birini beradi:
#   [OK]     — muammo yo'q
#   [CLAUDE] — Claude o'zi hal qiladi, sizdan hech nima kerak emas
#   [SIZ]    — faqat siz hal qila olasiz (GUI, parol, brew, Xcode)
#
# Ishlatish (loyiha ildizidan):
#   bash .claude/skills/tosiq/doctor.sh
#   bash .claude/skills/tosiq/doctor.sh --json    # mashina o'qishi uchun
#
# Hech qanday o'zgarish kiritmaydi — faqat o'qiydi. Parollarni chop etmaydi.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT" || exit 1

JSON=0
[ "${1:-}" = "--json" ] && JSON=1

N_SIZ=0     # faqat foydalanuvchi hal qila oladigan to'siqlar
N_CLAUDE=0  # Claude o'zi hal qiladigan ishlar

_rows=()

# say <status> <sarlavha> <izoh> <tuzatish-buyrug'i>
say() {
  local st="$1" title="$2" note="$3" fix="${4:-}"
  _rows+=("$st|$title|$note|$fix")
  [ "$st" = "SIZ" ] && N_SIZ=$((N_SIZ + 1))
  [ "$st" = "CLAUDE" ] && N_CLAUDE=$((N_CLAUDE + 1))
  if [ "$JSON" = 0 ]; then
    case "$st" in
      OK)     printf '  \033[32m[OK]\033[0m     %s — %s\n' "$title" "$note" ;;
      CLAUDE) printf '  \033[33m[CLAUDE]\033[0m %s — %s\n' "$title" "$note" ;;
      SIZ)    printf '  \033[31m[SIZ]\033[0m    %s — %s\n' "$title" "$note"
              [ -n "$fix" ] && printf '           ↳ %s\n' "$fix" ;;
    esac
  fi
}

hdr() { [ "$JSON" = 0 ] && printf '\n\033[1m%s\033[0m\n' "$1"; }

# .env ni xavfsiz o'qish (qiymatlar hech qachon chop etilmaydi)
if [ -f .env ]; then
  set -a; . ./.env >/dev/null 2>&1; set +a
fi
PGDB="${POSTGRES_DB:-xavfsiz_xonadon}"
PGUSER="${POSTGRES_USER:-xavfsiz_user}"

# ─────────────────────────────────────────────────────────────
hdr "Backend / ma'lumotlar bazasi"

DOCKER_UP=0
if docker info >/dev/null 2>&1; then
  DOCKER_UP=1
  say OK "Docker" "demon ishlayapti"
else
  if [ -d /Applications/Docker.app ]; then
    say SIZ "Docker o'chiq" "docker-compose stack (postgis 16-3.4 + backend + adminer) ishga tushmaydi" \
      "Docker Desktop'ni oching: open -a Docker  (~1-2 daqiqa kutiladi)"
  else
    say SIZ "Docker o'rnatilmagan" "loyihaning asosiy dev muhiti mavjud emas" \
      "brew install --cask docker"
  fi
fi

# 5432 portini kim egallagan?
PG_OWNER="$(lsof -nP -iTCP:5432 -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $1}' | sort -u | head -1)"
if [ -n "$PG_OWNER" ] && [ "$DOCKER_UP" = 0 ]; then
  if brew services list 2>/dev/null | grep -q '^postgresql@.*started'; then
    BREW_PG="$(brew services list 2>/dev/null | awk '/^postgresql@.*started/{print $1}' | head -1)"
    say SIZ "Port 5432 band ($BREW_PG)" "Docker yoqilganda 'docker compose up' portni band deb xato beradi" \
      "brew services stop $BREW_PG   # Docker'ni ishlatishdan oldin"
  fi
fi

# PostGIS holati (lokal postgres uchun)
if command -v psql >/dev/null 2>&1 && [ -n "$PG_OWNER" ]; then
  PGV="$(PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h localhost -U "$PGUSER" -d "$PGDB" -tAc \
        "select postgis_version();" 2>&1 | head -1)"
  if printf '%s' "$PGV" | grep -qE '^[0-9]'; then
    say OK "PostGIS" "lokal bazada faol ($PGV)"
  elif printf '%s' "$PGV" | grep -q 'does not exist'; then
    # Server qaysi major versiya, brew postgis qaysi major uchun qurilgan?
    SRV_MAJ="$(PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h localhost -U "$PGUSER" -d "$PGDB" \
              -tAc 'show server_version;' 2>/dev/null | cut -d. -f1 | tr -d ' ')"
    PGIS_FOR="$(brew list postgis 2>/dev/null | grep -oE 'postgresql@[0-9]+' | sort -u | tr '\n' ' ')"
    if [ -n "$PGIS_FOR" ] && [ -n "$SRV_MAJ" ] && ! printf '%s' "$PGIS_FOR" | grep -q "postgresql@$SRV_MAJ"; then
      say SIZ "PostGIS versiyasi mos emas" "brew postgis → ${PGIS_FOR% }, lokal server esa PostgreSQL $SRV_MAJ. CREATE EXTENSION xato beradi" \
        "Eng oson yo'l — Docker'ni yoqing (postgis/postgis:16-3.4 tayyor keladi). Muqobil: brew install postgresql@17 + bazani ko'chirish"
    elif [ -z "$PGIS_FOR" ]; then
      say SIZ "PostGIS o'rnatilmagan" "geo ustunlar (lokatsiya, MFY chegaralari) ishlamaydi" \
        "brew install postgis   yoki Docker'ni yoqing"
    else
      say SIZ "PostGIS extension yaratilmagan" "fayllar bor, ammo bazada CREATE EXTENSION qilinmagan (superuser kerak)" \
        "psql -U \$(whoami) -d $PGDB -c 'CREATE EXTENSION postgis;'"
    fi
  fi
fi

# Sxema qo'llanganmi?
if command -v psql >/dev/null 2>&1 && [ -n "$PG_OWNER" ]; then
  TBLS="$(PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h localhost -U "$PGUSER" -d "$PGDB" -tAc \
         "select count(*) from information_schema.tables where table_schema='public';" 2>/dev/null | tr -d ' ')"
  if [ "${TBLS:-0}" -gt 5 ] 2>/dev/null; then
    say OK "Sxema" "$TBLS ta jadval mavjud"
  else
    say CLAUDE "Sxema bo'sh" "${TBLS:-0} ta jadval — migratsiya qo'llanmagan" \
      "PostGIS tayyor bo'lgach Claude o'zi bajaradi: alembic upgrade head + seed skriptlari"
  fi
fi

# Backend jonli mi?
if curl -sf -m 2 http://localhost:8000/docs >/dev/null 2>&1 || curl -sf -m 2 http://localhost:8000/ >/dev/null 2>&1; then
  say OK "Backend :8000" "javob beryapti"
else
  say CLAUDE "Backend :8000 o'chiq" "API/auth/E2E tekshirib bo'lmaydi" \
    "Baza tayyor bo'lsa Claude o'zi ishga tushiradi: backend/venv/bin/uvicorn app.main:app"
fi

# ─────────────────────────────────────────────────────────────
hdr "Web dashboard"

if [ -d web/node_modules ]; then
  say OK "web bog'liqliklari" "o'rnatilgan"
else
  say CLAUDE "web/node_modules yo'q" "dev server ishga tushmaydi" "Claude o'zi: npm install --prefix web"
fi

if curl -sf -m 2 http://localhost:5173 >/dev/null 2>&1; then
  say OK "Vite :5173" "ishlayapti"
else
  say CLAUDE "Vite :5173 o'chiq" "" "Claude o'zi ishga tushiradi (preview_start 'web')"
fi

WEB_TESTS="$(find web/src \( -name '*.test.*' -o -name '*.spec.*' \) 2>/dev/null | wc -l | tr -d ' ')"
HAS_TEST_SCRIPT="$(grep -c '"test"' web/package.json 2>/dev/null || echo 0)"
if [ "$WEB_TESTS" = "0" ]; then
  say CLAUDE "web'da test yo'q" "vitest o'rnatilgan, ammo 0 ta test fayli va package.json'da 'test' skripti yo'q" \
    "Web mantiqini faqat brauzer orqali tekshirish mumkin — bu sekinroq"
elif [ "$HAS_TEST_SCRIPT" = "0" ]; then
  say CLAUDE "web'da 'test' skripti yo'q" "$WEB_TESTS ta test fayli bor, ammo npm test ishlamaydi" \
    "Claude o'zi qo'shadi yoki npx vitest run bilan chaqiradi"
else
  say OK "web testlari" "$WEB_TESTS ta fayl"
fi

# ─────────────────────────────────────────────────────────────
hdr "Mobil ilova (Expo)"

SIMS="$(xcrun simctl list runtimes 2>/dev/null | grep -c 'iOS')"
if [ "${SIMS:-0}" -gt 0 ]; then
  BOOTED="$(xcrun simctl list devices booted 2>/dev/null | grep -c 'Booted')"
  if [ "${BOOTED:-0}" -gt 0 ]; then
    say OK "iOS simulyator" "yoqilgan — Claude ekranlarni ko'ra oladi"
  else
    say CLAUDE "iOS simulyator o'chiq" "runtime bor, qurilma yoqilmagan" "Claude o'zi yoqadi: xcrun simctl boot"
  fi
elif [ -d /Applications/Xcode.app ]; then
  say SIZ "iOS simulyator runtime yo'q" "Xcode bor, lekin bironta iOS runtime o'rnatilmagan — mobil ekranlarni Claude UMUMAN ko'ra olmaydi" \
    "Xcode → Settings → Components → iOS Simulator runtime'ni yuklab oling (~7 GB, parol so'raydi)"
else
  say SIZ "Xcode yo'q" "mobil ilovani ishga tushirib bo'lmaydi" "App Store'dan Xcode o'rnating"
fi

if [ -x "$HOME/Library/Android/sdk/emulator/emulator" ]; then
  say OK "Android SDK" "mavjud"
else
  say SIZ "Android emulyator yo'q" "iOS ham yo'q bo'lsa — mobil o'zgarishlar ko'r-ko'rona yoziladi" \
    "Ixtiyoriy: Android Studio o'rnatib bitta AVD yarating (iOS runtime muqobili)"
fi

if [ -d mobil/node_modules ]; then
  say OK "mobil bog'liqliklari" "o'rnatilgan"
else
  say CLAUDE "mobil/node_modules yo'q" "" "Claude o'zi: npm install --prefix mobil"
fi

# ─────────────────────────────────────────────────────────────
hdr "Claude'ning ish tezligi"

ALLOW="$(grep -o '"Bash(' .claude/settings.local.json 2>/dev/null | wc -l | tr -d ' ')"
if [ "${ALLOW:-0}" -lt 6 ]; then
  say SIZ "Ruxsatlar ro'yxati juda qisqa ($ALLOW ta)" "har bir git/npm/pytest/psql buyrug'i sizdan tasdiq so'raydi — bu eng katta sekinlik sababi" \
    "Claude'ga ayting: '.claude/settings.local.json ga o'qish-buyruqlarini allowlist qil' — yoki /fewer-permission-prompts"
else
  say OK "Ruxsatlar ro'yxati" "$ALLOW ta qoida"
fi

if command -v timeout >/dev/null 2>&1 || command -v gtimeout >/dev/null 2>&1; then
  say OK "timeout" "mavjud"
else
  say CLAUDE "timeout buyrug'i yo'q" "macOS'da coreutils yo'q — osilib qolgan buyruqlar sessiyani bloklaydi" \
    "Claude Bash timeout parametridan foydalanadi. Xohlasangiz: brew install coreutils"
fi

HOOKS="$(git config core.hooksPath 2>/dev/null)"
if [ -n "$HOOKS" ]; then
  say CLAUDE "git hooksPath = $HOOKS" "har bir commit'da lint-staged ishlaydi (mobil/)" \
    "Lint xatosi commit'ni to'xtatadi — Claude buni biladi"
fi

if [ -d backend/venv ]; then
  say OK "backend venv" "backend/venv/bin/python (system python3 emas!)"
else
  say CLAUDE "backend venv yo'q" "" "Claude o'zi yaratadi"
fi

# ─────────────────────────────────────────────────────────────
if [ "$JSON" = 1 ]; then
  printf '['
  first=1
  for r in "${_rows[@]}"; do
    IFS='|' read -r st ti no fx <<< "$r"
    [ $first = 0 ] && printf ','
    first=0
    printf '{"status":"%s","title":"%s","note":"%s","fix":"%s"}' "$st" "$ti" "$no" "$fx"
  done
  printf ']\n'
else
  printf '\n\033[1mXULOSA:\033[0m \033[31m%s ta sizdan kerak\033[0m, \033[33m%s tasini Claude o\047zi hal qiladi\033[0m.\n' \
    "$N_SIZ" "$N_CLAUDE"
  [ "$N_SIZ" -gt 0 ] && printf 'Claude [SIZ] bandlarini SKILL.md shabloni bo\047yicha hisobot qilib beradi.\n'
fi

exit 0
