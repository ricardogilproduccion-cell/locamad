import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { puedeGestionarLocalizaciones } from "@/lib/roles";

const maxBytesPerFile = 8 * 1024 * 1024;
const maxFiles = 8;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function signatureMatches(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte,
    );
  }
  if (type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Inicia sesión para subir fotografías." }, { status: 401 });
  if (!puedeGestionarLocalizaciones(session.user.rol)) {
    return Response.json({ error: "Tu rol no permite subir fotografías." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "No se pudo leer la subida." }, { status: 400 });
  }

  const entries = formData.getAll("files");
  if (!entries.length || entries.length > maxFiles || entries.some((entry) => !(entry instanceof File))) {
    return Response.json({ error: `Selecciona entre una y ${maxFiles} imágenes.` }, { status: 400 });
  }

  const uploadsDirectory = path.join(process.cwd(), "public", "uploads");
  const savedPaths: string[] = [];
  const urls: string[] = [];

  try {
    await mkdir(uploadsDirectory, { recursive: true });

    for (const entry of entries) {
      const file = entry as File;
      const extension = extensions[file.type];
      if (!extension || file.size === 0 || file.size > maxBytesPerFile) {
        throw new Error("Cada archivo debe ser JPG, PNG o WebP y no superar 8 MB.");
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!signatureMatches(file.type, bytes)) {
        throw new Error("El contenido de uno de los archivos no coincide con su formato de imagen.");
      }

      const filename = `${randomUUID()}.${extension}`;
      const destination = path.join(uploadsDirectory, filename);
      await writeFile(destination, bytes, { flag: "wx" });
      savedPaths.push(destination);
      urls.push(`/uploads/${filename}`);
    }

    return Response.json({ urls });
  } catch (error) {
    await Promise.all(savedPaths.map((filePath) => unlink(filePath).catch(() => undefined)));
    const message = error instanceof Error ? error.message : "No se pudieron guardar las imágenes.";
    return Response.json({ error: message }, { status: 400 });
  }
}