"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { nombreRol, puedeGestionarLocalizaciones } from "@/lib/roles";
import {
  ArrowUpRight,
  Building2,
  Check,
  CircleCheck,
  CircleHelp,
  Compass,
  Download,
  Droplets,
  LogOut,
  LoaderCircle,
  Mail,
  MapPin,
  Plus,
  Phone,
  Printer,
  Search,
  Save,
  SlidersHorizontal,
  Sun,
  Truck,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import NuevaLocalizacionModal from "./NuevaLocalizacionModal";
import GaleriaFotosLocalizacion from "./GaleriaFotosLocalizacion";
import AsignarProyectoLocalizacion from "./AsignarProyectoLocalizacion";
import MapaLocalizacionesCliente from "./MapaLocalizacionesCliente";
import { crearProyecto } from "../actions/crearProyecto";

interface ContactoLocalizacion {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  rolCargo: string | null;
  notasTrato: string | null;
}

interface ProyectoCatalogo {
  id: string;
  nombre: string;
  tipo: string;
}

interface ProyectoAsignacion {
  id: string;
  proyectoId: string;
  localizacionId: string;
  estado: string;
  diasRodajeEstimados: number | null;
  notasProduccion: string | null;
  proyecto: ProyectoCatalogo;
}

interface Localizacion {
  id: string;
  nombre: string;
  tipoEspacio: string;
  estilo: string | null;
  direccion: string;
  municipio: string;
  distritoBarrio: string | null;
  latitud: number;
  longitud: number;
  titularidad: string;
  potenciaElectricaKw: number | null;
  tomaAgua: boolean;
  aseosDisponibles: boolean;
  galiboCamionesM: number | null;
  espacioBaseProd: boolean;
  nivelRuidoDb: number | null;
  orientacionLuz: string | null;
  esZbe: boolean;
  esZbedepCentro: boolean;
  aparcamientoSer: string;
  fotos: string[];
  asignaciones: ProyectoAsignacion[];
  valoracion: number;
  estado: string;
  contactos: ContactoLocalizacion[];
}

const estadoLabel: Record<string, string> = {
  PROPUESTA: "Propuesta",
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  DESCARTADA: "Descartada",
  CONTRATADA: "Contratada",
};

const aparcamientoLabel: Record<string, string> = {
  LIBRE: "Libre",
  SER_AZUL: "SER azul",
  SER_VERDE: "SER verde",
  PROHIBIDO: "Prohibido",
};

const estadoProyectoLabel: Record<string, string> = {
  PRESELECCIONADA: "Preseleccionada",
  SCOUTING: "Scouting",
  TRAMITANDO_PERMISO: "Tramitando permiso",
  CONFIRMADA: "Confirmada",
  DESCARTADA: "Descartada",
};

function colorEstadoProyecto(estado: string) {
  switch (estado) {
    case "PRESELECCIONADA":
      return "bg-[#e6edf7] text-[#3d5d84]";
    case "SCOUTING":
      return "bg-[#f4f0dc] text-[#806b2f]";
    case "TRAMITANDO_PERMISO":
      return "bg-[#f9e9df] text-[#a24e32]";
    case "CONFIRMADA":
      return "bg-[#e5f0e7] text-[#38684a]";
    case "DESCARTADA":
      return "bg-[#ececea] text-[#666a64]";
    default:
      return "bg-[#f0f2ed] text-[#5d675b]";
  }
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

export default function ExploradorLocalizaciones({
  localizaciones,
  proyectos,
  usuario,
}: {
  localizaciones: Localizacion[];
  proyectos: ProyectoCatalogo[];
  usuario: { nombre: string; rol: string } | null;
}) {
  const router = useRouter();
  const puedeGestionar = puedeGestionarLocalizaciones(usuario?.rol);
  const [busqueda, setBusqueda] = useState("");
  const [soloZbedep, setSoloZbedep] = useState(false);
  const [soloBase, setSoloBase] = useState(false);
  const [potenciaMinima, setPotenciaMinima] = useState("");
  const [localizacionActivaId, setLocalizacionActivaId] = useState<string | null>(null);
  const [solicitudFocoMapa, setSolicitudFocoMapa] = useState(0);
  const [modalNuevaLocalizacion, setModalNuevaLocalizacion] = useState(false);
  const [modalNuevoProyecto, setModalNuevoProyecto] = useState(false);
  const [notificacion, setNotificacion] = useState("");
  const [proyectoActivoId, setProyectoActivoId] = useState("todos");

  const seleccionarLocalizacion = (id: string) => {
    setLocalizacionActivaId(id);
    setSolicitudFocoMapa((solicitud) => solicitud + 1);
  };

  const termino = normalizar(busqueda.trim());
  const minimoKw = potenciaMinima === "" ? null : Number(potenciaMinima);
  const filtradas = localizaciones.filter((localizacion) => {
    const texto = normalizar(
      `${localizacion.nombre} ${localizacion.direccion} ${localizacion.distritoBarrio ?? ""}`,
    );

    return (
      (!termino || texto.includes(termino)) &&
      (!soloZbedep || localizacion.esZbedepCentro) &&
      (!soloBase || localizacion.espacioBaseProd) &&
      (proyectoActivoId === "todos" || localizacion.asignaciones.some((asignacion) => asignacion.proyectoId === proyectoActivoId)) &&
      (minimoKw === null || (localizacion.potenciaElectricaKw ?? 0) >= minimoKw)
    );
  });

  const localizacionActiva = localizaciones.find(
    (localizacion) => localizacion.id === localizacionActivaId,
  );
  const enCentro = localizaciones.filter((localizacion) => localizacion.esZbedepCentro).length;
  const conBase = localizaciones.filter((localizacion) => localizacion.espacioBaseProd).length;

  useEffect(() => {
    if (!localizacionActivaId) return;
    document.getElementById(`localizacion-${localizacionActivaId}`)?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [localizacionActivaId]);

  useEffect(() => {
    if (!localizacionActiva && !modalNuevaLocalizacion && !modalNuevoProyecto) return;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLocalizacionActivaId(null);
        setModalNuevaLocalizacion(false);
        setModalNuevoProyecto(false);
      }
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [localizacionActiva, modalNuevaLocalizacion, modalNuevoProyecto]);

  useEffect(() => {
    if (!notificacion) return;
    const timer = window.setTimeout(() => setNotificacion(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notificacion]);

  const confirmarCreacion = (mensaje: string) => {
    setModalNuevaLocalizacion(false);
    setBusqueda("");
    setSoloZbedep(false);
    setSoloBase(false);
    setPotenciaMinima("");
    setLocalizacionActivaId(null);
    setNotificacion(mensaje);
    router.refresh();
  };

  const confirmarProyectoCreado = (proyectoId: string, mensaje: string) => {
    setModalNuevoProyecto(false);
    setProyectoActivoId(proyectoId);
    setLocalizacionActivaId(null);
    setNotificacion(mensaje);
    router.refresh();
  };

  const alternarFiltro = (activo: boolean) =>
    `flex h-9 items-center gap-2 border px-3 text-xs font-medium transition-colors ${
      activo
        ? "border-[#315d48] bg-[#e8f0e9] text-[#315d48]"
        : "border-[#dfe3db] bg-white text-[#667064] hover:border-[#aeb9aa]"
    }`;

  const descargarCsvProyecto = () => {
    if (proyectoActivoId === "todos") return;

    const escaparCelda = (valor: string | number | null | undefined) => {
      const texto = String(valor ?? "");
      return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };
    const filas: (string | number | null | undefined)[][] = [
      [
        "Nombre",
        "Tipo",
        "Dirección",
        "Municipio/Distrito",
        "Estado de rodaje",
        "Potencia (kW)",
        "Gálibo (m)",
        "Tipo SER",
        "ZBE",
        "Base de producción",
        "Contacto",
        "Teléfono",
        "Notas de producción",
      ],
      ...localizaciones
        .filter((localizacion) =>
          localizacion.asignaciones.some((asignacion) => asignacion.proyectoId === proyectoActivoId),
        )
        .map((localizacion) => {
          const asignacion = localizacion.asignaciones.find(
            (item) => item.proyectoId === proyectoActivoId,
          );
          return [
            localizacion.nombre,
            localizacion.tipoEspacio,
            localizacion.direccion,
            [localizacion.municipio, localizacion.distritoBarrio].filter(Boolean).join(" / "),
            asignacion ? estadoProyectoLabel[asignacion.estado] ?? asignacion.estado : "",
            localizacion.potenciaElectricaKw,
            localizacion.galiboCamionesM,
            localizacion.aparcamientoSer === "LIBRE"
              ? "No SER"
              : aparcamientoLabel[localizacion.aparcamientoSer] ?? localizacion.aparcamientoSer,
            localizacion.esZbe ? "Sí" : "No",
            localizacion.espacioBaseProd ? "Sí" : "No",
            localizacion.contactos.map((contacto) => contacto.nombre).join(", "),
            localizacion.contactos.map((contacto) => contacto.telefono).filter(Boolean).join(", "),
            asignacion?.notasProduccion,
          ];
        }),
    ];
    const contenido = `\uFEFF${filas.map((fila) => fila.map(escaparCelda).join(";")).join("\r\n")}`;
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    const proyecto = proyectos.find((item) => item.id === proyectoActivoId);
    const nombreArchivo = (proyecto?.nombre ?? "proyecto")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    enlace.href = url;
    enlace.download = `localizaciones-${nombreArchivo || "proyecto"}.csv`;
    enlace.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-h-screen bg-[#f2f3ef] text-[#20251f]">
      <header className="flex h-[68px] items-center justify-between border-b border-[#dfe2db] bg-white px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-[#183d32] text-white">
            <Compass size={19} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none tracking-[0.04em]">LOCAMAD</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#747b72]">Localizaciones de rodaje</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <label className="flex h-9 max-w-[190px] items-center border border-[#dfe3db] bg-white px-2.5 text-[11px] font-medium text-[#687166] sm:text-xs">
            <span className="sr-only">Proyecto activo</span>
            <select
              aria-label="Filtrar por proyecto"
              className="min-w-0 flex-1 bg-transparent text-[#50594f] outline-none"
              onChange={(event) => {
                setProyectoActivoId(event.target.value);
                setLocalizacionActivaId(null);
              }}
              value={proyectoActivoId}
            >
              <option value="todos">Todos los espacios</option>
              {proyectos.map((proyecto) => (
                <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</option>
              ))}
            </select>
          </label>
          <button
            aria-label="Descargar CSV"
            className="flex h-9 items-center gap-1.5 whitespace-nowrap border border-[#dfe3db] bg-white px-2.5 text-[11px] font-semibold text-[#465344] transition-colors hover:bg-[#f5f6f3] disabled:cursor-not-allowed disabled:opacity-45 sm:gap-2 sm:px-3 sm:text-xs"
            disabled={proyectoActivoId === "todos"}
            onClick={descargarCsvProyecto}
            title={proyectoActivoId === "todos" ? "Selecciona un proyecto para exportar" : "Descargar localizaciones del proyecto"}
            type="button"
          >
            <Download size={15} /> Descargar CSV
          </button>
          {puedeGestionar && (
            <button
              className="flex h-9 items-center gap-1.5 whitespace-nowrap border border-[#1769aa] bg-white px-2.5 text-[11px] font-semibold text-[#1769aa] transition-colors hover:bg-[#edf5fb] sm:gap-2 sm:px-3 sm:text-xs"
              onClick={() => setModalNuevoProyecto(true)}
              type="button"
            >
              <Plus size={15} /> Nuevo Proyecto
            </button>
          )}
          {usuario && (
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[160px] truncate text-xs font-semibold text-[#31382f]">{usuario.nombre}</p>
              <p className="text-[10px] text-[#747b72]">{nombreRol(usuario.rol)}</p>
            </div>
          )}
          {puedeGestionar && (
            <button
              className="flex h-9 items-center gap-1.5 whitespace-nowrap bg-[#1769aa] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#12558b] sm:gap-2 sm:px-4 sm:text-sm"
              onClick={() => setModalNuevaLocalizacion(true)}
              type="button"
            >
              <Plus size={16} /> Nueva localización
            </button>
          )}
          {usuario ? (
            <button
              aria-label="Cerrar sesión"
              className="flex h-9 items-center gap-2 border border-[#e1e4dd] px-3 text-xs font-medium text-[#596158] hover:bg-[#f5f6f3]"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              type="button"
            >
              <LogOut size={15} /> <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          ) : (
            <Link className="flex h-9 items-center border border-[#e1e4dd] px-3 text-xs font-medium text-[#596158] hover:bg-[#f5f6f3]" href="/login">
              Iniciar sesión
            </Link>
          )}
          <button aria-label="Ayuda" className="grid size-9 place-items-center rounded-md border border-[#e1e4dd] text-[#596158] hover:bg-[#f5f6f3]">
            <CircleHelp size={17} />
          </button>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-68px)] max-w-[1800px] grid-cols-1 lg:grid-cols-[minmax(400px,0.82fr)_minmax(0,1.18fr)]">
        <section className="flex min-h-[560px] flex-col border-r border-[#dfe2db] bg-[#f8f9f6] lg:h-[calc(100vh-68px)]">
          <div className="border-b border-[#e3e6df] px-5 pb-4 pt-6 sm:px-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#728071]">Explorador · Madrid</p>
                <h1 className="mt-2 text-[26px] font-semibold leading-tight">Localizaciones</h1>
              </div>
              <span className="pb-1 font-mono text-sm text-[#71786f]">
                {String(filtradas.length).padStart(2, "0")} / {String(localizaciones.length).padStart(2, "0")}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 divide-x divide-[#e1e4dc] border-y border-[#e1e4dc] py-3">
              <div className="pr-2">
                <p className="font-mono text-lg font-semibold">{localizaciones.length}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-[#737a71]">En catálogo</p>
              </div>
              <div className="px-3">
                <p className="font-mono text-lg font-semibold">{enCentro}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-[#737a71]">ZBEDEP Centro</p>
              </div>
              <div className="pl-3">
                <p className="font-mono text-lg font-semibold">{conBase}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-[#737a71]">Base de prod.</p>
              </div>
            </div>

            <label className="mt-4 flex h-10 items-center gap-2.5 border border-[#dfe3db] bg-white px-3 text-[#7b8179] focus-within:border-[#718a72]">
              <Search size={16} />
              <input
                aria-label="Buscar por nombre, calle o barrio"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#20251f] outline-none placeholder:text-[#92988f]"
                onChange={(event) => {
                  setBusqueda(event.target.value);
                  setLocalizacionActivaId(null);
                }}
                placeholder="Nombre, calle o barrio..."
                type="search"
                value={busqueda}
              />
              <SlidersHorizontal size={15} aria-hidden="true" />
            </label>

            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                aria-pressed={soloZbedep}
                className={alternarFiltro(soloZbedep)}
                onClick={() => {
                  setSoloZbedep((activo) => !activo);
                  setLocalizacionActivaId(null);
                }}
                type="button"
              >
                <MapPin size={14} /> ZBEDEP Centro
              </button>
              <button
                aria-pressed={soloBase}
                className={alternarFiltro(soloBase)}
                onClick={() => {
                  setSoloBase((activo) => !activo);
                  setLocalizacionActivaId(null);
                }}
                type="button"
              >
                <Building2 size={14} /> Base de producción
              </button>
              <label className="flex h-9 min-w-[148px] flex-1 items-center gap-2 border border-[#dfe3db] bg-white px-2.5 text-[#687166] focus-within:border-[#718a72]">
                <Zap size={14} className="shrink-0 text-[#b68a3a]" />
                <span className="shrink-0 text-[11px]">Mín.</span>
                <input
                  aria-label="Potencia eléctrica mínima en kilovatios"
                  className="w-full min-w-0 bg-transparent text-xs text-[#20251f] outline-none placeholder:text-[#92988f]"
                  min="0"
                  onChange={(event) => {
                    setPotenciaMinima(event.target.value);
                    setLocalizacionActivaId(null);
                  }}
                  placeholder="kW"
                  step="1"
                  type="number"
                  value={potenciaMinima}
                />
                <span className="text-[10px] text-[#92988f]">kW</span>
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {filtradas.length === 0 ? (
              <div className="grid min-h-48 place-items-center border border-dashed border-[#cfd5cb] bg-white p-8 text-center">
                <div>
                  <MapPin className="mx-auto text-[#8b9788]" size={22} />
                  <p className="mt-3 text-sm font-medium">No hay resultados</p>
                  <p className="mt-1 text-xs text-[#7b8179]">Prueba a cambiar los filtros de búsqueda.</p>
                  <button
                    className="mt-3 text-xs font-semibold text-[#315d48] underline underline-offset-2"
                    onClick={() => {
                      setBusqueda("");
                      setSoloZbedep(false);
                      setSoloBase(false);
                      setPotenciaMinima("");
                      setProyectoActivoId("todos");
                      setLocalizacionActivaId(null);
                    }}
                    type="button"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtradas.map((localizacion, index) => {
                  const activa = localizacion.id === localizacionActivaId;
                  const asignacionActiva = localizacion.asignaciones.find(
                    (asignacion) => asignacion.proyectoId === proyectoActivoId,
                  );
                  return (
                    <article
                      aria-current={activa ? "true" : undefined}
                      aria-label={`Abrir ficha técnica de ${localizacion.nombre}`}
                      className={`group block w-full cursor-pointer border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769aa] ${
                        activa
                          ? "border-[#315d48] bg-[#f0f5ef] ring-1 ring-[#315d48]"
                          : "border-[#e1e4dd] bg-white hover:border-[#9eac9d]"
                      }`}
                      id={`localizacion-${localizacion.id}`}
                      key={localizacion.id}
                      onClick={() => seleccionarLocalizacion(localizacion.id)}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          seleccionarLocalizacion(localizacion.id);
                        }
                      }}
                      tabIndex={0}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 gap-3">
                          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-[#edf1ea] font-mono text-[11px] font-semibold text-[#4c654b]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-1 block text-sm font-semibold leading-5">{localizacion.nombre}</span>
                            <span className="mt-1 line-clamp-1 block text-xs text-[#747b72]">
                              {localizacion.tipoEspacio}{localizacion.estilo ? ` · ${localizacion.estilo}` : ""}
                            </span>
                            <span className="mt-1.5 flex items-center gap-1 text-[11px] text-[#858b82]">
                              <MapPin size={12} />
                              {localizacion.distritoBarrio || localizacion.municipio} · {localizacion.direccion}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 bg-[#f0f2ed] px-2 py-1 text-[10px] font-medium text-[#5d675b]">
                          {estadoLabel[localizacion.estado] ?? localizacion.estado}
                        </span>
                      </span>

                      <span className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#edf0e9] pt-3 sm:grid-cols-4">
                        <span className="flex items-center gap-1.5 text-[11px] text-[#596158]">
                          <Zap size={13} className="text-[#b68a3a]" /> {localizacion.potenciaElectricaKw ?? "—"} kW
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-[#596158]">
                          <Truck size={14} className="text-[#697d69]" />
                          {localizacion.galiboCamionesM != null ? `${localizacion.galiboCamionesM} m gálibo` : "Gálibo —"}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-[#596158]">
                          <Building2 size={13} className="text-[#697d69]" />
                          {localizacion.espacioBaseProd ? "Base producción" : "Sin base"}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-[#596158]">
                          <Check size={13} className="text-[#568365]" />
                          {localizacion.tomaAgua ? "Agua disponible" : "Sin toma de agua"}
                        </span>
                      </span>

                      <span className="mt-3 flex flex-wrap items-center gap-1.5">
                        {localizacion.esZbedepCentro && <span className="bg-[#f9e9df] px-2 py-1 text-[10px] font-semibold text-[#a24e32]">ZBEDEP Centro</span>}
                        {localizacion.esZbe && <span className="bg-[#f4f0dc] px-2 py-1 text-[10px] font-semibold text-[#826a2c]">ZBE Madrid</span>}
                        {asignacionActiva && (
                          <span className={`px-2 py-1 text-[10px] font-semibold ${colorEstadoProyecto(asignacionActiva.estado)}`}>
                            {estadoProyectoLabel[asignacionActiva.estado] ?? asignacionActiva.estado}
                          </span>
                        )}
                        <button
                          className="ml-auto flex h-8 items-center gap-2 bg-[#1769aa] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#12558b]"
                          type="button"
                        >
                          Ver detalles <ArrowUpRight size={14} />
                        </button>
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-[#e1e4dd] px-5 py-3 text-[10px] text-[#828880] sm:px-7">
            <span>Datos logísticos de producción</span>
            <span>LOCAMAD / 2026</span>
          </footer>
        </section>

        <section aria-label="Mapa de localizaciones" className="relative min-h-[520px] bg-[#e7e9e3] lg:h-[calc(100vh-68px)]">
          <div className="absolute left-4 top-4 z-[400] flex items-center gap-2 border border-[#dfe2db] bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm sm:left-6 sm:top-6">
            <span className="size-2 rounded-full bg-[#4b8c68]" />
            <span className="text-xs font-semibold">{filtradas.length} localizaciones</span>
            <span className="mx-1 h-4 border-l border-[#dfe2db]" />
            <span className="text-[10px] text-[#747b72]">Madrid</span>
          </div>
          <MapaLocalizacionesCliente
            activeId={localizacionActivaId}
            focusRequest={solicitudFocoMapa}
            items={filtradas.map((localizacion) => ({
              id: localizacion.id,
              nombre: localizacion.nombre,
              latitud: localizacion.latitud,
              longitud: localizacion.longitud,
              esZbedepCentro: localizacion.esZbedepCentro,
              esZbe: localizacion.esZbe,
              distritoBarrio: localizacion.distritoBarrio,
              tipoEspacio: localizacion.tipoEspacio,
              estadoProyecto: localizacion.asignaciones.find(
                (asignacion) => asignacion.proyectoId === proyectoActivoId,
              )?.estado ?? null,
            }))}
            onSelect={seleccionarLocalizacion}
          />
        </section>
      </main>

      {localizacionActiva && (
        <div className="locamad-detail-overlay fixed inset-0 z-[1000] flex justify-end bg-[#17201b]/40" role="presentation">
          <button
            className="locamad-no-print absolute inset-0 size-full cursor-default"
            aria-label="Cerrar ficha"
            onClick={() => setLocalizacionActivaId(null)}
            tabIndex={-1}
            type="button"
          />
          <aside
            aria-labelledby="ficha-titulo"
            aria-modal="true"
            className="locamad-detail-panel relative z-10 flex h-full w-full max-w-[480px] flex-col overflow-y-auto border-l border-[#dfe2db] bg-[#f8f9f6] shadow-2xl"
            role="dialog"
          >
            <div className="border-b border-[#e1e4dd] bg-white px-5 pb-5 pt-6 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Ficha de localización</p>
                  <h2 className="mt-2 text-xl font-semibold leading-tight" id="ficha-titulo">{localizacionActiva.nombre}</h2>
                  <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-[#737a71]">
                    <MapPin className="mt-0.5 shrink-0" size={14} />
                    {localizacionActiva.direccion}, {localizacionActiva.distritoBarrio || localizacionActiva.municipio}
                  </p>
                </div>
                <div className="locamad-no-print flex shrink-0 gap-2">
                  <button
                    aria-label="Imprimir dossier"
                    className="grid size-9 place-items-center border border-[#e1e4dd] text-[#596158] hover:bg-[#f5f6f3]"
                    onClick={() => window.print()}
                    type="button"
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    aria-label="Cerrar ficha"
                    className="grid size-9 place-items-center border border-[#e1e4dd] text-[#596158] hover:bg-[#f5f6f3]"
                    onClick={() => setLocalizacionActivaId(null)}
                    type="button"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="bg-[#f0f2ed] px-2 py-1 text-[10px] font-medium text-[#5d675b]">{estadoLabel[localizacionActiva.estado] ?? localizacionActiva.estado}</span>
                {localizacionActiva.esZbedepCentro && <span className="bg-[#f9e9df] px-2 py-1 text-[10px] font-semibold text-[#a24e32]">ZBEDEP Centro</span>}
                {localizacionActiva.esZbe && <span className="bg-[#f4f0dc] px-2 py-1 text-[10px] font-semibold text-[#826a2c]">ZBE Madrid</span>}
              </div>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-7">
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Espacio</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Detail label="Tipo" value={localizacionActiva.tipoEspacio} />
                  <Detail label="Estilo" value={localizacionActiva.estilo} />
                  <Detail label="Titularidad" value={localizacionActiva.titularidad} />
                  <Detail label="Municipio" value={localizacionActiva.municipio} />
                  <Detail label="Coordenadas" value={`${localizacionActiva.latitud.toFixed(5)}, ${localizacionActiva.longitud.toFixed(5)}`} />
                  <Detail label="Valoración" value={`${localizacionActiva.valoracion} / 5`} />
                </dl>
              </section>

              <section className="border-t border-[#e1e4dd] pt-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Logística y accesos</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Detail icon={<Zap size={14} />} label="Potencia eléctrica" value={localizacionActiva.potenciaElectricaKw != null ? `${localizacionActiva.potenciaElectricaKw} kW` : null} />
                  <Detail icon={<Truck size={14} />} label="Gálibo camiones" value={localizacionActiva.galiboCamionesM != null ? `${localizacionActiva.galiboCamionesM} m` : null} />
                  <Detail icon={<Droplets size={14} />} label="Toma de agua" value={localizacionActiva.tomaAgua ? "Disponible" : "No disponible"} />
                  <Detail icon={<Check size={14} />} label="Aseos" value={localizacionActiva.aseosDisponibles ? "Disponibles" : "No disponibles"} />
                  <Detail icon={<Building2 size={14} />} label="Base de producción" value={localizacionActiva.espacioBaseProd ? "Disponible" : "No disponible"} />
                  <Detail label="Aparcamiento SER" value={aparcamientoLabel[localizacionActiva.aparcamientoSer] ?? localizacionActiva.aparcamientoSer} />
                </dl>
              </section>

              <section className="border-t border-[#e1e4dd] pt-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Luz y sonido</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Detail icon={<Sun size={14} />} label="Orientación solar" value={localizacionActiva.orientacionLuz} />
                  <Detail icon={<Volume2 size={14} />} label="Nivel de ruido" value={localizacionActiva.nivelRuidoDb != null ? `${localizacionActiva.nivelRuidoDb} dB` : null} />
                </dl>
              </section>

              <section className="border-t border-[#e1e4dd] pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Contactos responsables</h3>
                  <span className="font-mono text-[11px] text-[#798176]">{localizacionActiva.contactos.length}</span>
                </div>
                {localizacionActiva.contactos.length === 0 ? (
                  <p className="mt-3 text-xs text-[#737a71]">No hay contactos registrados.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {localizacionActiva.contactos.map((contacto) => (
                      <article className="border border-[#e1e4dd] bg-white p-3.5" key={contacto.id}>
                        <p className="text-sm font-semibold">{contacto.nombre}</p>
                        {contacto.rolCargo && <p className="mt-0.5 text-xs text-[#737a71]">{contacto.rolCargo}</p>}
                        {contacto.telefono && (
                          <a className="mt-2 flex items-center gap-2 text-xs text-[#315d48] hover:underline" href={`tel:${contacto.telefono}`}>
                            <Phone size={13} /> {contacto.telefono}
                          </a>
                        )}
                        {contacto.email && (
                          <a className="mt-1.5 flex items-center gap-2 text-xs text-[#315d48] hover:underline" href={`mailto:${contacto.email}`}>
                            <Mail size={13} /> {contacto.email}
                          </a>
                        )}
                        {contacto.notasTrato && (
                          <div className="mt-3 border-l-2 border-[#b88b43] bg-[#faf8f0] px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#84724b]">Notas de acceso / acometida</p>
                            <p className="mt-1 text-xs leading-5 text-[#5f6258]">{contacto.notasTrato}</p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}

                <section className="border-t border-[#e1e4dd] pt-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Proyectos vinculados</h3>
                      <span className="font-mono text-[11px] text-[#798176]">{localizacionActiva.asignaciones.length}</span>
                    </div>
                    {localizacionActiva.asignaciones.length === 0 ? (
                      <p className="mt-3 text-xs text-[#737a71]">Esta localización aún no está asignada a un proyecto.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {localizacionActiva.asignaciones.map((asignacion) => (
                          <article className="border border-[#e1e4dd] bg-white p-3.5" key={asignacion.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">{asignacion.proyecto.nombre}</p>
                                <p className="mt-0.5 text-[11px] text-[#737a71]">{asignacion.proyecto.tipo.replaceAll("_", " ")}</p>
                              </div>
                              <span className={`shrink-0 px-2 py-1 text-[10px] font-semibold ${colorEstadoProyecto(asignacion.estado)}`}>
                                {estadoProyectoLabel[asignacion.estado] ?? asignacion.estado}
                              </span>
                            </div>
                            {asignacion.diasRodajeEstimados !== null && (
                              <p className="mt-2 text-[11px] text-[#596158]">Rodaje estimado: {asignacion.diasRodajeEstimados} días</p>
                            )}
                            {asignacion.notasProduccion && (
                              <p className="mt-2 text-xs leading-5 text-[#737a71]">{asignacion.notasProduccion}</p>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  {puedeGestionar && (
                    <AsignarProyectoLocalizacion
                      asignaciones={localizacionActiva.asignaciones}
                      key={localizacionActiva.id}
                      localizacionId={localizacionActiva.id}
                      proyectoActivoId={proyectoActivoId}
                      proyectos={proyectos}
                    />
                  )}
              </section>

              {puedeGestionar && (
                <GaleriaFotosLocalizacion
                  fotosIniciales={localizacionActiva.fotos}
                  key={localizacionActiva.id}
                  localizacionId={localizacionActiva.id}
                />
              )}
            </div>
          </aside>
        </div>
      )}

      {modalNuevaLocalizacion && puedeGestionar && (
        <NuevaLocalizacionModal
          onCancel={() => setModalNuevaLocalizacion(false)}
          onCreated={confirmarCreacion}
        />
      )}

      {modalNuevoProyecto && puedeGestionar && (
        <NuevoProyectoModal
          onCancel={() => setModalNuevoProyecto(false)}
          onCreated={confirmarProyectoCreado}
        />
      )}

      {notificacion && (
        <div className="fixed bottom-5 right-5 z-[1200] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 border border-[#b8d2bf] bg-white px-4 py-3 text-sm text-[#285c3e] shadow-lg" role="status">
          <CircleCheck size={18} className="shrink-0" />
          <span>{notificacion}</span>
          <button aria-label="Cerrar notificación" className="ml-2 text-[#627266] hover:text-[#20251f]" onClick={() => setNotificacion("")} type="button">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function NuevoProyectoModal({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (proyectoId: string, mensaje: string) => void;
}) {
  const [state, formAction, pending] = useActionState(crearProyecto, {
    status: "idle" as const,
    message: "",
  });
  const creationHandled = useRef(false);

  useEffect(() => {
    if (state.status === "success" && state.proyectoId && !creationHandled.current) {
      creationHandled.current = true;
      onCreated(state.proyectoId, state.message);
    }
  }, [onCreated, state]);

  return (
    <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-[#17201b]/45 p-4" role="presentation">
      <button
        aria-label="Cerrar formulario de proyecto"
        className="absolute inset-0 size-full cursor-default"
        onClick={onCancel}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-labelledby="nuevo-proyecto-titulo"
        aria-modal="true"
        className="relative z-10 w-full max-w-[440px] border border-[#dfe2db] bg-[#f8f9f6] shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[#e1e4dd] bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Producción</p>
            <h2 className="mt-1 text-lg font-semibold" id="nuevo-proyecto-titulo">Nuevo proyecto</h2>
          </div>
          <button
            aria-label="Cerrar formulario de proyecto"
            className="grid size-9 place-items-center border border-[#e1e4dd] text-[#596158] hover:bg-[#f5f6f3]"
            onClick={onCancel}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <form action={formAction} className="space-y-4 px-5 py-5">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
            Nombre del proyecto
            <input
              autoFocus
              className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none placeholder:text-[#92988f] focus:border-[#718a72]"
              maxLength={120}
              name="nombre"
              placeholder="Nombre del rodaje"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
            Tipo
            <select
              className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none focus:border-[#718a72]"
              defaultValue="SERIE"
              name="tipo"
            >
              <option value="SERIE">Serie</option>
              <option value="LARGOMETRAJE">Largometraje</option>
              <option value="PUBLICIDAD">Publicidad</option>
              <option value="DOCUMENTAL">Documental</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]">
            Productora
            <input
              className="h-10 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none placeholder:text-[#92988f] focus:border-[#718a72]"
              maxLength={160}
              name="productora"
              placeholder="Nombre de la productora"
            />
          </label>
          {state.status === "error" && (
            <p className="border border-[#e9c2b5] bg-[#fff4f0] px-3 py-2.5 text-xs text-[#9b422d]" role="alert">
              {state.message}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-[#e1e4dd] pt-4">
            <button
              className="h-10 border border-[#dfe3db] px-4 text-sm font-medium text-[#596158] hover:bg-white"
              onClick={onCancel}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="flex h-10 items-center gap-2 bg-[#1769aa] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#12558b] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
              {pending ? "Guardando..." : "Crear proyecto"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.05em] text-[#838a80]">
        {icon && <span className="text-[#687c67]">{icon}</span>}{label}
      </dt>
      <dd className="mt-1 break-words text-xs font-medium leading-5 text-[#31382f]">{value ?? "No especificado"}</dd>
    </div>
  );
}