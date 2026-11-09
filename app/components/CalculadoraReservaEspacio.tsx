"use client";

import { Minus, Plus } from "lucide-react";
import {
  calcularMetrosLineales,
  type DatosLogistica,
  opcionesAfeccionTrafico,
  opcionesEstacionamiento,
} from "@/lib/logistica-localizacion";

type TipoVehiculo = "camionesPesados" | "camionesMedios" | "furgonetas";

const vehiculos: Array<{
  key: TipoVehiculo;
  label: string;
  longitud: number;
}> = [
  {
    key: "camionesPesados",
    label: "Camión pesado / Grupo electrógeno en camión",
    longitud: 14,
  },
  {
    key: "camionesMedios",
    label: "Camión medio / Tráiler vestuario y maquillaje",
    longitud: 10,
  },
  {
    key: "furgonetas",
    label: "Furgonetas de rodaje / Producción",
    longitud: 6,
  },
];

export default function CalculadoraReservaEspacio({
  value,
  onChange,
  disabled = false,
}: {
  value: DatosLogistica;
  onChange: (value: DatosLogistica) => void;
  disabled?: boolean;
}) {
  const total = calcularMetrosLineales(value.desgloseVehiculos);
  const plazas = Math.ceil(total / 5);

  const actualizarVehiculo = (key: TipoVehiculo, incremento: number) => {
    const cantidadActual = value.desgloseVehiculos[key];
    const cantidadNueva = Math.max(0, Math.min(99, cantidadActual + incremento));
    onChange({
      ...value,
      desgloseVehiculos: { ...value.desgloseVehiculos, [key]: cantidadNueva },
    });
  };

  return (
    <div className="border-t border-[#e1e4dd] pt-5">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">
        Calculadora de Reserva de Espacio (Vía Pública)
      </h4>
      <div className="mt-4">
        <div
          aria-live="polite"
          className="border border-[#b8cdbb] bg-[#edf4ed] px-4 py-4 text-center"
        >
          <p className="text-sm font-bold text-[#315d48]">
            Metros necesarios: {total} m
          </p>
          <p className="mt-1 text-xs text-[#596b59]">
            Equivalente a: ~{plazas} {plazas === 1 ? "plaza" : "plazas"} en cordón
          </p>
        </div>

        <div className="mt-3 space-y-2">
          {vehiculos.map(({ key, label, longitud }) => {
            const cantidad = value.desgloseVehiculos[key];
            return (
              <div
                className="flex items-center justify-between gap-3 border border-[#e1e4dd] bg-white px-3 py-2 text-xs text-[#50594f]"
                key={key}
              >
                <span className="min-w-0">
                  {label}
                  <span className="block text-[10px] text-[#858b82]">~{longitud} m por unidad</span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    aria-label={`Quitar ${label}`}
                    className="grid size-8 place-items-center border border-[#dfe3db] text-[#315d48] hover:bg-[#edf3ec] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={disabled || cantidad === 0}
                    onClick={() => actualizarVehiculo(key, -1)}
                    type="button"
                  >
                    <Minus size={15} />
                  </button>
                  <output aria-label={`${label}: ${cantidad}`} className="min-w-6 text-center text-sm font-semibold text-[#20251f]">
                    {cantidad}
                  </output>
                  <button
                    aria-label={`Añadir ${label}`}
                    className="grid size-8 place-items-center border border-[#dfe3db] text-[#315d48] hover:bg-[#edf3ec] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={disabled || cantidad === 99}
                    onClick={() => actualizarVehiculo(key, 1)}
                    type="button"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border border-[#e1e4dd] bg-white px-3 py-2 text-xs text-[#50594f]">
          <span>Margen de seguridad <span className="block text-[10px] text-[#858b82]">Pasos de 5 m</span></span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="Reducir margen de seguridad"
              className="grid size-8 place-items-center border border-[#dfe3db] text-[#315d48] hover:bg-[#edf3ec] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={disabled || value.desgloseVehiculos.margenManiobraM === 0}
              onClick={() => actualizarMargen(-5)}
              type="button"
            >
              <Minus size={15} />
            </button>
            <output aria-label={`Margen de seguridad: ${value.desgloseVehiculos.margenManiobraM} metros`} className="min-w-10 text-center text-sm font-semibold text-[#20251f]">
              {value.desgloseVehiculos.margenManiobraM} m
            </output>
            <button
              aria-label="Aumentar margen de seguridad"
              className="grid size-8 place-items-center border border-[#dfe3db] text-[#315d48] hover:bg-[#edf3ec] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={disabled || value.desgloseVehiculos.margenManiobraM >= 495}
              onClick={() => actualizarMargen(5)}
              type="button"
            >
              <Plus size={15} />
            </button>
          </div>
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
    </div>
  );

  function actualizarMargen(incremento: number) {
    const margenManiobraM = Math.max(
      0,
      Math.min(495, value.desgloseVehiculos.margenManiobraM + incremento),
    );
    onChange({
      ...value,
      desgloseVehiculos: { ...value.desgloseVehiculos, margenManiobraM },
    });
  }
}
