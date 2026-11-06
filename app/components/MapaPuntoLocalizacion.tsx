"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface CoordenadasPunto {
  latitud: number;
  longitud: number;
}

export default function MapaPuntoLocalizacion({
  coordenadas,
}: {
  coordenadas: CoordenadasPunto | null;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadorRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return;

    const mapa = L.map(contenedorRef.current, { scrollWheelZoom: false }).setView(
      [40.4168, -3.7038],
      11,
    );
    mapaRef.current = mapa;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapa);

    return () => {
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    mapa.invalidateSize();
    if (!coordenadas) {
      marcadorRef.current?.remove();
      marcadorRef.current = null;
      mapa.setView([40.4168, -3.7038], 11);
      return;
    }

    const punto: L.LatLngExpression = [coordenadas.latitud, coordenadas.longitud];
    if (marcadorRef.current) {
      marcadorRef.current.setLatLng(punto);
    } else {
      marcadorRef.current = L.marker(punto, {
        icon: L.divIcon({
          className: "locamad-marker-icon",
          html: '<span style="position:absolute;left:7px;top:3px;width:19px;height:19px;background:#1769aa;border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 5px #17201b66"></span>',
          iconSize: [32, 38],
          iconAnchor: [16, 36],
        }),
      }).addTo(mapa);
    }

    mapa.flyTo(punto, 16, { animate: true, duration: 0.6 });
  }, [coordenadas]);

  return <div aria-label="Previsualización de la ubicación" className="h-40 w-full" ref={contenedorRef} role="img" />;
}