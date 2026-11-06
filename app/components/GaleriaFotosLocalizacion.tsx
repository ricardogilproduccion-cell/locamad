"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Save } from "lucide-react";
import { actualizarFotosLocalizacion } from "../actions/fotosLocalizacion";
import SelectorFotos from "./SelectorFotos";

const estadoInicial = { status: "idle" as const, message: "" };

export default function GaleriaFotosLocalizacion({
  localizacionId,
  fotosIniciales,
}: {
  localizacionId: string;
  fotosIniciales: string[];
}) {
  const router = useRouter();
  const [fotos, setFotos] = useState(fotosIniciales);
  const [subiendo, setSubiendo] = useState(false);
  const action = actualizarFotosLocalizacion.bind(null, localizacionId);
  const [state, formAction, pending] = useActionState(action, estadoInicial);
  const estadoProcesado = useRef(state);

  useEffect(() => {
    if (state.status === "success" && estadoProcesado.current !== state) {
      estadoProcesado.current = state;
      router.refresh();
    }
  }, [router, state]);

  const cambiosPendientes = fotos.join("\n") !== fotosIniciales.join("\n");

  return (
    <section className="border-t border-[#e1e4dd] pt-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Fotografías del espacio</h3>
        <span className="font-mono text-[11px] text-[#798176]">{fotos.length}</span>
      </div>
      <form action={formAction} className="mt-3">
        <input name="fotos" type="hidden" value={JSON.stringify(fotos)} />
        <SelectorFotos fotos={fotos} onChange={setFotos} onUploadingChange={setSubiendo} />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div aria-live="polite" className="min-w-0 text-[11px] text-[#5d675b]">
            {state.status === "success" && <span className="flex items-center gap-1"><Check size={13} />{state.message}</span>}
            {state.status === "error" && <span className="text-[#9b422d]">{state.message}</span>}
          </div>
          <button
            className="locamad-no-print flex h-9 shrink-0 items-center gap-2 bg-[#1769aa] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#12558b] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending || subiendo || !cambiosPendientes}
            type="submit"
          >
            {pending ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />}
            {pending ? "Guardando..." : "Guardar galería"}
          </button>
        </div>
      </form>
    </section>
  );
}