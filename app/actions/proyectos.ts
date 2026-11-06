"use server";

import { getServerSession } from "next-auth/next";
import { EstadoProyectoLocalizacion } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarLocalizaciones } from "@/lib/roles";

interface AsignacionProyectoState {
  status: "idle" | "error" | "success";
  message: string;
}

const estadosValidos = new Set<string>(Object.values(EstadoProyectoLocalizacion));

export async function guardarAsignacionProyecto(
  localizacionId: string,
  _previousState: AsignacionProyectoState,
  formData: FormData,
): Promise<AsignacionProyectoState> {
  const session = await getServerSession(authOptions);
  if (!puedeGestionarLocalizaciones(session?.user?.rol)) {
    return { status: "error", message: "Necesitas un rol autorizado para asignar localizaciones." };
  }

  const proyectoId = String(formData.get("proyectoId") ?? "");
  const estado = String(formData.get("estado") ?? "");
  const diasTexto = String(formData.get("diasRodajeEstimados") ?? "").trim();
  const notasProduccion = String(formData.get("notasProduccion") ?? "").trim();
  const diasRodajeEstimados = diasTexto ? Number(diasTexto) : null;

  if (!proyectoId || !estadosValidos.has(estado)) {
    return { status: "error", message: "Selecciona un proyecto y un estado válidos." };
  }
  if (
    diasRodajeEstimados !== null &&
    (!Number.isInteger(diasRodajeEstimados) || diasRodajeEstimados < 0)
  ) {
    return { status: "error", message: "Los días estimados deben ser un número entero igual o mayor que cero." };
  }
  if (notasProduccion.length > 2000) {
    return { status: "error", message: "Las notas no pueden superar los 2.000 caracteres." };
  }

  try {
    await prisma.proyectoLocalizacion.upsert({
      where: {
        proyectoId_localizacionId: { proyectoId, localizacionId },
      },
      update: {
        estado: estado as EstadoProyectoLocalizacion,
        diasRodajeEstimados,
        notasProduccion: notasProduccion || null,
      },
      create: {
        proyectoId,
        localizacionId,
        estado: estado as EstadoProyectoLocalizacion,
        diasRodajeEstimados,
        notasProduccion: notasProduccion || null,
      },
    });
  } catch {
    return { status: "error", message: "No se pudo guardar la asignación del proyecto." };
  }

  revalidatePath("/");
  return { status: "success", message: "Asignación de proyecto guardada." };
}