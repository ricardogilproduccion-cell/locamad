import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { puedeGestionarLocalizaciones } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const localizacionSelect = {
  id: true,
  nombre: true,
  tipoEspacio: true,
  estilo: true,
  direccion: true,
  municipio: true,
  distritoBarrio: true,
  latitud: true,
  longitud: true,
  titularidad: true,
  potenciaElectricaKw: true,
  tomaAgua: true,
  aseosDisponibles: true,
  galiboCamionesM: true,
  espacioBaseProd: true,
  nivelRuidoDb: true,
  orientacionLuz: true,
  esZbe: true,
  esZbedepCentro: true,
  aparcamientoSer: true,
  fotos: true,
  permisos: {
    select: {
      id: true,
      tipo: true,
      estado: true,
      numeroRegistro: true,
      organismo: true,
      fechaSolicitud: true,
      fechaRodajeInicio: true,
      fechaRodajeFin: true,
    },
  },
  valoracion: true,
  estado: true,
  asignaciones: {
    select: {
      id: true,
      proyectoId: true,
      localizacionId: true,
      estadoScouting: true,
      diasRodajeEstimados: true,
      notasProduccion: true,
      proyecto: { select: { id: true, nombre: true, tipo: true } },
    },
  },
  contactos: {
    select: {
      id: true,
      nombre: true,
      telefono: true,
      email: true,
      rolCargo: true,
      notasTrato: true,
    },
  },
} as const;

const resultadoBusquedaSelect = {
  id: true,
  nombre: true,
  tipoEspacio: true,
  estilo: true,
  direccion: true,
  municipio: true,
  distritoBarrio: true,
  latitud: true,
  longitud: true,
} as const;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query || query.length > 120) {
    return Response.json({ error: "Indica un término de búsqueda de hasta 120 caracteres." }, { status: 400 });
  }

  try {
    const results = await prisma.localizacion.findMany({
      where: {
        OR: [
          { nombre: { contains: query, mode: "insensitive" } },
          { tipoEspacio: { contains: query, mode: "insensitive" } },
          { direccion: { contains: query, mode: "insensitive" } },
          { estilo: { contains: query, mode: "insensitive" } },
          { municipio: { contains: query, mode: "insensitive" } },
          { distritoBarrio: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { nombre: "asc" },
      take: 50,
      select: resultadoBusquedaSelect,
    });

    return Response.json({ results });
  } catch (error) {
    console.error("Could not search catalog locations.", error);
    return Response.json({ error: "No se pudo buscar en el catálogo." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Inicia sesión para añadir localizaciones." }, { status: 401 });
  }
  if (!puedeGestionarLocalizaciones(session.user.rol)) {
    return Response.json({ error: "Tu rol no permite añadir localizaciones." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return Response.json({ error: "Los datos de la localización no son válidos." }, { status: 400 });
  }

  const data = payload as Record<string, unknown>;
  const nombre = typeof data.nombre === "string" ? data.nombre.trim() : "";
  const direccion = typeof data.direccion === "string" ? data.direccion.trim() : "";
  const municipio = typeof data.municipio === "string" ? data.municipio.trim() : "";
  const tipoEspacio =
    data.tipoEspacio === undefined
      ? "Exterior"
      : typeof data.tipoEspacio === "string"
        ? data.tipoEspacio.trim()
        : "";
  const distritoBarrio =
    typeof data.distritoBarrio === "string" ? data.distritoBarrio.trim() : null;
  const latitud = data.latitud;
  const longitud = data.longitud;

  if (
    !nombre ||
    nombre.length > 200 ||
    !direccion ||
    direccion.length > 500 ||
    !tipoEspacio ||
    tipoEspacio.length > 120 ||
    !municipio ||
    municipio.length > 120 ||
    (data.distritoBarrio !== undefined &&
      data.distritoBarrio !== null &&
      (typeof data.distritoBarrio !== "string" || data.distritoBarrio.length > 120)) ||
    typeof latitud !== "number" ||
    !Number.isFinite(latitud) ||
    latitud < -90 ||
    latitud > 90 ||
    typeof longitud !== "number" ||
    !Number.isFinite(longitud) ||
    longitud < -180 ||
    longitud > 180
  ) {
    return Response.json({ error: "Nombre, dirección, zona y coordenadas deben ser válidos." }, { status: 400 });
  }

  try {
    const existing = await prisma.localizacion.findFirst({
      where: { nombre, direccion, latitud, longitud },
      select: localizacionSelect,
    });
    if (existing) return Response.json({ localizacion: existing, creada: false });

    const localizacion = await prisma.localizacion.create({
      data: {
        nombre,
        tipoEspacio,
        estilo: null,
        direccion,
        municipio,
        distritoBarrio,
        latitud,
        longitud,
        titularidad: "Por confirmar",
      },
      select: localizacionSelect,
    });

    return Response.json({ localizacion, creada: true }, { status: 201 });
  } catch (error) {
    console.error("Could not save an external location to the catalog.", error);
    return Response.json({ error: "No se pudo guardar la localización en el catálogo." }, { status: 500 });
  }
}
