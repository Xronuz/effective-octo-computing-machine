# Cloudflare Tunnel sozlash

"Xavfsiz Xonadon" loyihasining asosiy prod yo'li — Cloudflare Tunnel.
TLS Cloudflare tomonidan tugatiladi; `cloudflared` konteyneri ichki tarmoqda
`nginx:80` ga ulanadi, shu sabab serverda tashqi 80/443 portlarini ochish
shart emas.

## 1. Tunnel yaratish

Ikki usuldan biri:

**Dashboard orqali (tavsiya):**

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) ga kiring.
2. **Networks → Tunnels → Add a tunnel**.
3. Connector turi: **Cloudflared**. Tunnel nomini kiriting.
4. "Install and run a connector" qadamida ko'rsatilgan tokenni nusxa oling —
   bu `TUNNEL_TOKEN` qiymati.

**CLI orqali:**

```bash
cloudflared login
cloudflared tunnel create xavfsiz-xonadon
# token olish:
cloudflared tunnel token <TUNNEL_ID>
```

## 2. Tokenni .env ga yozish

```bash
cp .env.example .env
# .env faylida:
TUNNEL_TOKEN=eyJhIjoixxxx....   # dashboard/CLI dan olingan token
```

## 3. Public hostname (DNS) sozlash

Zero Trust dashboardda tunnelni oching → **Public Hostname → Add**:

- **Subdomain + Domain**: masalan, `app.example.uz`
- **Service**: `http://nginx:80`
  (cloudflared va nginx bitta `xavfsiz-net` tarmog'ida — ichki HTTP)

Cloudflare DNS yozuvini (CNAME → tunnel) avtomatik yaratadi.

## 4. Ishga tushirish

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f cloudflared
```

Log'da `Registered tunnel connection` ko'rinsa — tunnel ulandi.
Sayt endi `https://app.example.uz` orqali ochiladi.

## Eslatmalar

- TLS sertifikat serverda kerak emas — Cloudflare o'zi boshqaradi.
- `nginx/default.conf` da HTTP→HTTPS redirect `$http_x_forwarded_proto`
  headeriga bog'langan; tunnel trafigiga ta'sir qilmaydi.
- `TUNNEL_TOKEN` — maxfiy qiymat, faqat `.env` da saqlanadi (git'ga kiritilmaydi).
