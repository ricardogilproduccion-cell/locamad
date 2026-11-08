"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import * as SunCalc from "suncalc";
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
  ExternalLink,
  Globe2,
  LogOut,
  LoaderCircle,
  Mail,
  MapPin,
  Plus,
  Phone,
  Printer,
  Route,
  Search,
  Save,
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

interface PermisoLocalizacion {
  id: string;
  tipo: string;
  estado: string;
  numeroRegistro: string | null;
  organismo: string;
  fechaSolicitud: Date | string | null;
  fechaRodajeInicio: Date | string;
  fechaRodajeFin: Date | string;
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
  permisos: PermisoLocalizacion[];
}

interface ResultadoInternet {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  municipio: string;
  distritoBarrio: string | null;
  tipoEspacio: string;
}

type AmbitoBusqueda = "todo" | "catalogo" | "internet";

const filtrosProduccion = [
  {
    id: "vintage",
    etiqueta: "Años 70-80 / Vintage",
    terminos: ["anos 70", "anos 80", "setenta", "ochenta", "vintage"],
  },
  {
    id: "brutalismo",
    etiqueta: "Brutalismo / Institucional",
    terminos: ["brutal", "institucional"],
  },
  {
    id: "industrial",
    etiqueta: "Nave / Industrial",
    terminos: ["nave", "industrial", "fabrica", "almacen"],
  },
  {
    id: "sanitario",
    etiqueta: "Hospital / Comisaría",
    terminos: ["hospital", "clinica", "comisaria", "policia"],
  },
  {
    id: "vivienda",
    etiqueta: "Vivienda / Ático",
    terminos: ["vivienda", "atico", "piso", "casa"],
  },
  {
    id: "comercial",
    etiqueta: "Comercial / Farmacia",
    terminos: ["comercial", "farmacia", "tienda", "local"],
  },
] as const;

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

