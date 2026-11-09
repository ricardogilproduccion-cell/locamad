"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { TipoAparcamiento } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarLocalizaciones } from "@/lib/roles";
import { esFotoSubidaValida } from "@/lib/fotos-localizacion";
import {
  calcularMetrosLineales,
  validarDatosLogistica,
} from "@/lib/logistica-localizacion";

interface CrearLocalizacionState {
  status: "idle" | "error" | "success";
  message: string;
}

const tiposEspacioValidos = new Set(["Industrial", "Palacete", "Vivienda", "Exterior"]);
function leerFotos(formData: FormData): string[] | null {
  try {
    const fotos: unknown = JSON.parse(String(formData.get("fotos") ?? "[]"));
    if (
      !Array.isArray(fotos) ||
      fotos.length > 8 ||
      fotos.some((foto) => !esFotoSubidaValida(foto))
    ) {
      return null;
    }
    return fotos;
  } catch (error) {
    console.error("Could not create location with scouting photos.", error);
    return null;
  }
}

export async function crearLocalizacion(
  _previousState: CrearLocalizacionState,
  formData: FormData,
): Promise<CrearLocalizacionState> {
  const session = await getServerSession(authOptions);
  if (!puedeGestionarLocalizaciones(session?.user?.rol)) {
    return { status: "error", message: "Necesitas un rol autorizado para crear localizaciones." };
  }

  const texto = (campo: string) => String(formData.get(campo) ?? "").trim();
  const nombre = texto("nombre");
  const tipoEspacio = texto("tipoEspacio");
  const direccion = texto("direccion");
  const municipio = texto("municipio");
  const latitudTexto = texto("latitud");
  const longitudTexto = texto("longitud");

  if (!nombre || !tipoEspacio || !direccion || !municipio || !latitudTexto || !longitudTexto) {
    return { status: "error", message: "Completa los campos obligatorios para guardar la localización." };
  }
  if (!tiposEspacioValidos.has(tipoEspacio)) {
    return { status: "error", message: "Selecciona un tipo de inmueble válido." };
  }

  const latitud = Number(latitudTexto);
  const longitud = Number(longitudTexto);
  if (
    !Number.isFinite(latitud) ||
    latitud < -90 ||
    latitud > 90 ||
    !Number.isFinite(longitud) ||
    longitud < -180 ||
    longitud > 180
  ) {
    return { status: "error", message: "Introduce coordenadas válidas: latitud entre -90 y 90 y longitud entre -180 y 180." };
  }

  const potenciaTexto = texto("potenciaElectricaKw");
  const galiboTexto = texto("galiboCamionesM");
  const potenciaElectricaKw = potenciaTexto ? Number(potenciaTexto) : null;
  const galiboCamionesM = galiboTexto ? Number(galiboTexto) : null;
  if (
    (potenciaElectricaKw !== null && (!Number.isFinite(potenciaElectricaKw) || potenciaElectricaKw < 0)) ||
    (galiboCamionesM !== null && (!Number.isFinite(galiboCamionesM) || galiboCamionesM < 0))
  ) {
    return { status: "error", message: "La potencia y el gálibo deben ser números iguales o mayores que cero." };
  }

  const contactoNombre = texto("contactoNombre");
  const contactoTelefono = texto("contactoTelefono");
  const notasAcometida = texto("notasAcometida");
  if (!contactoNombre && (contactoTelefono || notasAcometida)) {
    return { status: "error", message: "Indica el nombre del contacto para guardar su teléfono o sus notas." };
  }

  const fotos = leerFotos(formData);
  if (!fotos) {
    return { status: "error", message: "La galería admite hasta ocho imágenes subidas válidas." };
  }

  let desgloseVehiculos: unknown;
  try {
    desgloseVehiculos = JSON.parse(texto("desgloseVehiculos"));
  } catch {
    return { status: "error", message: "No se pudo leer el desglose de vehículos." };
  }
  const datosLogistica = validarDatosLogistica({
    desgloseVehiculos,
    tipoEstacionamiento: texto("tipoEstacionamiento") || null,
    afeccionTrafico: texto("afeccionTrafico") || null,
    notasPermisos: texto("notasPermisos"),
  });
  if (!datosLogistica) {
    return { status: "error", message: "Revisa los datos de logística y ocupación de vía pública." };
  }

  const esZbedepCentro = formData.has("esZbedepCentro");
  const tipoAparcamiento = texto("aparcamientoSer");
  const aparcamientoSer =
    tipoAparcamiento === "ZONA_AZUL"
      ? TipoAparcamiento.SER_AZUL
      : tipoAparcamiento === "ZONA_VERDE"
        ? TipoAparcamiento.SER_VERDE
        : TipoAparcamiento.LIBRE;

  try {
    await prisma.localizacion.create({
      data: {
        nombre,
        tipoEspacio,
        direccion,
        municipio,
        distritoBarrio: texto("distritoBarrio") || null,
        latitud,
        longitud,
        titularidad: "Por confirmar",
        potenciaElectricaKw,
        galiboCamionesM,
        aparcamientoSer,
        metrosLineales: calcularMetrosLineales(datosLogistica.desgloseVehiculos),
        desgloseVehiculos: {
          camionesLuces: datosLogistica.desgloseVehiculos.camionesLuces,
          camionesGripo: datosLogistica.desgloseVehiculos.camionesGripo,
          grupoElectrogeno: datosLogistica.desgloseVehiculos.grupoElectrogeno,
          trailersVestuario: datosLogistica.desgloseVehiculos.trailersVestuario,
          furgonetas: datosLogistica.desgloseVehiculos.furgonetas,
          espaciosSeguridad: datosLogistica.desgloseVehiculos.espaciosSeguridad,
        } satisfies Prisma.InputJsonObject,
        tipoEstacionamiento: datosLogistica.tipoEstacionamiento,
        afeccionTrafico: datosLogistica.afeccionTrafico,
        notasPermisos: datosLogistica.notasPermisos || null,
        esZbe: formData.has("esZbe") || esZbedepCentro,
        esZbedepCentro,
        espacioBaseProd: formData.has("espacioBaseProd"),
        tomaAgua: formData.has("tomaAgua"),
        fotos,
        ...(contactoNombre
          ? {
              contactos: {
                create: {
                  nombre: contactoNombre,
                  telefono: contactoTelefono || null,
                  notasTrato: notasAcometida || null,
                },
              },
            }
          : {}),
      },
    });
  } catch (error) {
    console.error("Could not create location with public-space logistics.", error);
    return { status: "error", message: "No se pudo guardar la localización. Inténtalo de nuevo." };
  }

  revalidatePath("/");
  return { status: "success", message: "Localización creada correctamente." };
}