"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { del } from "@vercel/blob";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarLocalizaciones } from "@/lib/roles";
import { esFotoBlobValida, esFotoSubidaValida } from "@/lib/fotos-localizacion";

interface FotosLocalizacionState {
  status: "idle" | "error" | "success";
  message: string;
}

export async function actualizarFotosLocalizacion(
  localizacionId: string,
  _previousState: FotosLocalizacionState,
  formData: FormData,
): Promise<FotosLocalizacionState> {
  const session = await getServerSession(authOptions);
  if (!puedeGestionarLocalizaciones(session?.user?.rol)) {
    return { status: "error", message: "Necesitas un rol autorizado para editar la galería." };
  }

  let fotos: unknown;
  try {
    fotos = JSON.parse(String(formData.get("fotos") ?? "[]"));
  } catch {
    return { status: "error", message: "No se pudo leer la galería enviada." };
  }

  if (
    !Array.isArray(fotos) ||
    fotos.length > 8 ||
    fotos.some((foto) => !esFotoSubidaValida(foto))
  ) {
    return { status: "error", message: "La galería admite hasta ocho imágenes subidas válidas." };
  }

  let fotosAnteriores: string[];
  try {
    const localizacion = await prisma.localizacion.findUnique({
      where: { id: localizacionId },
      select: { fotos: true },
    });
    if (!localizacion) {
      return { status: "error", message: "No se encontró la localización." };
    }
    fotosAnteriores = localizacion.fotos;
    await prisma.localizacion.update({
      where: { id: localizacionId },
      data: { fotos },
    });
  } catch (error) {
    console.error("Could not save location scouting photos.", error);
    return { status: "error", message: "No se pudo guardar la galería. Inténtalo de nuevo." };
  }

  let falloAlEliminar = false;
  const eliminadas = fotosAnteriores.filter((foto) => !fotos.includes(foto));
  for (const foto of eliminadas) {
    try {
      const referencias = await prisma.localizacion.count({ where: { fotos: { has: foto } } });
      if (referencias > 0) continue;

      if (esFotoBlobValida(foto)) {
        await del(foto);
      } else {
        const archivo = path.resolve(process.cwd(), "public", foto.slice(1));
        const uploads = path.resolve(process.cwd(), "public", "uploads");
        if (path.dirname(archivo) === uploads) await unlink(archivo);
      }
    } catch (error) {
      falloAlEliminar = true;
      console.error("Could not remove an unreferenced scouting photo.", error);
    }
  }

  revalidatePath("/");
  return {
    status: "success",
    message: falloAlEliminar
      ? "Galería actualizada; no se pudo liberar uno o más archivos eliminados."
      : "Galería actualizada.",
  };
}