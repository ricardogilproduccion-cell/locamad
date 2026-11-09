"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair, LoaderCircle, MapPin, Save, X } from "lucide-react";
import { crearLocalizacion } from "../actions/crearLocalizacion";
import type { CoordenadasPunto } from "./MapaPuntoLocalizacion";
import SelectorFotos from "./SelectorFotos";
import CalculadoraReservaEspacio from "./CalculadoraReservaEspacio";
import {
  crearDatosLogisticaIniciales,
  type DatosLogistica,
} from "@/lib/logistica-localizacion";

const MapaPuntoLocalizacion = dynamic(() => import("./MapaPuntoLocalizacion"), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse bg-[#e7e9e3]" />,
});

const estadoInicial = { status: "idle" as const, message: "" };

export default function NuevaLocalizacionModal({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (mensaje: string) => void;
}) {
  const [state, formAction, pending] = useActionState(crearLocalizacion, estadoInicial);
  const creationHandled = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [coordenadas, setCoordenadas] = useState<CoordenadasPunto | null>(null);
  const [geocodificando, setGeocodificando] = useState(false);
  const [errorGeocodificacion, setErrorGeocodificacion] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [logistica, setLogistica] = useState<DatosLogistica>(crearDatosLogisticaIniciales);

  const ubicarDireccion = async () => {
    if (!formRef.current) return;
    const datos = new FormData(formRef.current);
    const direccion = String(datos.get("direccion") ?? "").trim();
    const municipio = String(datos.get("municipio") ?? "").trim();
    if (!direccion || !municipio) {
      setErrorGeocodificacion("Introduce la dirección y el municipio antes de buscar.");
      return;
    }

    setGeocodificando(true);
    setErrorGeocodificacion("");
    try {
      const parametros = new URLSearchParams({
        q: `${direccion}, ${municipio}, Comunidad de Madrid, España`,
        format: "jsonv2",
        addressdetails: "1",
        countrycodes: "es",
        limit: "1",
        viewbox: "-3.95,40.60,-3.55,40.30",
      });
      const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros}`, {
        headers: { "Accept-Language": "es" },
        signal: AbortSignal.timeout(12000),
      });
      if (!respuesta.ok) throw new Error("Nominatim no está disponible en este momento.");

      const resultados = (await respuesta.json()) as Array<{
        lat: string;
        lon: string;
        address?: Record<string, string>;
      }>;
      const resultado = resultados[0];
      if (!resultado) {
        setErrorGeocodificacion("No se encontró la dirección. Prueba con el nombre de la calle y el municipio.");
        return;
      }

      const lat = Number(resultado.lat);
      const lng = Number(resultado.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setErrorGeocodificacion("La API devolvió unas coordenadas no válidas.");
        return;
      }

      setLatitud(String(lat));
      setLongitud(String(lng));
      setCoordenadas({ latitud: lat, longitud: lng });
      const barrio =
        resultado.address?.suburb ??
        resultado.address?.neighbourhood ??
        resultado.address?.city_district ??
        resultado.address?.quarter;
      const campoBarrio = formRef.current.elements.namedItem("distritoBarrio");
      if (barrio && campoBarrio instanceof HTMLInputElement && !campoBarrio.value) {
        campoBarrio.value = barrio;
      }
    } catch {
      setErrorGeocodificacion("No se pudo consultar OpenStreetMap. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setGeocodificando(false);
    }
  };

  const cambiarLatitud = (valor: string) => {
    setLatitud(valor);
    const lat = Number(valor);
    const lng = Number(longitud);
    setCoordenadas(valor && longitud && Number.isFinite(lat) && Number.isFinite(lng) ? { latitud: lat, longitud: lng } : null);
  };

  const cambiarLongitud = (valor: string) => {
    setLongitud(valor);
    const lat = Number(latitud);
    const lng = Number(valor);
    setCoordenadas(latitud && valor && Number.isFinite(lat) && Number.isFinite(lng) ? { latitud: lat, longitud: lng } : null);
  };

  useEffect(() => {
    if (state.status === "success" && !creationHandled.current) {
      creationHandled.current = true;
      onCreated(state.message);
    }
  }, [onCreated, state]);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#17201b]/45 p-3 sm:p-6" role="presentation">
      <button
        aria-label="Cerrar formulario"
        className="absolute inset-0 size-full cursor-default"
        onClick={onCancel}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-labelledby="nueva-localizacion-titulo"
        aria-modal="true"
        className="relative z-10 flex max-h-[94vh] w-full max-w-[760px] flex-col border border-[#dfe2db] bg-[#f8f9f6] shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[#e1e4dd] bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Catálogo de rodajes</p>
            <h2 className="mt-1 text-lg font-semibold" id="nueva-localizacion-titulo">Nueva localización</h2>
          </div>
          <button
            aria-label="Cerrar formulario"
            className="grid size-9 place-items-center border border-[#e1e4dd] text-[#596158] hover:bg-[#f5f6f3]"
            onClick={onCancel}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col" ref={formRef}>
          <input name="fotos" type="hidden" value={JSON.stringify(fotos)} />
          <input name="desgloseVehiculos" type="hidden" value={JSON.stringify(logistica.desgloseVehiculos)} />
          <input name="tipoEstacionamiento" type="hidden" value={logistica.tipoEstacionamiento ?? ""} />
          <input name="afeccionTrafico" type="hidden" value={logistica.afeccionTrafico ?? ""} />
          <input name="notasPermisos" type="hidden" value={logistica.notasPermisos} />
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Dirección y geolocalización</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CampoFormulario className="sm:col-span-2" label="Dirección" name="direccion" placeholder="Calle y número, Madrid" required />
                <CampoFormulario label="Municipio" name="municipio" placeholder="Madrid" required />
                <div className="flex items-end">
                  <button
                    className="flex h-10 w-full items-center justify-center gap-2 border border-[#315d48] bg-[#edf3ec] px-3 text-sm font-semibold text-[#315d48] transition-colors hover:bg-[#e2ece1] disabled:cursor-wait disabled:opacity-60"
                    disabled={geocodificando}
                    onClick={ubicarDireccion}
                    type="button"
                  >
                    {geocodificando ? <LoaderCircle className="animate-spin" size={16} /> : <Crosshair size={16} />}
                    {geocodificando ? "Buscando dirección..." : "Ubicar en mapa"}
                  </button>
                </div>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
                  Latitud
                  <input
                    className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none placeholder:text-[#92988f] focus:border-[#718a72]"
                    max="90"
                    min="-90"
                    name="latitud"
                    onChange={(event) => cambiarLatitud(event.target.value)}
                    placeholder="40.4168"
                    required
                    step="any"
                    type="number"
                    value={latitud}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
                  Longitud
                  <input
                    className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none placeholder:text-[#92988f] focus:border-[#718a72]"
                    max="180"
                    min="-180"
                    name="longitud"
                    onChange={(event) => cambiarLongitud(event.target.value)}
                    placeholder="-3.7038"
                    required
                    step="any"
                    type="number"
                    value={longitud}
                  />
                </label>
              </div>
              {errorGeocodificacion && (
                <p className="mt-2 text-xs text-[#9b422d]" role="alert">{errorGeocodificacion}</p>
              )}
              {coordenadas && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#315d48]" role="status">
                  <MapPin size={13} /> Punto ubicado: {coordenadas.latitud.toFixed(5)}, {coordenadas.longitud.toFixed(5)}
                </p>
              )}
              <div className="mt-3 overflow-hidden border border-[#dfe3db]">
                <MapaPuntoLocalizacion coordenadas={coordenadas} />
              </div>
              <p className="mt-1.5 text-[10px] text-[#858b82]">Búsqueda en OpenStreetMap, priorizada en la Comunidad de Madrid.</p>
            </section>

            <section className="border-t border-[#e1e4dd] pt-5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Datos generales</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CampoFormulario label="Nombre del espacio" name="nombre" placeholder="Nombre de la localización" required />
                <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
                  Tipo de inmueble
                  <select className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none focus:border-[#718a72]" defaultValue="" name="tipoEspacio" required>
                    <option disabled value="">Seleccionar tipo</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Palacete">Palacete</option>
                    <option value="Vivienda">Vivienda</option>
                    <option value="Exterior">Exterior</option>
                  </select>
                </label>
                <CampoFormulario className="sm:col-span-2" label="Distrito / barrio" name="distritoBarrio" placeholder="Centro / La Latina" />
              </div>
            </section>

            <section className="border-t border-[#e1e4dd] pt-5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Parámetros técnicos de rodaje</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CampoFormulario label="Potencia eléctrica (kW)" min="0" name="potenciaElectricaKw" placeholder="Ej. 25" step="0.1" type="number" />
                <CampoFormulario label="Gálibo para camiones (m)" min="0" name="galiboCamionesM" placeholder="Ej. 3.5" step="0.1" type="number" />
                <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f] sm:col-span-2">
                  Aparcamiento SER
                  <select className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none focus:border-[#718a72]" defaultValue="LIBRE" name="aparcamientoSer">
                    <option value="LIBRE">No SER</option>
                    <option value="ZONA_VERDE">Zona Verde</option>
                    <option value="ZONA_AZUL">Zona Azul</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <CheckFormulario label="ZBE Madrid" name="esZbe" />
                <CheckFormulario label="ZBEDEP Centro" name="esZbedepCentro" />
                <CheckFormulario label="Base de producción" name="espacioBaseProd" />
                <CheckFormulario label="Toma de agua disponible" name="tomaAgua" />
              </div>
            </section>

            <CalculadoraReservaEspacio onChange={setLogistica} value={logistica} />

            <section className="border-t border-[#e1e4dd] pt-5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Contacto y acometida</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CampoFormulario label="Nombre de contacto" name="contactoNombre" placeholder="Persona responsable" />
                <CampoFormulario label="Teléfono" name="contactoTelefono" placeholder="600 000 000" type="tel" />
                <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f] sm:col-span-2">
                  Notas de acometida
                  <textarea
                    className="min-h-20 resize-y border border-[#dfe3db] bg-white px-3 py-2 text-sm font-normal text-[#20251f] outline-none placeholder:text-[#92988f] focus:border-[#718a72]"
                    name="notasAcometida"
                    placeholder="Detalles de acceso, acometida eléctrica o coordinación..."
                    rows={3}
                  />
                </label>
              </div>
            </section>

            <section className="border-t border-[#e1e4dd] pt-5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Fotografías del espacio</h3>
              <div className="mt-3">
                <SelectorFotos fotos={fotos} onChange={setFotos} onUploadingChange={setSubiendoFotos} />
              </div>
            </section>

            {state.status === "error" && (
              <p className="border border-[#e9c2b5] bg-[#fff4f0] px-3 py-2.5 text-xs text-[#9b422d]" role="alert">
                {state.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-[#e1e4dd] bg-white px-5 py-4 sm:px-7">
            <button className="h-10 border border-[#dfe3db] px-4 text-sm font-medium text-[#596158] hover:bg-[#f5f6f3]" onClick={onCancel} type="button">
              Cancelar
            </button>
            <button className="flex h-10 items-center gap-2 bg-[#1769aa] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#12558b] disabled:cursor-not-allowed disabled:opacity-60" disabled={pending || subiendoFotos} type="submit">
              {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
              {pending ? "Guardando..." : "Guardar localización"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CampoFormulario({
  className = "",
  label,
  max,
  min,
  name,
  placeholder,
  required = false,
  step,
  type = "text",
}: {
  className?: string;
  label: string;
  max?: string;
  min?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  type?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-xs font-medium text-[#50594f] ${className}`}>
      {label}{required && <span className="sr-only"> (obligatorio)</span>}
      <input
        className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none placeholder:text-[#92988f] focus:border-[#718a72]"
        max={max}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
      />
    </label>
  );
}

function CheckFormulario({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex min-h-10 items-center gap-2.5 border border-[#e1e4dd] bg-white px-3 text-xs font-medium text-[#50594f]">
      <input className="size-4 accent-[#315d48]" name={name} type="checkbox" />
      {label}
    </label>
  );
}