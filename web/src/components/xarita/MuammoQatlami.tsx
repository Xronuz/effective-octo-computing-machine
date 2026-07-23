// XAVFSIZ XONADON — Muammo nuqtalari qatlami (klaster bilan).
// GET /api/muammolar/xarita GeoJSON feature'larini circleMarker ko'rinishida chizadi.
// Zoom < 13 da nuqtalar leaflet.markercluster orqali klasterlanadi.

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {
  STATUS_RANGLARI,
  STATUS_NOMLARI,
  TURI_NOMLARI,
  SHUBHALI_RANG,
  type MuammoFeature,
} from './xaritaTypes';
import { useAlifbo } from '@/alifbo';

const NOMA_LUM_RANG = '#6b7280';

export function MuammoQatlami({ features }: { features: MuammoFeature[] }) {
  const { tr } = useAlifbo();
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  // Klaster guruhini bir marta yaratish
  useEffect(() => {
    const group = L.markerClusterGroup({
      disableClusteringAtZoom: 13, // zoom 13+ da oddiy nuqtalar
      chunkedLoading: true,
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
    });
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  // Feature'lar o'zgarganda markerlarni qayta chizish
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();

    const layers = features.map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties;
      const statusRang = STATUS_RANGLARI[p.status ?? ''] ?? NOMA_LUM_RANG;
      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        color: p.shubhali ? SHUBHALI_RANG : statusRang,
        weight: p.shubhali ? 3 : 1.5,
        fillColor: statusRang,
        fillOpacity: 0.85,
      });
      const turiNomi = TURI_NOMLARI[p.turi ?? ''] ?? p.turi ?? 'Muammo';
      const statusNomi = STATUS_NOMLARI[p.status ?? ''] ?? p.status ?? '';
      marker.bindTooltip(
        `<div style="font-size:12px;line-height:1.5">` +
          `<b>#${p.id} — ${tr(turiNomi)}</b><br/>` +
          `${tr(statusNomi)}` +
          (p.shubhali
            ? ` · <span style="color:${SHUBHALI_RANG};font-weight:600">${tr('shubhali')}</span>`
            : '') +
          `</div>`,
      );
      return marker;
    });

    group.addLayers(layers);
  }, [features, tr]);

  return null;
}
