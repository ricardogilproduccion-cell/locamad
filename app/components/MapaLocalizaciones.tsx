'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocalizacionMapProps {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  esZbedepCentro: boolean;
  esZbe: boolean;
  distritoBarrio?: string | null;
  tipoEspacio: string;
  estadoProyecto?: string | null;
}

export default function MapaLocalizaciones({
  items,
  activeId,
  focusedId,
  focusRequest,
  onSelect,
  onFocus,
  onPinSelect,
}: {
  items: LocalizacionMapProps[];
  activeId: string | null;
  focusedId: string | null;
  focusRequest: number;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  onPinSelect: (id: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centro inicial en Madrid
    const map = L.map(mapContainerRef.current).setView([40.4168, -3.7038], 11);
    mapInstanceRef.current = map;
    markerLayerRef.current = L.layerGroup().addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    markersRef.current.clear();

    items.forEach((loc) => {
      const marker = L.marker([loc.latitud, loc.longitud], {
        icon: L.divIcon({
          className: 'locamad-marker-icon',
          html: `<span style="position:absolute;left:7px;top:3px;width:19px;height:19px;background:${loc.id === activeId || loc.id === focusedId ? '#b65337' : '#315d48'};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 5px #17201b66"></span>`,
          iconSize: [32, 38],
          iconAnchor: [16, 36],
          popupAnchor: [0, -32],
        }),
      }).addTo(markerLayer);

      const popup = document.createElement('div');
      popup.style.minWidth = '170px';
      const title = document.createElement('strong');
      title.textContent = loc.nombre;
      const detail = document.createElement('p');
      detail.style.cssText = 'margin:3px 0 0;font-size:11px;color:#64748b';
      detail.textContent = loc.distritoBarrio || loc.tipoEspacio;
      popup.append(title, detail);
      const detailsButton = document.createElement('button');
      detailsButton.type = 'button';
      detailsButton.textContent = 'Ver ficha técnica';
      detailsButton.style.cssText = 'display:block;margin-top:8px;padding:5px 8px;border:0;background:#315d48;color:white;font-size:11px;font-weight:600;cursor:pointer';
      detailsButton.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelect(loc.id);
      });
      popup.append(detailsButton);

      const zone = loc.esZbedepCentro ? 'ZBEDEP Centro' : loc.esZbe ? 'ZBE Madrid' : '';
      if (zone) {
        const badge = document.createElement('p');
        badge.style.cssText = 'margin:5px 0 0;font-size:10px;font-weight:700;color:#8a5832';
        badge.textContent = zone;
        popup.append(badge);
      }

      if (loc.estadoProyecto) {
        const statusColors: Record<string, string> = {
          PRESELECCIONADA: '#3d5d84',
          SCOUTING: '#806b2f',
          TRAMITANDO_PERMISO: '#a24e32',
          CONFIRMADA: '#38684a',
          DESCARTADA: '#666a64',
        };
        const statusLabels: Record<string, string> = {
          PRESELECCIONADA: 'Preseleccionada',
          SCOUTING: 'Scouting',
          TRAMITANDO_PERMISO: 'Tramitando permiso',
          CONFIRMADA: 'Confirmada',
          DESCARTADA: 'Descartada',
        };
        const badge = document.createElement('span');
        badge.style.cssText = `display:inline-block;margin-top:5px;padding:2px 6px;border-radius:3px;background:#eef2f5;color:${statusColors[loc.estadoProyecto] ?? '#596158'};font-size:10px;font-weight:700`;
        badge.textContent = statusLabels[loc.estadoProyecto] ?? loc.estadoProyecto;
        popup.append(badge);
      }

      marker.bindPopup(popup);
      marker.on('click', () => onPinSelect(loc.id));
      marker.on('mouseover', () => onFocus(loc.id));
      markersRef.current.set(loc.id, marker);
    });

    const itemEnfocado = items.find((item) => item.id === focusedId);
    const itemActivo = items.find((item) => item.id === activeId);

    if (!itemEnfocado && !itemActivo && items.length > 0) {
      map.fitBounds(
        L.latLngBounds(items.map((item) => [item.latitud, item.longitud])),
        { padding: [40, 40], maxZoom: 12 },
      );
    }

    const idEnfocado = itemEnfocado?.id ?? itemActivo?.id;
    const activa = itemEnfocado ?? itemActivo;
    const marcadorActivo = idEnfocado ? markersRef.current.get(idEnfocado) : null;
    if (activa && marcadorActivo) {
      map.flyTo([activa.latitud, activa.longitud], Math.max(map.getZoom(), 14), {
        animate: true,
        duration: 0.6,
      });
      marcadorActivo.openPopup();
    }
  }, [activeId, focusedId, focusRequest, items, onFocus, onPinSelect, onSelect]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[500px] rounded-xl border border-slate-200 shadow-inner z-0"
    />
  );
}