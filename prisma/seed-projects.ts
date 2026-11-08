import {
  EstadoProyecto,
  EstadoProyectoLocalizacion,
  PrismaClient,
  TipoProyecto,
} from "@prisma/client";

const prisma = new PrismaClient();

const proyectosDemo = [
  {
    nombre: "El laberinto de las mariposas",
    tipo: TipoProyecto.LARGOMETRAJE,
    productora: "Secuoya Studios",
    fechaInicio: new Date("2026-11-15"),
    fechaFin: new Date("2027-02-28"),
  },
  {
    nombre: "Distrito Cero",
    tipo: TipoProyecto.SERIE,
    productora: "Marea Films",
    fechaInicio: new Date("2027-03-08"),
    fechaFin: new Date("2027-05-30"),
  },
  {
    nombre: "Madrid en un minuto",
    tipo: TipoProyecto.PUBLICIDAD,
    productora: "Trébol Creativo",
    fechaInicio: new Date("2027-01-18"),
    fechaFin: new Date("2027-01-22"),
  },
];

const asignacionesDemo = [
  {
    proyecto: "El laberinto de las mariposas",
    localizacion: "Plaza del Alamillo (Taberna Histórica)",
    estadoScouting: EstadoProyectoLocalizacion.APROBADA,
    diasRodajeEstimados: 2,
    notasProduccion: "Acceso de equipo por la mañana; confirmar acometida eléctrica.",
  },
  {
    proyecto: "Distrito Cero",
    localizacion: "Piso Señorial Calle Almagro",
    estadoScouting: EstadoProyectoLocalizacion.EN_VALORACION,
    diasRodajeEstimados: 3,
    notasProduccion: "Pendiente de visita técnica y comprobación de horarios.",
  },
  {
    proyecto: "Madrid en un minuto",
    localizacion: "Edificio de Oficinas Las Tablas",
    estadoScouting: EstadoProyectoLocalizacion.PROPUESTA,
    diasRodajeEstimados: 1,
    notasProduccion: "Opción para planos de recurso y unidad ligera.",
  },
];

async function main() {
  const proyectosPorNombre = new Map<string, string>();

  for (const datos of proyectosDemo) {
    const existente = await prisma.proyecto.findFirst({ where: { nombre: datos.nombre } });
    const proyecto = existente
      ? await prisma.proyecto.update({
          where: { id: existente.id },
          data: { ...datos, estado: EstadoProyecto.PREPARACION },
        })
      : await prisma.proyecto.create({
          data: { ...datos, estado: EstadoProyecto.PREPARACION },
        });
    proyectosPorNombre.set(proyecto.nombre, proyecto.id);
  }

  for (const datos of asignacionesDemo) {
    const proyectoId = proyectosPorNombre.get(datos.proyecto);
    const localizacion = await prisma.localizacion.findFirst({
      where: { nombre: datos.localizacion },
      select: { id: true },
    });
    if (!proyectoId || !localizacion) continue;

    await prisma.proyectoLocalizacion.upsert({
      where: {
        proyectoId_localizacionId: { proyectoId, localizacionId: localizacion.id },
      },
      update: {
        estadoScouting: datos.estadoScouting,
        diasRodajeEstimados: datos.diasRodajeEstimados,
        notasProduccion: datos.notasProduccion,
      },
      create: {
        proyectoId,
        localizacionId: localizacion.id,
        estadoScouting: datos.estadoScouting,
        diasRodajeEstimados: datos.diasRodajeEstimados,
        notasProduccion: datos.notasProduccion,
      },
    });
  }

  console.log(`Proyectos de ejemplo listos: ${proyectosPorNombre.size}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());