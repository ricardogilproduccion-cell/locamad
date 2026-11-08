import { getServerSession } from "next-auth/next";
import { EstadoProyectoLocalizacion } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarLocalizaciones } from "@/lib/roles";

const estadosValidos = new Set<string>(Object.values(EstadoProyectoLocalizacion));

export async function POST(
  request: Request,
  context: { params: Promise<{ proyectoId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Inicia sesión para asignar localizaciones." }, { status: 401 });
  }
  if (!puedeGestionarLocalizaciones(session.user.rol)) {
    return Response.json({ error: "Tu rol no permite asignar localizaciones." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "Los datos de asignación no son válidos." }, { status: 400 });
  }

  const input = payload as Record<string, unknown>;
  const { proyectoId } = await context.params;
  const localizacionId = typeof input.localizacionId === "string" ? input.localizacionId : "";
  const estadoScouting = typeof input.estadoScouting === "string" ? input.estadoScouting : "EN_VALORACION";
  const dias = input.diasRodajeEstimados;
  const incluyeDias = Object.hasOwn(input, "diasRodajeEstimados");
  const incluyeNotas = Object.hasOwn(input, "notasProduccion");
  const notasProduccion = typeof input.notasProduccion === "string" ? input.notasProduccion.trim() : "";

  if (
    !localizacionId ||
    !estadosValidos.has(estadoScouting) ||
    (incluyeDias && dias !== null && (typeof dias !== "number" || !Number.isInteger(dias) || dias < 0)) ||
    (incluyeNotas && typeof input.notasProduccion !== "string") ||
    notasProduccion.length > 2000
  ) {
    return Response.json({ error: "Revisa la localización, estado, días y notas." }, { status: 400 });
  }

  try {
    const [proyecto, localizacion] = await Promise.all([
      prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true } }),
      prisma.localizacion.findUnique({ where: { id: localizacionId }, select: { id: true } }),
    ]);
    if (!proyecto || !localizacion) {
      return Response.json({ error: "No se encontró el proyecto o la localización." }, { status: 404 });
    }

    const asignacion = await prisma.proyectoLocalizacion.upsert({
      where: { proyectoId_localizacionId: { proyectoId, localizacionId } },
      update: {
        estadoScouting: estadoScouting as EstadoProyectoLocalizacion,
        diasRodajeEstimados: incluyeDias ? dias === null ? null : Number(dias) : undefined,
        notasProduccion: incluyeNotas ? notasProduccion || null : undefined,
      },
      create: {
        proyectoId,
        localizacionId,
        estadoScouting: estadoScouting as EstadoProyectoLocalizacion,
        diasRodajeEstimados: !incluyeDias || dias === null ? null : Number(dias),
        notasProduccion: notasProduccion || null,
      },
      select: {
        id: true,
        proyectoId: true,
        localizacionId: true,
        estadoScouting: true,
        diasRodajeEstimados: true,
        notasProduccion: true,
      },
    });
    revalidatePath("/");
    return Response.json({ asignacion });
  } catch (error) {
    console.error("Could not assign location to project through the API.", error);
    return Response.json({ error: "No se pudo guardar la asignación del proyecto." }, { status: 500 });
  }
}
