// XAVFSIZ XONADON — Faol xodimlar markerlari qatlami.
// Dumaloq divIcon: profil foto (profil_foto_url bo'lsa) yoki bosh harflar.
// WS yangilanishi kelganda markerda pulsatsiya (pulsingIds orqali CSS class).

import { Fragment } from 'react';
import { Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  vaqtOldin,
  boshHarflar,
  batareyaRangi,
  type XaritaXodim,
} from './xaritaTypes';

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function xodimIcon(x: XaritaXodim, pulsing: boolean): L.DivIcon {
  const ring = batareyaRangi(x.batareya);
  const ichki = x.profil_foto_url
    ? `<img src="${escapeAttr(x.profil_foto_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:0.5px;">${escapeAttr(
        boshHarflar(x.xodim_fio),
      )}</span>`;
  return L.divIcon({
    className: 'xarita-xodim-icon',
    html:
      `<div class="xarita-xodim-marker${pulsing ? ' xarita-pulse' : ''}" ` +
      `style="width:36px;height:36px;border-radius:50%;background:#1f2937;` +
      `border:3px solid ${ring};box-shadow:0 2px 8px rgba(0,0,0,0.45);` +
      `display:flex;align-items:center;justify-content:center;overflow:hidden;">` +
      `${ichki}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

interface Props {
  aktivlar: XaritaXodim[];
  pulsingIds: Set<number>;
}

export function XodimQatlami({ aktivlar, pulsingIds }: Props) {
  return (
    <>
      {aktivlar.map((x) => {
        const ring = batareyaRangi(x.batareya);
        return (
          <Fragment key={x.xodim_id}>
            <Marker
              position={[x.lat, x.lng]}
              icon={xodimIcon(x, pulsingIds.has(x.xodim_id))}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                    {x.xodim_fio}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                    <div>🕐 {vaqtOldin(x.ohirgi_vaqt)}</div>
                    <div>🔋 Batareya: {x.batareya ?? "noma'lum"}%</div>
                    <div>
                      🎯 Aniqlik: {x.aniqlik ? `${x.aniqlik.toFixed(0)}m` : '-'}
                    </div>
                    <div>
                      📍 {x.lat.toFixed(5)}, {x.lng.toFixed(5)}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
            {x.aniqlik !== null && x.aniqlik < 500 && (
              <Circle
                center={[x.lat, x.lng]}
                radius={x.aniqlik}
                pathOptions={{
                  color: ring,
                  fillColor: ring,
                  fillOpacity: 0.1,
                  weight: 1,
                }}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
