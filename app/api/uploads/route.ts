import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth/next";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { authOptions } from "@/auth";
import { puedeGestionarLocalizaciones } from "@/lib/roles";

const maxBytesPerFile = 8 * 1024 * 1024;
const maxFiles = 8;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function getUploadSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { response: Response.json({ error: "Inicia sesión para subir fotografías." }, { status: 401 }) };
  }
  if (!puedeGestionarLocalizaciones(session.user.rol)) {
    return { response: Response.json({ error: "Tu rol no permite subir fotografías." }, { status: 403 }) };
  }
  return { response: null };
}

export async function GET() {
  const { response } = await getUploadSession();
  if (response) return response;
  return Response.json({ storage: process.env.VERCEL ? "blob" : "local" });
}

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

function esSolicitudDeToken(body: unknown): body is Extract<HandleUploadBody, { type: "blob.generate-client-token" }> {
  if (!body || typeof body !== "object" || !("type" in body) || body.type !== "blob.generate-client-token") {
    return false;
  }
  if (!("payload" in body) || !body.payload || typeof body.payload !== "object") return false;
  const payload = body.payload;
  return (
    "pathname" in payload &&
    typeof payload.pathname === "string" &&
    "multipart" in payload &&
    typeof payload.multipart === "boolean" &&
    "clientPayload" in payload &&
    (typeof payload.clientPayload === "string" || payload.clientPayload === null)
  );
}

export async function POST(request: Request) {
  if (process.env.VERCEL) {
    const { response } = await getUploadSession();
    if (response) return response;

    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json({ error: "No se pudo leer la autorización de subida." }, { status: 400 });
    }
    if (!esSolicitudDeToken(input)) {
      return Response.json({ error: "La solicitud de autorización no es válida." }, { status: 400 });
    }
    const body: HandleUploadBody = input;

    try {
      const result = await handleUpload({
        request,
        body,
        onBeforeGenerateToken: async (pathname, _clientPayload, multipart) => {
          if (multipart || !/^scouting\/[\w-]+\.(?:jpg|jpeg|png|webp)$/i.test(pathname)) {
            throw new Error("La ruta o el modo de subida no son válidos.");
          }
          const extension = path.extname(pathname).slice(1).toLowerCase();
          const contentType = Object.entries(extensions).find(([, ext]) => ext === extension)?.[0];
          if (!contentType) throw new Error("El formato de imagen no es válido.");
          return {
            allowedContentTypes: [contentType],
            maximumSizeInBytes: maxBytesPerFile,
            addRandomSuffix: false,
          };
        },
      });
      return Response.json(result);
    } catch (error) {
      console.error("Could not authorize Vercel Blob scouting photo upload.", error);
      return Response.json(
        { error: error instanceof Error ? error.message : "No se pudo autorizar la subida." },
        { status: 400 },
      );
    }
  }

  const { response } = await getUploadSession();
  if (response) return response;

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
    const cleanupResults = await Promise.allSettled(savedPaths.map((filePath) => unlink(filePath)));
    cleanupResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Could not clean up a partial scouting photo upload.", result.reason);
      }
    });
    const message = error instanceof Error ? error.message : "No se pudieron guardar las imágenes.";
    return Response.json({ error: message }, { status: 400 });
  }
}