function obtenerAzimutSolar(latitud: number, longitud: number) {
  const posicion = SunCalc.getPosition(new Date(), latitud, longitud);
  const azimut = (posicion.azimuth * 180 / Math.PI + 360) % 360;
  const cardinales = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return `${azimut.toFixed(0)}° (${cardinales[Math.round(azimut / 45) % cardinales.length]})`;
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
  const [localizacionesNuevas, setLocalizacionesNuevas] = useState<Localizacion[]>([]);
  const localizacionesCatalogo = useMemo(
    () => [
      ...localizaciones,
      ...localizacionesNuevas.filter(
        (nueva) => !localizaciones.some((localizacion) => localizacion.id === nueva.id),
      ),
    ],
    [localizaciones, localizacionesNuevas],
  );
  const [busqueda, setBusqueda] = useState("");
  const [filtroProduccionActivo, setFiltroProduccionActivo] = useState<string | null>(null);
  const [zonaBusqueda, setZonaBusqueda] = useState("Madrid");
  const [ambitoBusqueda, setAmbitoBusqueda] = useState<AmbitoBusqueda>("todo");
  const [resultadosInternet, setResultadosInternet] = useState<ResultadoInternet[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorInternet, setErrorInternet] = useState("");
  const [erroresGuardado, setErroresGuardado] = useState<Record<string, string>>({});
  const [idsGuardando, setIdsGuardando] = useState<string[]>([]);
  const [idsAñadidos, setIdsAñadidos] = useState<string[]>([]);
  const [soloZbedep, setSoloZbedep] = useState(false);
  const [soloBase, setSoloBase] = useState(false);
  const [potenciaMinima, setPotenciaMinima] = useState("");
  const [localizacionActivaId, setLocalizacionActivaId] = useState<string | null>(null);
  const [localizacionEnfocadaId, setLocalizacionEnfocadaId] = useState<string | null>(null);
  const [localizacionResaltadaId, setLocalizacionResaltadaId] = useState<string | null>(null);
  const [solicitudFocoMapa, setSolicitudFocoMapa] = useState(0);
  const [modalNuevaLocalizacion, setModalNuevaLocalizacion] = useState(false);
  const [modalNuevoProyecto, setModalNuevoProyecto] = useState(false);
  const [notificacion, setNotificacion] = useState("");
  const [proyectoActivoId, setProyectoActivoId] = useState("todos");
  const [localizacionesSeleccionadas, setLocalizacionesSeleccionadas] = useState<string[]>([]);
  const [dossierLocalizaciones, setDossierLocalizaciones] = useState<Localizacion[] | null>(null);
  const secuenciaBusqueda = useRef(0);
  const localizacionEnfocadaRef = useRef<string | null>(null);

  const enfocarLocalizacion = useCallback((id: string) => {
    if (localizacionEnfocadaRef.current === id) return;
    localizacionEnfocadaRef.current = id;
    setLocalizacionEnfocadaId(id);
    setSolicitudFocoMapa((solicitud) => solicitud + 1);
  }, []);

  const seleccionarLocalizacion = useCallback((id: string) => {
    localizacionEnfocadaRef.current = id;
    setLocalizacionActivaId(id);
    setLocalizacionEnfocadaId(id);
    setLocalizacionResaltadaId(id);
    setSolicitudFocoMapa((solicitud) => solicitud + 1);
  }, []);

  const seleccionarPinMapa = useCallback((id: string) => {
    enfocarLocalizacion(id);
    setLocalizacionResaltadaId(id);
    setSolicitudFocoMapa((solicitud) => solicitud + 1);
  }, [enfocarLocalizacion]);

  useEffect(() => {
    const query = busqueda.trim();
    const sequence = ++secuenciaBusqueda.current;

    if (!query || ambitoBusqueda === "catalogo") {
      setResultadosInternet([]);
      setBuscando(false);
      setErrorInternet("");
      return;
    }

    const controller = new AbortController();
    setBuscando(true);
    setErrorInternet("");
    setResultadosInternet([]);

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          zona: zonaBusqueda.trim() || "Madrid",
        });
        const response = await fetch(`/api/scouting/search?${params}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          results?: ResultadoInternet[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || "No se pudo buscar en internet.");
        if (sequence === secuenciaBusqueda.current) {
          setResultadosInternet(data.results ?? []);
        }
      } catch (error) {
        if (controller.signal.aborted || sequence !== secuenciaBusqueda.current) return;
        setErrorInternet(
          error instanceof Error ? error.message : "No se pudo buscar en internet.",
        );
      } finally {
        if (sequence === secuenciaBusqueda.current) setBuscando(false);
      }
    }, 1100);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [ambitoBusqueda, busqueda, zonaBusqueda]);

  const añadirAlCatalogo = async (lugar: ResultadoInternet) => {
    if (!puedeGestionar || idsGuardando.includes(lugar.id)) return;
    setIdsGuardando((actuales) => [...actuales, lugar.id]);
    setErroresGuardado((actuales) => {
      const siguientes = { ...actuales };
      delete siguientes[lugar.id];
      return siguientes;
    });

    try {
      const response = await fetch("/api/localizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: lugar.nombre,
          direccion: lugar.direccion,
          municipio: lugar.municipio || zonaBusqueda.trim() || "Madrid",
          distritoBarrio: lugar.distritoBarrio,
          tipoEspacio: lugar.tipoEspacio,
          latitud: lugar.lat,
          longitud: lugar.lng,
        }),
      });
      const data = (await response.json()) as {
        localizacion?: Localizacion;
        creada?: boolean;
        error?: string;
      };
      if (!response.ok || !data.localizacion) {
        throw new Error(data.error || "No se pudo guardar la localización.");
      }

      const localizacionGuardada = data.localizacion;
      setLocalizacionesNuevas((actuales) =>
        actuales.some((localizacion) => localizacion.id === localizacionGuardada.id)
          ? actuales
          : [localizacionGuardada, ...actuales],
      );
      setIdsAñadidos((actuales) => [...actuales, lugar.id]);
      setNotificacion(
        data.creada ? "Localización añadida a tu catálogo." : "Esta localización ya estaba en tu catálogo.",
      );
    } catch (error) {
      setErroresGuardado((actuales) => ({
        ...actuales,
        [lugar.id]: error instanceof Error ? error.message : "No se pudo guardar la localización.",
      }));
    } finally {
      setIdsGuardando((actuales) => actuales.filter((id) => id !== lugar.id));
    }
  };

  const termino = normalizar(busqueda.trim());
  const filtroProduccion = filtrosProduccion.find(
    (filtro) => filtro.id === filtroProduccionActivo,
  );
  const minimoKw = potenciaMinima === "" ? null : Number(potenciaMinima);
  const filtradas = useMemo(
    () => localizacionesCatalogo.filter((localizacion) => {
      const texto = normalizar(
        `${localizacion.nombre} ${localizacion.tipoEspacio} ${localizacion.estilo ?? ""} ${localizacion.direccion} ${localizacion.municipio} ${localizacion.distritoBarrio ?? ""}`,
      );

      return (
        ambitoBusqueda !== "internet" &&
        (!termino || texto.includes(termino)) &&
        (!filtroProduccion ||
          filtroProduccion.terminos.some((palabra) => texto.includes(normalizar(palabra)))) &&
        (!soloZbedep || localizacion.esZbedepCentro) &&
        (!soloBase || localizacion.espacioBaseProd) &&
        (proyectoActivoId === "todos" ||
          localizacion.asignaciones.some((asignacion) => asignacion.proyectoId === proyectoActivoId)) &&
        (minimoKw === null || (localizacion.potenciaElectricaKw ?? 0) >= minimoKw)
      );
    }),
    [
      ambitoBusqueda,
      filtroProduccion,
      localizacionesCatalogo,
      minimoKw,
      proyectoActivoId,
      soloBase,
      soloZbedep,
      termino,
    ],
  );

  const localizacionActiva = useMemo(
    () => localizacionesCatalogo.find((localizacion) => localizacion.id === localizacionActivaId),
    [localizacionesCatalogo, localizacionActivaId],
  );
  const enCentro = useMemo(
    () => localizacionesCatalogo.filter((localizacion) => localizacion.esZbedepCentro).length,
    [localizacionesCatalogo],
  );
  const conBase = useMemo(
    () => localizacionesCatalogo.filter((localizacion) => localizacion.espacioBaseProd).length,
    [localizacionesCatalogo],
  );
  const elementosMapa = useMemo(
    () => filtradas.map((localizacion) => ({
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
    })),
    [filtradas, proyectoActivoId],
  );

  useEffect(() => {
    if (!localizacionEnfocadaId) return;
    document.getElementById(`localizacion-${localizacionEnfocadaId}`)?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [localizacionEnfocadaId, solicitudFocoMapa]);

  useEffect(() => {
    if (!localizacionResaltadaId) return;
    const timer = window.setTimeout(() => setLocalizacionResaltadaId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [localizacionResaltadaId]);

  useEffect(() => {
    if (!dossierLocalizaciones) return;
    let cancelado = false;
    const cerrarDossier = () => setDossierLocalizaciones(null);
    window.addEventListener("afterprint", cerrarDossier);

    void Promise.all(
      Array.from(
        document.querySelectorAll<HTMLImageElement>(".locamad-dossier-print img"),
      ).map((imagen) => imagen.decode().catch(() => undefined)),
    ).then(() => {
      if (!cancelado) window.print();
    });

    return () => {
      cancelado = true;
      window.removeEventListener("afterprint", cerrarDossier);
    };
  }, [dossierLocalizaciones]);

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
      ...localizacionesCatalogo
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
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto sm:gap-4">
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
          <button
            className="flex h-9 max-w-[260px] shrink-0 items-center gap-1.5 bg-[#315d48] px-3 text-left text-[10px] font-semibold leading-tight text-white transition-colors hover:bg-[#244b39] disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:text-xs"
            disabled={localizacionesSeleccionadas.length === 0}
            onClick={() => {
              const seleccionadas = localizacionesCatalogo.filter((localizacion) =>
                localizacionesSeleccionadas.includes(localizacion.id),
              );
              if (seleccionadas.length > 0) setDossierLocalizaciones(seleccionadas);
            }}
            type="button"
          >
            <Printer size={14} />
            <span>Generar Dossier de Scouting ({localizacionesSeleccionadas.length} seleccionadas)</span>
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
        <section className="flex min-h-[560px] flex-col border-r border-[#dfe2db] bg-[#f8f9f6] lg:h-[calc(100vh-68px)] lg:min-h-0 lg:overflow-hidden">
          <div className="shrink-0 border-b border-[#e3e6df] px-5 pb-4 pt-6 sm:px-7 lg:max-h-[64vh] lg:overflow-y-auto">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#728071]">Explorador · Madrid</p>
                <h1 className="mt-2 text-[26px] font-semibold leading-tight">Localizaciones</h1>
              </div>
              <span className="pb-1 font-mono text-sm text-[#71786f]">
                {ambitoBusqueda === "internet"
                  ? String(resultadosInternet.length).padStart(2, "0")
                  : String(filtradas.length).padStart(2, "0")}{" "}
                / {String(ambitoBusqueda === "internet" ? resultadosInternet.length : localizacionesCatalogo.length).padStart(2, "0")}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 divide-x divide-[#e1e4dc] border-y border-[#e1e4dc] py-3">
              <div className="pr-2">
                <p className="font-mono text-lg font-semibold">{localizacionesCatalogo.length}</p>
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

            <div
              aria-label="Buscador global de localizaciones"
              className="mt-4 border border-[#dfe3db] bg-white p-3.5"
            >
              <label className="flex h-10 items-center gap-2.5 border border-[#dfe3db] bg-[#fbfcfa] px-3 text-[#7b8179] focus-within:border-[#718a72]">
                <Search aria-hidden="true" size={16} />
                <input
                  aria-label="Buscar negocios o localizaciones"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#20251f] outline-none placeholder:text-[#92988f]"
                  maxLength={120}
                  onChange={(event) => {
                    setBusqueda(event.target.value);
                    setFiltroProduccionActivo(null);
                    setLocalizacionActivaId(null);
                  }}
                  placeholder="Busca un lugar, negocio o categoría..."
                  type="search"
                  value={busqueda}
                />
              </label>

              <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row">
                <label className="flex h-9 min-w-0 flex-1 items-center gap-2 border border-[#dfe3db] px-2.5 text-[#687166] focus-within:border-[#718a72]">
                  <MapPin aria-hidden="true" className="shrink-0" size={14} />
                  <span className="sr-only">Zona geográfica</span>
                  <input
                    aria-label="Zona geográfica"
                    className="w-full min-w-0 bg-transparent text-xs text-[#20251f] outline-none placeholder:text-[#92988f]"
                    maxLength={100}
                    onChange={(event) => {
                      setZonaBusqueda(event.target.value);
                    }}
                    placeholder="Zona"
                    value={zonaBusqueda}
                  />
                </label>
                <span aria-live="polite" className="flex h-9 shrink-0 items-center gap-1.5 px-2 text-[11px] text-[#687166]">
                  {buscando && <LoaderCircle className="animate-spin" size={13} />}
                  {ambitoBusqueda === "todo"
                    ? "Catálogo + internet"
                    : ambitoBusqueda === "internet"
                      ? "Internet"
                      : "Catálogo"}
                </span>
              </div>

              <fieldset className="mt-3">
                <legend className="sr-only">Ámbito de búsqueda</legend>
                <div className="grid grid-cols-3 border border-[#e1e4dc]">
                  {([
                    ["todo", "Todo"],
                    ["catalogo", "En mi catálogo"],
                    ["internet", "En internet"],
                  ] as const).map(([ambito, etiqueta]) => (
                    <button
                      aria-pressed={ambitoBusqueda === ambito}
                      className={`min-h-8 border-r border-[#e1e4dc] px-1.5 text-[10px] font-medium last:border-r-0 sm:text-[11px] ${
                        ambitoBusqueda === ambito
                          ? "bg-[#e8f0e9] text-[#315d48]"
                          : "bg-white text-[#667064] hover:bg-[#f5f6f3]"
                      }`}
                      key={ambito}
                      onClick={() => {
                        setAmbitoBusqueda(ambito);
                      }}
                      type="button"
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#788276]">
                Filtros rápidos de rodaje
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {filtrosProduccion.map((filtro) => (
                  <button
                    aria-pressed={filtroProduccionActivo === filtro.id}
                    className={`shrink-0 border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                      filtroProduccionActivo === filtro.id
                        ? "border-[#315d48] bg-[#315d48] text-white"
                        : "border-[#dfe3db] bg-white text-[#596158] hover:border-[#9eac9d]"
                    }`}
                    key={filtro.id}
                    onClick={() => {
                      setBusqueda("");
                      setFiltroProduccionActivo((activo) => activo === filtro.id ? null : filtro.id);
                      setLocalizacionActivaId(null);
                    }}
                    type="button"
                  >
                    {filtro.etiqueta}
                  </button>
                ))}
              </div>
            </div>

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

          <div aria-label="Resultados de localizaciones" className="min-h-[240px] max-h-[calc(100vh-380px)] flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:min-h-0 lg:max-h-none">
            {ambitoBusqueda !== "catalogo" && busqueda.trim() && (
              <section aria-labelledby="resultados-internet-titulo" className="mb-3 border border-[#dfe3db] bg-white p-3">
                <h2 className="text-xs font-bold text-[#315d48]" id="resultados-internet-titulo">
                  Opciones en internet
                </h2>
                {buscando && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-[#687166]" role="status">
                    <LoaderCircle className="animate-spin" size={14} /> Buscando en internet...
                  </p>
                )}
                {errorInternet && <p className="mt-2 text-xs text-[#a33c32]" role="alert">{errorInternet}</p>}
                {!buscando && !errorInternet && resultadosInternet.length === 0 && (
                  <p className="mt-2 text-xs text-[#747b72]">No hay lugares encontrados en internet.</p>
                )}
                {resultadosInternet.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {resultadosInternet.map((lugar) => {
                      const añadido = idsAñadidos.includes(lugar.id);
                      const guardando = idsGuardando.includes(lugar.id);
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lugar.lat},${lugar.lng}`;
                      return (
                        <li className="border-t border-[#edf0e9] pt-2" key={lugar.id}>
                          <p className="text-xs font-semibold text-[#30382f]">{lugar.nombre}</p>
                          <p className="mt-0.5 text-[11px] leading-4 text-[#747b72]">{lugar.direccion}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <a
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#315d48] underline underline-offset-2"
                              href={mapsUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <ExternalLink size={12} /> Ver en Maps
                            </a>
                            <button
                              aria-live="polite"
                              className={`inline-flex h-8 items-center gap-1.5 border px-2.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
                                añadido
                                  ? "border-[#b8d2bf] bg-[#edf5ee] text-[#285c3e]"
                                  : "border-[#315d48] bg-[#315d48] text-white hover:bg-[#244b39]"
                              } disabled:opacity-70`}
                              disabled={!puedeGestionar || añadido || guardando}
                              onClick={() => void añadirAlCatalogo(lugar)}
                              title={puedeGestionar
                                ? undefined
                                : "Inicia sesión con un rol autorizado para añadir localizaciones."}
                              type="button"
                            >
                              {guardando ? <LoaderCircle className="animate-spin" size={13} /> : añadido ? <Check size={13} /> : <Plus size={13} />}
                              {guardando ? "Guardando..." : añadido ? "En tu catálogo" : "Añadir a mi catálogo"}
                            </button>
                          </div>
                          {erroresGuardado[lugar.id] && (
                            <p className="mt-1 text-[11px] text-[#a33c32]" role="alert">
                              {erroresGuardado[lugar.id]}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <a
                  className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#858b82] underline underline-offset-2"
                  href="https://www.openstreetmap.org/copyright"
                  rel="noreferrer"
                  target="_blank"
                >
                  <Globe2 size={11} /> Datos © OpenStreetMap contributors
                </a>
              </section>
            )}

            {ambitoBusqueda === "internet" && !busqueda.trim() && (
              <div className="grid min-h-48 place-items-center border border-dashed border-[#cfd5cb] bg-white p-8 text-center">
                <p className="text-sm text-[#7b8179]">Escribe en el buscador para ver lugares en internet.</p>
              </div>
            )}

            {ambitoBusqueda !== "internet" && (
              filtradas.length === 0 &&
              (ambitoBusqueda === "catalogo" || (!buscando && resultadosInternet.length === 0)) ? (
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
                      setFiltroProduccionActivo(null);
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
                          : localizacionResaltadaId === localizacion.id
                            ? "animate-pulse border-[#b65337] bg-[#fff7f2] ring-2 ring-[#b65337]"
                            : "border-[#e1e4dd] bg-white hover:border-[#9eac9d]"
                      }`}
                      id={`localizacion-${localizacion.id}`}
                      key={localizacion.id}
                      onClick={() => seleccionarLocalizacion(localizacion.id)}
                      onMouseEnter={() => enfocarLocalizacion(localizacion.id)}
                      onFocus={() => enfocarLocalizacion(localizacion.id)}
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
                          <input
                            aria-label={`Añadir ${localizacion.nombre} al dossier`}
                            checked={localizacionesSeleccionadas.includes(localizacion.id)}
                            className="mt-2 size-4 shrink-0 accent-[#315d48]"
                            onChange={(event) => {
                              setLocalizacionesSeleccionadas((seleccionadas) =>
                                event.target.checked
                                  ? [...seleccionadas, localizacion.id]
                                  : seleccionadas.filter((id) => id !== localizacion.id),
                              );
                            }}
                            onClick={(event) => event.stopPropagation()}
                            type="checkbox"
                          />
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
                          onClick={(event) => {
                            event.stopPropagation();
                            seleccionarLocalizacion(localizacion.id);
                          }}
                          type="button"
                        >
                          Ver detalles <ArrowUpRight size={14} />
                        </button>
                      </span>
                    </article>
                  );
                })}
              </div>
            ))}
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
            focusedId={localizacionEnfocadaId}
            focusRequest={solicitudFocoMapa}
            items={elementosMapa}
            onSelect={seleccionarLocalizacion}
            onFocus={enfocarLocalizacion}
            onPinSelect={seleccionarPinMapa}
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

            <div className="px-5 pt-5 sm:px-7">
              <CarruselFotos fotos={localizacionActiva.fotos} nombre={localizacionActiva.nombre} />
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-7">
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Espacio</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Detail label="Tipo" value={localizacionActiva.tipoEspacio} />
                  <Detail label="Estilo" value={localizacionActiva.estilo} />
                  <Detail label="Titularidad" value={localizacionActiva.titularidad} />
                  <Detail label="Municipio" value={localizacionActiva.municipio} />
                  <Detail label="Distrito / barrio" value={localizacionActiva.distritoBarrio} />
                  <Detail label="Coordenadas" value={`${localizacionActiva.latitud.toFixed(5)}, ${localizacionActiva.longitud.toFixed(5)}`} />
                  <Detail label="Valoración" value={`${localizacionActiva.valoracion} / 5`} />
                </dl>
              </section>

              <section className="border-t border-[#e1e4dd] pt-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Logística y accesos</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Detail icon={<Zap size={14} />} label="Potencia eléctrica" value={localizacionActiva.potenciaElectricaKw != null ? `${localizacionActiva.potenciaElectricaKw} kW` : null} />
                  <Detail
                    icon={<Route size={14} />}
                    label="Acceso de camiones / gálibo"
                    value={localizacionActiva.galiboCamionesM != null ? `Gálibo registrado: ${localizacionActiva.galiboCamionesM} m` : null}
                  />
                  <Detail label="Grupo electrógeno" value="Acceso por verificar en visita técnica" />
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
                  <Detail
                    icon={<Compass size={14} />}
                    label="Azimut solar aprox. ahora"
                    value={obtenerAzimutSolar(localizacionActiva.latitud, localizacionActiva.longitud)}
                  />
                  <Detail icon={<Volume2 size={14} />} label="Nivel de ruido" value={localizacionActiva.nivelRuidoDb != null ? `${localizacionActiva.nivelRuidoDb} dB` : null} />
                </dl>
                <p className="mt-2 text-[10px] leading-4 text-[#7b8179]">
                  Azimut solar aproximado para la hora actual; no representa la orientación medida de la fachada.
                </p>
                <div className="locamad-no-print mt-3 flex flex-wrap gap-2">
                  <a
                    className="inline-flex h-8 items-center gap-1.5 border border-[#dfe3db] bg-white px-2.5 text-[11px] font-semibold text-[#315d48] hover:bg-[#f5f6f3]"
                    href={`https://www.sunsurveyor.com/?latitude=${localizacionActiva.latitud}&longitude=${localizacionActiva.longitud}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink size={12} /> Sun Surveyor
                  </a>
                  <a
                    className="inline-flex h-8 items-center gap-1.5 border border-[#dfe3db] bg-white px-2.5 text-[11px] font-semibold text-[#315d48] hover:bg-[#f5f6f3]"
                    href={`https://app.photoephemeris.com/?ll=${localizacionActiva.latitud},${localizacionActiva.longitud}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink size={12} /> Calcular luz solar
                  </a>
                  <a
                    className="inline-flex h-8 items-center gap-1.5 border border-[#dfe3db] bg-white px-2.5 text-[11px] font-semibold text-[#315d48] hover:bg-[#f5f6f3]"
                    href={`https://www.google.com/maps/@?api=1&map_action=map&center=${localizacionActiva.latitud},${localizacionActiva.longitud}&zoom=19&basemap=satellite&tilt=45`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink size={12} /> Google Maps 3D
                  </a>
                </div>
              </section>

              <section className="border-t border-[#e1e4dd] pt-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">
                  Permisos y gestión
                </h3>
                {localizacionActiva.permisos.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {localizacionActiva.permisos.map((permiso) => (
                      <article className="border border-[#e1e4dd] bg-white p-3" key={permiso.id}>
                        <p className="text-xs font-semibold">{permiso.tipo.replaceAll("_", " ")}</p>
                        <p className="mt-1 text-[11px] text-[#737a71]">
                          {permiso.organismo} · {permiso.estado.replaceAll("_", " ")}
                          {permiso.numeroRegistro ? ` · ${permiso.numeroRegistro}` : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-[#737a71]">
                          Rodaje: {new Date(permiso.fechaRodajeInicio).toLocaleDateString("es-ES")} – {new Date(permiso.fechaRodajeFin).toLocaleDateString("es-ES")}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[#737a71]">No hay permisos registrados para esta localización.</p>
                )}
                {localizacionActiva.asignaciones.some((asignacion) => asignacion.notasProduccion) ||
                localizacionActiva.contactos.some((contacto) => contacto.notasTrato) ? (
                  <div className="mt-3 space-y-2">
                    {localizacionActiva.asignaciones
                      .filter((asignacion) => asignacion.notasProduccion)
                      .map((asignacion) => (
                        <p className="border-l-2 border-[#b88b43] bg-[#faf8f0] px-3 py-2 text-xs leading-5 text-[#5f6258]" key={asignacion.id}>
                          {asignacion.notasProduccion}
                        </p>
                      ))}
                    {localizacionActiva.contactos
                      .filter((contacto) => contacto.notasTrato)
                      .map((contacto) => (
                        <p className="border-l-2 border-[#b88b43] bg-[#faf8f0] px-3 py-2 text-xs leading-5 text-[#5f6258]" key={contacto.id}>
                          {contacto.notasTrato}
                        </p>
                      ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[#737a71]">Sin notas de permisos o producción.</p>
                )}
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
      {dossierLocalizaciones && (
        <DossierScouting localizaciones={dossierLocalizaciones} />
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

function CarruselFotos({ fotos, nombre }: { fotos: string[]; nombre: string }) {
  const [indice, setIndice] = useState(0);

  if (fotos.length === 0) {
    return (
      <div className="grid aspect-[16/8] place-items-center border border-dashed border-[#cfd5cb] bg-white text-xs text-[#7b8179]">
        No hay fotografías registradas
      </div>
    );
  }

  const indiceVisible = indice % fotos.length;

  return (
    <figure className="relative overflow-hidden border border-[#dfe3db] bg-white">
      <Image
        alt={`${nombre}, fotografía ${indiceVisible + 1}`}
        className="aspect-[16/8] w-full object-cover"
        height={800}
        loading="eager"
        unoptimized
        src={fotos[indiceVisible]}
        width={1600}
      />
      {fotos.length > 1 && (
        <>
          <button
            aria-label="Fotografía anterior"
            className="absolute left-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#315d48] shadow"
            onClick={() => setIndice((actual) => (actual - 1 + fotos.length) % fotos.length)}
            type="button"
          >
            ‹
          </button>
          <button
            aria-label="Fotografía siguiente"
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#315d48] shadow"
            onClick={() => setIndice((actual) => (actual + 1) % fotos.length)}
            type="button"
          >
            ›
          </button>
          <figcaption className="absolute bottom-2 right-2 bg-[#17201b]/75 px-2 py-1 text-[10px] text-white">
            {indiceVisible + 1} / {fotos.length}
          </figcaption>
        </>
      )}
    </figure>
  );
}

function DossierScouting({ localizaciones }: { localizaciones: Localizacion[] }) {
  const generado = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main aria-hidden="true" className="locamad-dossier-print">
      <section className="locamad-dossier-cover">
        <div className="locamad-dossier-brand">LOCAMAD</div>
        <p className="locamad-dossier-kicker">Producción audiovisual · Madrid</p>
        <h1>Dossier de scouting</h1>
        <p className="locamad-dossier-subtitle">Selección de localizaciones para dirección y producción</p>
        <div className="locamad-dossier-cover-rule" />
        <p><strong>{localizaciones.length}</strong> {localizaciones.length === 1 ? "localización seleccionada" : "localizaciones seleccionadas"}</p>
        <p>Generado el {generado}</p>
        <footer>LocaMad · Fichas técnicas y datos para scouting</footer>
      </section>

      {localizaciones.map((localizacion, indice) => (
        <article className="locamad-dossier-location" key={localizacion.id}>
          <header className="locamad-dossier-header">
            <strong>LOCAMAD</strong>
            <span>FICHA DE SCOUTING · {String(indice + 1).padStart(2, "0")}</span>
          </header>
          <h2>{localizacion.nombre}</h2>
          <p className="locamad-dossier-address">
            {localizacion.direccion}, {localizacion.distritoBarrio || localizacion.municipio}
          </p>
          <p className="locamad-dossier-type">
            {localizacion.tipoEspacio}{localizacion.estilo ? ` · ${localizacion.estilo}` : ""}
          </p>

          {localizacion.fotos.length > 0 ? (
            <div className="locamad-dossier-photos">
              {localizacion.fotos.slice(0, 4).map((foto, fotoIndice) => (
                <Image
                  alt={`${localizacion.nombre}, fotografía ${fotoIndice + 1}`}
                  height={800}
                  key={`${foto}-${fotoIndice}`}
                  loading="eager"
                  src={foto}
                  unoptimized
                  width={1200}
                />
              ))}
            </div>
          ) : (
            <div className="locamad-dossier-no-photo">Sin fotografías disponibles</div>
          )}

          <h3>Ficha logística</h3>
          <dl className="locamad-dossier-grid">
            <div><dt>Municipio</dt><dd>{localizacion.municipio}</dd></div>
            <div><dt>Distrito / barrio</dt><dd>{localizacion.distritoBarrio || "No especificado"}</dd></div>
            <div><dt>Coordenadas</dt><dd>{localizacion.latitud.toFixed(5)}, {localizacion.longitud.toFixed(5)}</dd></div>
            <div><dt>Potencia eléctrica</dt><dd>{localizacion.potenciaElectricaKw != null ? `${localizacion.potenciaElectricaKw} kW` : "No especificada"}</dd></div>
            <div><dt>Gálibo de camiones</dt><dd>{localizacion.galiboCamionesM != null ? `${localizacion.galiboCamionesM} m` : "No especificado"}</dd></div>
            <div><dt>Grupo electrógeno</dt><dd>Acceso por verificar en visita</dd></div>
            <div><dt>ZBEDEP / Distrito Centro</dt><dd>{localizacion.esZbedepCentro ? "Sí" : "No"}</dd></div>
            <div><dt>Base de producción</dt><dd>{localizacion.espacioBaseProd ? "Disponible" : "No disponible"}</dd></div>
            <div><dt>Orientación solar</dt><dd>{localizacion.orientacionLuz || "No especificada"}</dd></div>
            <div><dt>Azimut solar aprox. ahora</dt><dd>{obtenerAzimutSolar(localizacion.latitud, localizacion.longitud)}</dd></div>
          </dl>

          <h3>Permisos y notas de producción</h3>
          {localizacion.permisos.length > 0 ? (
            <ul className="locamad-dossier-notes">
              {localizacion.permisos.map((permiso) => (
                <li key={permiso.id}>
                  {permiso.tipo.replaceAll("_", " ")} · {permiso.organismo} · {permiso.estado.replaceAll("_", " ")}
                  {permiso.numeroRegistro ? ` · ${permiso.numeroRegistro}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="locamad-dossier-muted">Sin permisos registrados.</p>
          )}
          {localizacion.asignaciones.filter((asignacion) => asignacion.notasProduccion).map((asignacion) => (
            <p className="locamad-dossier-note" key={asignacion.id}>{asignacion.notasProduccion}</p>
          ))}
          {localizacion.contactos.filter((contacto) => contacto.notasTrato).map((contacto) => (
            <p className="locamad-dossier-note" key={contacto.id}>{contacto.notasTrato}</p>
          ))}

          <h3>Coordenadas y scouting solar</h3>
          <div className="locamad-dossier-links">
            <a href={`https://www.google.com/maps/search/?api=1&query=${localizacion.latitud},${localizacion.longitud}`}>
              Abrir en Google Maps
            </a>
            <a href={`https://app.photoephemeris.com/?ll=${localizacion.latitud},${localizacion.longitud}`}>
              The Photographer&apos;s Ephemeris
            </a>
            <a href={`https://www.sunsurveyor.com/?latitude=${localizacion.latitud}&longitude=${localizacion.longitud}`}>
              Sun Surveyor
            </a>
          </div>
          <footer className="locamad-dossier-footer">LocaMad · Documento de trabajo para producción</footer>
        </article>
      ))}
    </main>
  );
}