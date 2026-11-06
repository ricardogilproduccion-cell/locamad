"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarLocalizaciones } from "@/lib/roles";

interface FotosLocalizacionState {
  status: "idle" | "error" | "success";
  message: string;
}

const fotoLocalValida = /^\/uploads\/[\w-]+\.(?:jpg|png|webp)$/i;

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
    fotos.some((foto) => typeof foto !== "string" || !fotoLocalValida.test(foto))
  ) {
    return { status: "error", message: "La galería admite hasta ocho imágenes subidas válidas." };
  }

  try {
    await prisma.localizacion.update({
      where: { id: localizacionId },
      data: { fotos },
    });
  } catch {
    return { status: "error", message: "No se pudo guardar la galería. Inténtalo de nuevo." };
  }

  revalidatePath("/");
  return { status: "success", message: "Galería actualizada." };
}