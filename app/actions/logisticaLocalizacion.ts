"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarLocalizaciones } from "@/lib/roles";
import {
  calcularMetrosLineales,
  validarDatosLogistica,
} from "@/lib/logistica-localizacion";

export async function actualizarLogisticaLocalizacion(
  localizacionId: string,
  datosEnviados: unknown,
): Promise<{ status: "success" | "error"; message: string }> {
  const session = await getServerSession(authOptions);
  if (!puedeGestionarLocalizaciones(session?.user?.rol)) {
    return { status: "error", message: "Necesitas un rol autorizado para editar la logística." };
  }
  if (!localizacionId || localizacionId.length > 100) {
    return { status: "error", message: "La localización indicada no es válida." };
  }

  const datos = validarDatosLogistica(datosEnviados);
  if (!datos) {
    return { status: "error", message: "Revisa los vehículos, las opciones de ocupación y las notas." };
  }

  try {
    await prisma.localizacion.update({
      where: { id: localizacionId },
      data: {
        metrosLineales: calcularMetrosLineales(datos.desgloseVehiculos),
        desgloseVehiculos: {
          camionesLuces: datos.desgloseVehiculos.camionesLuces,
          camionesGripo: datos.desgloseVehiculos.camionesGripo,
          grupoElectrogeno: datos.desgloseVehiculos.grupoElectrogeno,
          trailersVestuario: datos.desgloseVehiculos.trailersVestuario,
          furgonetas: datos.desgloseVehiculos.furgonetas,
          espaciosSeguridad: datos.desgloseVehiculos.espaciosSeguridad,
        } satisfies Prisma.InputJsonObject,
        tipoEstacionamiento: datos.tipoEstacionamiento,
        afeccionTrafico: datos.afeccionTrafico,
        notasPermisos: datos.notasPermisos || null,
      },
    });
  } catch (error) {
    console.error("Could not save location public-space logistics.", error);
    return { status: "error", message: "No se pudo guardar la logística de vía pública." };
  }

  revalidatePath("/");
  return { status: "success", message: "Logística y ocupación guardadas." };
}
