"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { upload } from "@vercel/blob/client";
import { ImagePlus, LoaderCircle, Star, UploadCloud, X } from "lucide-react";

const maxPhotos = 8;
const maxBytesPerFile = 8 * 1024 * 1024;
const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

interface PreviewFile {
  file: File;
  url: string;
}

export default function SelectorFotos({
  fotos,
  onChange,
  onUploadingChange,
}: {
  fotos: string[];
  onChange: (fotos: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [fotoVisor, setFotoVisor] = useState<string | null>(null);
  const [fotoPorEliminar, setFotoPorEliminar] = useState<string | null>(null);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  useEffect(() => {
    if (!fotoVisor) return;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFotoVisor(null);
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [fotoVisor]);

  const subir = async (seleccion: File[]) => {
    setError("");
    const disponibles = maxPhotos - fotos.length;
    const archivos = seleccion.slice(0, disponibles);
    if (!archivos.length) {
      setError(`Puedes guardar hasta ${maxPhotos} fotografías por localización.`);
      return;
    }
    if (seleccion.length > disponibles) {
      setError(`Solo se aceptan ${maxPhotos} imágenes por localización.`);
      return;
    }
    const invalido = archivos.find((file) => !allowedTypes[file.type] || file.size === 0 || file.size > maxBytesPerFile);
    if (invalido) {
      setError("Usa imágenes JPG, PNG o WebP de hasta 8 MB cada una.");
      return;
    }

    setPreviews(archivos.map((file) => ({ file, url: URL.createObjectURL(file) })));
    setSubiendo(true);
    onUploadingChange?.(true);
    const urlsSubidas: string[] = [];
    try {
      const modoRespuesta = await fetch("/api/uploads");
      const modo = (await modoRespuesta.json()) as { storage?: string; error?: string };
      if (!modoRespuesta.ok || !modo.storage) {
        throw new Error(modo.error || "No se pudo comprobar el almacenamiento de fotografías.");
      }

      if (modo.storage === "blob") {
        for (const file of archivos) {
          const resultado = await upload(
            `scouting/${crypto.randomUUID()}.${allowedTypes[file.type]}`,
            file,
            {
              access: "public",
              contentType: file.type,
              handleUploadUrl: "/api/uploads",
            },
          );
          urlsSubidas.push(resultado.url);
          onChange([...fotos, ...urlsSubidas]);
        }
      } else {
        const datos = new FormData();
        archivos.forEach((file) => datos.append("files", file));
        const respuesta = await fetch("/api/uploads", { method: "POST", body: datos });
        const resultado = (await respuesta.json()) as { urls?: string[]; error?: string };
        if (!respuesta.ok || !resultado.urls || resultado.urls.length !== archivos.length) {
          throw new Error(resultado.error || "No se pudieron subir las imágenes.");
        }
        urlsSubidas.push(...resultado.urls);
        onChange([...fotos, ...urlsSubidas]);
      }
    } catch (uploadError) {
      if (urlsSubidas.length > 0) onChange([...fotos, ...urlsSubidas]);
      setError(uploadError instanceof Error ? uploadError.message : "No se pudieron subir las imágenes.");
    } finally {
      setSubiendo(false);
      onUploadingChange?.(false);
      setPreviews([]);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    void subir(Array.from(event.target.files ?? []));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!subiendo) void subir(Array.from(event.dataTransfer.files));
  };

  return (
    <div>
      <div
        className="locamad-no-print border border-dashed border-[#bdc8bb] bg-white px-4 py-4 text-center transition-colors hover:border-[#718a72]"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <UploadCloud className="mx-auto text-[#687c67]" size={20} />
        <p className="mt-2 text-xs font-medium text-[#50594f]">Arrastra las fotos aquí o examina los archivos</p>
        <p className="mt-1 text-[10px] text-[#858b82]">JPG, PNG o WebP · Máximo 8 MB por imagen · Hasta 8 fotos</p>
        <input
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          disabled={subiendo || fotos.length >= maxPhotos}
          multiple
          onChange={onFilesSelected}
          ref={inputRef}
          type="file"
        />
        <button
          className="mx-auto mt-3 inline-flex h-8 items-center gap-2 border border-[#dfe3db] px-3 text-xs font-semibold text-[#465344] hover:bg-[#f5f6f3] disabled:opacity-50"
          disabled={subiendo || fotos.length >= maxPhotos}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <ImagePlus size={14} /> Subir fotografías
        </button>
      </div>

      {subiendo && (
        <p className="mt-2 flex items-center gap-2 text-xs text-[#596158]" role="status">
          <LoaderCircle className="animate-spin" size={14} /> Subiendo imágenes...
        </p>
      )}
      {error && <p className="mt-2 text-xs text-[#9b422d]" role="alert">{error}</p>}

      {(fotos.length > 0 || previews.length > 0) && (
        <>
          <p className="mt-3 text-[10px] text-[#737a71]">
            La primera foto es la portada. Usa «Usar como portada» para cambiarla.
          </p>
          <div className="locamad-print-gallery mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fotos.map((foto, index) => (
            <figure className="group relative aspect-[4/3] overflow-hidden border border-[#e1e4dd] bg-[#e7e9e3]" key={foto}>
              <button
                aria-label={`Ampliar fotografía ${index + 1}`}
                className="absolute inset-0 size-full cursor-zoom-in"
                onClick={() => setFotoVisor(foto)}
                type="button"
              >
                <Image alt={`Fotografía de scouting ${index + 1}`} className="object-cover" fill sizes="(max-width: 640px) 50vw, 180px" src={foto} unoptimized />
              </button>
              {index === 0 ? (
                <span className="absolute bottom-1 left-1 flex items-center gap-1 bg-[#183d32]/90 px-2 py-1 text-[10px] font-semibold text-white">
                  <Star size={11} fill="currentColor" /> Foto de portada
                </span>
              ) : (
                <button
                  aria-label={`Usar fotografía ${index + 1} como portada`}
                  className="absolute bottom-1 left-1 flex items-center gap-1 bg-[#17201b]/75 px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#183d32]"
                  onClick={() => onChange([foto, ...fotos.filter((item) => item !== foto)])}
                  type="button"
                >
                  <Star size={11} /> Usar como portada
                </button>
              )}
              <button
                aria-label={`Eliminar fotografía ${index + 1}`}
                className="absolute right-1 top-1 grid size-7 place-items-center bg-[#17201b]/75 text-white hover:bg-[#17201b]"
                onClick={() => setFotoPorEliminar(foto)}
                type="button"
              >
                <X size={14} />
              </button>
              {fotoPorEliminar === foto && (
                <div
                  aria-label="Confirmar eliminación de fotografía"
                  className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-[#17201b]/95 p-2 text-[10px] text-white"
                  role="group"
                >
                  <span>¿Eliminar esta fotografía?</span>
                  <span className="flex gap-1">
                    <button
                      className="bg-[#a43d32] px-2 py-1 font-semibold hover:bg-[#8f3027]"
                      onClick={() => {
                        onChange(fotos.filter((item) => item !== foto));
                        setFotoPorEliminar(null);
                      }}
                      type="button"
                    >
                      Eliminar
                    </button>
                    <button
                      className="border border-white/60 px-2 py-1 hover:bg-white/10"
                      onClick={() => setFotoPorEliminar(null)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </span>
                </div>
              )}
            </figure>
          ))}
          {previews.map(({ file, url }) => (
            <figure className="relative aspect-[4/3] overflow-hidden border border-[#e1e4dd] bg-[#e7e9e3]" key={`${file.name}-${file.lastModified}`}>
              <Image alt={`Vista previa de ${file.name}`} className="object-cover opacity-70" fill sizes="(max-width: 640px) 50vw, 180px" src={url} unoptimized />
              <span className="absolute inset-x-0 bottom-0 bg-[#17201b]/75 px-2 py-1 text-[10px] text-white">Subiendo...</span>
            </figure>
          ))}
          </div>
        </>
      )}
      {fotoVisor && typeof document !== "undefined" && createPortal(
        <div
          aria-label="Visor de fotografía"
          aria-modal="true"
          className="fixed inset-0 z-[1400] flex items-center justify-center bg-[#101613]/95 p-4 sm:p-8"
          onClick={() => setFotoVisor(null)}
          role="dialog"
        >
          <button
            aria-label="Cerrar visor"
            className="absolute right-4 top-4 z-10 grid size-10 place-items-center border border-white/30 bg-black/40 text-white hover:bg-black/70"
            onClick={() => setFotoVisor(null)}
            type="button"
          >
            <X size={20} />
          </button>
          <div className="relative h-full max-h-[90vh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <Image alt="Fotografía de scouting ampliada" className="object-contain" fill sizes="100vw" src={fotoVisor} unoptimized />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}