const fotoLocalValida = /^\/uploads\/[\w-]+\.(?:jpg|jpeg|png|webp)$/i;
const rutaBlobValida = /^\/scouting\/[\w-]+\.(?:jpg|jpeg|png|webp)$/i;

export function esFotoSubidaValida(foto: unknown): foto is string {
  if (typeof foto !== "string") return false;
  if (fotoLocalValida.test(foto)) return true;

  try {
    const url = new URL(foto);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      !url.search &&
      !url.hash &&
      rutaBlobValida.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function esFotoBlobValida(foto: string) {
  if (!esFotoSubidaValida(foto) || fotoLocalValida.test(foto)) return false;
  return true;
}
