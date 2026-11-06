"use server";

import { getServerSession } from "next-auth/next";
import { TipoProyecto } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarLocalizaciones } from "@/lib/roles";

export interface CrearProyectoState {
  status: "idle" | "error" | "success";
  message: string;
  proyectoId?: string;
}

const tiposValidos = new Set<string>(Object.values(TipoProyecto));

export async function crearProyecto(
  _previousState: CrearProyectoState,
  formData: FormData,
): Promise<CrearProyectoState> {
  const session = await getServerSession(authOptions);
  if (!puedeGestionarLocalizaciones(session?.user?.rol)) {
    return { status: "error", message: "Necesitas un rol autorizado para crear proyectos." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const productora = String(formData.get("productora") ?? "").trim();

  if (!nombre || nombre.length > 120 || !tiposValidos.has(tipo) || productora.length > 160) {
    return { status: "error", message: "Revisa el nombre, el tipo y la productora del proyecto." };
  }

  try {
    const proyecto = await prisma.proyecto.create({
      data: {
        nombre,
        tipo: tipo as TipoProyecto,
        productora: productora || null,
      },
      select: { id: true },
    });

    revalidatePath("/");
    return {
      status: "success",
      message: "Proyecto creado correctamente.",
      proyectoId: proyecto.id,
    };
  } catch {
    return { status: "error", message: "No se pudo crear el proyecto. Inténtalo de nuevo." };
  }
}