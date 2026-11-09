"use client";

import { useState } from "react";
import {
  calcularMetrosLineales,
  type DatosLogistica,
  type DesgloseVehiculos,
  opcionesAfeccionTrafico,
  opcionesEstacionamiento,
} from "@/lib/logistica-localizacion";

const vehiculos: Array<{
  key: keyof DesgloseVehiculos;
  label: string;
  longitud: string;
}> = [
  { key: "camionesLuces", label: "Camión pesado de luces", longitud: "~13 m" },
  { key: "camionesGripo", label: "Camión grúa / equipo", longitud: "~13 m" },
  { key: "grupoElectrogeno", label: "Grupo electrógeno sobre camión", longitud: "~13 m" },
  { key: "trailersVestuario", label: "Tráiler de vestuario / maquillaje", longitud: "~9 m" },
  { key: "furgonetas", label: "Furgoneta técnica", longitud: "~6 m" },
  { key: "espaciosSeguridad", label: "Espacio de seguridad / maniobra", longitud: "~5 m" },
];

export default function CalculadoraReservaEspacio({
  value,
  onChange,
  defaultOpen = false,
  disabled = false,
}: {
  value: DatosLogistica;
  onChange: (value: DatosLogistica) => void;
  defaultOpen?: boolean;
  disabled?: boolean;
}) {
  const [abierta, setAbierta] = useState(defaultOpen);
  const total = calcularMetrosLineales(value.desgloseVehiculos);

  const actualizarVehiculo = (key: keyof DesgloseVehiculos, count: number) => {
    onChange({
      ...value,
      desgloseVehiculos: { ...value.desgloseVehiculos, [key]: count },
    });
  };

  return (
    <details
      className="border-t border-[#e1e4dd] pt-5"
      onToggle={(event) => setAbierta(event.currentTarget.open)}
      open={abierta}
    >
      <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">
        Logística y Vía Pública
      </summary>
      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 border border-[#dfe3db] bg-white px-3 py-3">
          <span className="text-xs font-semibold text-[#50594f]">Reserva estimada</span>
          <span aria-live="polite" className="text-lg font-bold text-[#315d48]">{total} m lineales</span>
        </div>

        <div className="mt-3 space-y-2">
          {vehiculos.map(({ key, label, longitud }) => (
            <label
              className="flex items-center justify-between gap-3 border border-[#e1e4dd] bg-white px-3 py-2 text-xs text-[#50594f]"
              key={key}
            >
              <span>{label} <span className="text-[10px] text-[#858b82]">{longitud} c/u</span></span>
              <input
                aria-label={`Número: ${label}`}
                className="h-9 w-20 border border-[#dfe3db] px-2 text-sm text-[#20251f] outline-none focus:border-[#718a72]"
                max={99}
                min={0}
                disabled={disabled}
                onChange={(event) => actualizarVehiculo(key, Number(event.target.value))}
                type="number"
                value={value.desgloseVehiculos[key]}
              />
            </label>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
            Tipo de estacionamiento
            <select
              className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none focus:border-[#718a72]"
              disabled={disabled}
              onChange={(event) => onChange({
                ...value,
                tipoEstacionamiento: event.target.value as DatosLogistica["tipoEstacionamiento"],
              })}
              value={value.tipoEstacionamiento ?? ""}
            >
              {opcionesEstacionamiento.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
            Afección de tráfico
            <select
              className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none focus:border-[#718a72]"
              disabled={disabled}
              onChange={(event) => onChange({
                ...value,
                afeccionTrafico: event.target.value as DatosLogistica["afeccionTrafico"],
              })}
              value={value.afeccionTrafico ?? ""}
            >
              {opcionesAfeccionTrafico.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f] sm:col-span-2">
            Notas para Policía Municipal o Ayuntamiento
            <textarea
              className="min-h-20 resize-y border border-[#dfe3db] bg-white px-3 py-2 text-sm font-normal text-[#20251f] outline-none placeholder:text-[#92988f] focus:border-[#718a72]"
              disabled={disabled}
              maxLength={4000}
              onChange={(event) => onChange({ ...value, notasPermisos: event.target.value })}
              placeholder="Vados, paradas de autobús, hidrantes, calles peatonales..."
              rows={3}
              value={value.notasPermisos}
            />
          </label>
        </div>
      </div>
    </details>
  );
}
