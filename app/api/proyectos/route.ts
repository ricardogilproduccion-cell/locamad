import { getServerSession } from "next-auth/next";
import { EstadoProyecto, TipoProyecto } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarLocalizaciones } from "@/lib/roles";

const tiposValidos = new Set<string>(Object.values(TipoProyecto));

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Inicia sesión para consultar proyectos." }, { status: 401 });
  }

  try {
    const proyectos = await prisma.proyecto.findMany({
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        productora: true,
        estado: true,
        notas: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return Response.json({ proyectos });
  } catch (error) {
    console.error("Could not list projects.", error);
    return Response.json({ error: "No se pudieron consultar los proyectos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Inicia sesión para crear proyectos." }, { status: 401 });
  }
  if (!puedeGestionarLocalizaciones(session.user.rol)) {
    return Response.json({ error: "Tu rol no permite crear proyectos." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "Los datos del proyecto no son válidos." }, { status: 400 });
  }

  const input = payload as Record<string, unknown>;
  const nombre = typeof input.nombre === "string" ? input.nombre.trim() : "";
  const tipo = typeof input.tipo === "string" ? input.tipo : "LARGOMETRAJE";
  const productora = typeof input.productora === "string" ? input.productora.trim() : "";
  const notas = typeof input.notas === "string" ? input.notas.trim() : "";
  const estado = typeof input.estado === "string" ? input.estado : EstadoProyecto.ACTIVO;

  if (
    (Object.hasOwn(input, "tipo") && typeof input.tipo !== "string") ||
    (Object.hasOwn(input, "productora") && typeof input.productora !== "string") ||
    (Object.hasOwn(input, "notas") && typeof input.notas !== "string") ||
    (Object.hasOwn(input, "estado") && typeof input.estado !== "string") ||
    !nombre ||
    nombre.length > 120 ||
    !tiposValidos.has(tipo) ||
    productora.length > 160 ||
    notas.length > 2000 ||
    !Object.values(EstadoProyecto).includes(estado as EstadoProyecto)
  ) {
    return Response.json({ error: "Revisa el nombre, tipo, productora, estado y notas del proyecto." }, { status: 400 });
  }

  try {
    const proyecto = await prisma.proyecto.create({
      data: {
        nombre,
        tipo: tipo as TipoProyecto,
        productora: productora || null,
        notas: notas || null,
        estado: estado as EstadoProyecto,
      },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        productora: true,
        estado: true,
        notas: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return Response.json({ proyecto }, { status: 201 });
  } catch (error) {
    console.error("Could not create project through the API.", error);
    return Response.json({ error: "No se pudo crear el proyecto." }, { status: 500 });
  }
}
