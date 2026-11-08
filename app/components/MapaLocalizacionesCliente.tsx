"use client";

import dynamic from "next/dynamic";

interface LocalizacionMapItem {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  esZbedepCentro: boolean;
  esZbe: boolean;
  distritoBarrio: string | null;
  tipoEspacio: string;
  estadoProyecto?: string | null;
}

interface MapaLocalizacionesClienteProps {
  items: LocalizacionMapItem[];
  activeId: string | null;
  focusedId: string | null;
  focusRequest: number;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  onPinSelect: (id: string) => void;
}

const MapaLocalizaciones = dynamic(() => import("./MapaLocalizaciones"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[480px] items-center justify-center bg-[#e7e9e3] text-sm text-[#62685f]">
      Cargando mapa de Madrid...
    </div>
  ),
});

export default function MapaLocalizacionesCliente({
  items,
  activeId,
  focusedId,
  focusRequest,
  onSelect,
  onFocus,
  onPinSelect,
}: MapaLocalizacionesClienteProps) {
  return (
    <MapaLocalizaciones
      activeId={activeId}
      focusedId={focusedId}
      focusRequest={focusRequest}
      items={items}
      onSelect={onSelect}
      onFocus={onFocus}
      onPinSelect={onPinSelect}
    />
  );
}