"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, UploadCloud, X } from "lucide-react";

const maxPhotos = 8;
const maxBytesPerFile = 8 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

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
    const invalido = archivos.find((file) => !allowedTypes.has(file.type) || file.size === 0 || file.size > maxBytesPerFile);
    if (invalido) {
      setError("Usa imágenes JPG, PNG o WebP de hasta 8 MB cada una.");
      return;
    }

    setPreviews(archivos.map((file) => ({ file, url: URL.createObjectURL(file) })));
    setSubiendo(true);
    onUploadingChange?.(true);
    try {
      const datos = new FormData();
      archivos.forEach((file) => datos.append("files", file));
      const respuesta = await fetch("/api/uploads", { method: "POST", body: datos });
      const resultado = (await respuesta.json()) as { urls?: string[]; error?: string };
      if (!respuesta.ok || !resultado.urls || resultado.urls.length !== archivos.length) {
        throw new Error(resultado.error || "No se pudieron subir las imágenes.");
      }
      onChange([...fotos, ...resultado.urls]);
    } catch (uploadError) {
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
          <ImagePlus size={14} /> Examinar imágenes
        </button>
      </div>

      {subiendo && (
        <p className="mt-2 flex items-center gap-2 text-xs text-[#596158]" role="status">
          <LoaderCircle className="animate-spin" size={14} /> Subiendo imágenes...
        </p>
      )}
      {error && <p className="mt-2 text-xs text-[#9b422d]" role="alert">{error}</p>}

      {(fotos.length > 0 || previews.length > 0) && (
        <div className="locamad-print-gallery mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fotos.map((foto) => (
            <figure className="group relative aspect-[4/3] overflow-hidden border border-[#e1e4dd] bg-[#e7e9e3]" key={foto}>
              <Image alt="Fotografía de la localización" className="object-cover" fill sizes="(max-width: 640px) 50vw, 180px" src={foto} unoptimized />
              <button
                aria-label="Quitar fotografía"
                className="absolute right-1 top-1 grid size-7 place-items-center bg-[#17201b]/75 text-white hover:bg-[#17201b]"
                onClick={() => onChange(fotos.filter((item) => item !== foto))}
                type="button"
              >
                <X size={14} />
              </button>
            </figure>
          ))}
          {previews.map(({ file, url }) => (
            <figure className="relative aspect-[4/3] overflow-hidden border border-[#e1e4dd] bg-[#e7e9e3]" key={`${file.name}-${file.lastModified}`}>
              <Image alt={`Vista previa de ${file.name}`} className="object-cover opacity-70" fill sizes="(max-width: 640px) 50vw, 180px" src={url} unoptimized />
              <span className="absolute inset-x-0 bottom-0 bg-[#17201b]/75 px-2 py-1 text-[10px] text-white">Subiendo...</span>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}