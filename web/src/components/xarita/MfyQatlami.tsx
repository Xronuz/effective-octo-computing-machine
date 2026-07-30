// XAVFSIZ XONADON — MFY chegara poligonlari qatlami.
// Backend /mfylar hozircha `chegara` qaytarmaydi (ko'pchilik NULL) —
// chegarasi bor MFY'lar uchun yupqa chiziq + shaffof ichki chiziladi,
// chegarasi yo'qlari jimgina o'tkazib yuboriladi.

import { Polygon, Tooltip } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { MfyXarita } from './xaritaTypes';
import { useAlifbo } from '@/alifbo';

/** GeoJSON [lng, lat] → Leaflet [lat, lng] */
function polygonLatLngs(mfy: MfyXarita): LatLngExpression[][][] {
  const c = mfy.chegara;
  if (!c) return [];
  const toRing = (ring: number[][]): LatLngExpression[] =>
    ring.map(([lng, lat]) => [lat, lng] as LatLngExpression);
  if (c.type === 'Polygon') {
    return [c.coordinates.map(toRing)];
  }
  if (c.type === 'MultiPolygon') {
    return c.coordinates.map((poly) => poly.map(toRing));
  }
  return [];
}

export function MfyQatlami({ mfylar, tanlanganId }: { mfylar: MfyXarita[]; tanlanganId?: number | null }) {
  const { tr } = useAlifbo();
  return (
    <>
      {mfylar.flatMap((mfy) =>
        polygonLatLngs(mfy).map((positions, idx) => {
          const tanlangan = mfy.id === tanlanganId;
          return (
            <Polygon
              key={`${mfy.id}-${idx}`}
              positions={positions}
              pathOptions={
                tanlangan
                  ? { color: '#C9A227', weight: 2.5, opacity: 1, fillColor: '#C9A227', fillOpacity: 0.15 }
                  : { color: '#7DA7E8', weight: 1.5, opacity: 0.75, fillColor: '#4C7DBF', fillOpacity: 0.07 }
              }
            >
              <Tooltip sticky>
                <span style={{ fontSize: 12 }}>
                  {tr('MFY')} #{mfy.raqami} — {tr(mfy.nomi)}
                </span>
              </Tooltip>
            </Polygon>
          );
        }),
      )}
    </>
  );
}
