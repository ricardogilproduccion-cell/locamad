import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import ExploradorLocalizaciones from "./components/ExploradorLocalizaciones";

export const metadata = {
  title: "LocaMad | Localizaciones de rodaje",
  description: "Catálogo y mapa logístico de localizaciones para rodajes en Madrid.",
};

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#f2f3ef] text-sm text-[#62685f]">
          Cargando localizaciones...
        </div>
      }
    >
      <CatalogoLocalizaciones />
    </Suspense>
  );
}

async function CatalogoLocalizaciones() {
  await connection();
  const session = await getServerSession(authOptions);
  const localizaciones = await prisma.localizacion.findMany({
    orderBy: [{ estado: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      tipoEspacio: true,
      estilo: true,
      direccion: true,
      municipio: true,
      distritoBarrio: true,
      latitud: true,
      longitud: true,
      titularidad: true,
      potenciaElectricaKw: true,
      tomaAgua: true,
      aseosDisponibles: true,
      galiboCamionesM: true,
      espacioBaseProd: true,
      nivelRuidoDb: true,
      orientacionLuz: true,
      esZbe: true,
      esZbedepCentro: true,
      aparcamientoSer: true,
      fotos: true,
      asignaciones: {
        select: {
          id: true,
          proyectoId: true,
          localizacionId: true,
          estado: true,
          diasRodajeEstimados: true,
          notasProduccion: true,
          proyecto: { select: { id: true, nombre: true, tipo: true } },
        },
      },
      valoracion: true,
      estado: true,
      contactos: {
        select: {
          id: true,
          nombre: true,
          telefono: true,
          email: true,
          rolCargo: true,
          notasTrato: true,
        },
      },
    },
  });
  const proyectos = await prisma.proyecto.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, tipo: true },
  });

  return (
    <ExploradorLocalizaciones
      localizaciones={localizaciones}
      proyectos={proyectos}
      usuario={session?.user ? {
        nombre: session.user.name || session.user.email || "Usuario",
        rol: session.user.rol,
      } : null}
    />
  );
}