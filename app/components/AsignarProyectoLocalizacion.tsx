"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Save } from "lucide-react";
import { guardarAsignacionProyecto } from "../actions/proyectos";

interface ProyectoCatalogo {
  id: string;
  nombre: string;
  tipo: string;
}

interface ProyectoAsignacion {
  proyectoId: string;
  estado: string;
  diasRodajeEstimados: number | null;
  notasProduccion: string | null;
}

const estados = [
  { value: "PRESELECCIONADA", label: "Preseleccionada" },
  { value: "SCOUTING", label: "Scouting" },
  { value: "TRAMITANDO_PERMISO", label: "Tramitando permiso" },
  { value: "CONFIRMADA", label: "Confirmada" },
  { value: "DESCARTADA", label: "Descartada" },
];

const estadoInicial = { status: "idle" as const, message: "" };

export default function AsignarProyectoLocalizacion({
  localizacionId,
  proyectos,
  asignaciones,
  proyectoActivoId,
}: {
  localizacionId: string;
  proyectos: ProyectoCatalogo[];
  asignaciones: ProyectoAsignacion[];
  proyectoActivoId: string;
}) {
  const router = useRouter();
  const action = guardarAsignacionProyecto.bind(null, localizacionId);
  const [state, formAction, pending] = useActionState(action, estadoInicial);
  const [proyectoId, setProyectoId] = useState(() => {
    if (proyectoActivoId !== "todos" && proyectos.some((proyecto) => proyecto.id === proyectoActivoId)) {
      return proyectoActivoId;
    }
    return asignaciones[0]?.proyectoId ?? proyectos[0]?.id ?? "";
  });
  const asignacionInicial = asignaciones.find((asignacion) => asignacion.proyectoId === proyectoId);
  const [estado, setEstado] = useState(asignacionInicial?.estado ?? "PRESELECCIONADA");
  const [dias, setDias] = useState(asignacionInicial?.diasRodajeEstimados?.toString() ?? "");
  const [notas, setNotas] = useState(asignacionInicial?.notasProduccion ?? "");
  const estadoProcesado = useRef(state);

  useEffect(() => {
    if (state.status === "success" && estadoProcesado.current !== state) {
      estadoProcesado.current = state;
      router.refresh();
    }
  }, [router, state]);

  const cambiarProyecto = (id: string) => {
    setProyectoId(id);
    const asignacion = asignaciones.find((item) => item.proyectoId === id);
    setEstado(asignacion?.estado ?? "PRESELECCIONADA");
    setDias(asignacion?.diasRodajeEstimados?.toString() ?? "");
    setNotas(asignacion?.notasProduccion ?? "");
  };

  return (
    <section className="border-t border-[#e1e4dd] pt-5">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Asignar a proyecto</h3>
      {proyectos.length === 0 ? (
        <p className="mt-3 text-xs text-[#737a71]">No hay proyectos disponibles.</p>
      ) : (
        <form action={formAction} className="mt-3 space-y-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
            Proyecto
            <select
              className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none focus:border-[#718a72]"
              name="proyectoId"
              onChange={(event) => cambiarProyecto(event.target.value)}
              value={proyectoId}
            >
              {proyectos.map((proyecto) => (
                <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
              Estado
              <select
                className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none focus:border-[#718a72]"
                name="estado"
                onChange={(event) => setEstado(event.target.value)}
                value={estado}
              >
                {estados.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
              Días estimados
              <input
                className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none focus:border-[#718a72]"
                min="0"
                name="diasRodajeEstimados"
                onChange={(event) => setDias(event.target.value)}
                placeholder="0"
                step="1"
                type="number"
                value={dias}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
            Notas de producción
            <textarea
              className="min-h-20 resize-y border border-[#dfe3db] bg-white px-3 py-2 text-sm font-normal text-[#20251f] outline-none placeholder:text-[#92988f] focus:border-[#718a72]"
              maxLength={2000}
              name="notasProduccion"
              onChange={(event) => setNotas(event.target.value)}
              placeholder="Notas específicas del rodaje..."
              rows={3}
              value={notas}
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            <div aria-live="polite" className="min-w-0 text-[11px] text-[#38684a]">
              {state.status === "success" && <span className="flex items-center gap-1"><Check size={13} />{state.message}</span>}
              {state.status === "error" && <span className="text-[#9b422d]">{state.message}</span>}
            </div>
            <button
              className="locamad-no-print flex h-9 shrink-0 items-center gap-2 bg-[#1769aa] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#12558b] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending || !proyectoId}
              type="submit"
            >
              {pending ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />}
              {pending ? "Guardando..." : "Guardar asignación"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}