export const opcionesEstacionamiento = [
  "Zona SER Verde",
  "Zona SER Azul",
  "Sin estacionamiento regulado",
  "Carga/Descarga",
] as const;

export const opcionesAfeccionTrafico = [
  "Sin afección",
  "Paso intermitente",
  "Corte puntual",
  "Corte total",
] as const;

export interface DesgloseVehiculos {
  camionesPesados: number;
  camionesMedios: number;
  furgonetas: number;
  margenManiobraM: number;
}

export interface DatosLogistica {
  desgloseVehiculos: DesgloseVehiculos;
  tipoEstacionamiento: (typeof opcionesEstacionamiento)[number] | null;
  afeccionTrafico: (typeof opcionesAfeccionTrafico)[number] | null;
  notasPermisos: string;
}

export const desgloseVehiculosVacio: DesgloseVehiculos = {
  camionesPesados: 0,
  camionesMedios: 0,
  furgonetas: 0,
  margenManiobraM: 0,
};

export function parseDesgloseVehiculos(value: unknown): DesgloseVehiculos | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const data = value as Record<string, unknown>;
  const leerCantidad = (key: string) => {
    const cantidad = data[key];
    return typeof cantidad === "number" && Number.isInteger(cantidad) && cantidad >= 0 && cantidad <= 99
      ? cantidad
      : null;
  };
  const leerMargen = (key: string) => {
    const margen = data[key];
    return typeof margen === "number" &&
      Number.isInteger(margen) &&
      margen >= 0 &&
      margen <= 495 &&
      margen % 5 === 0
      ? margen
      : null;
  };

  if ("camionesPesados" in data || "camionesMedios" in data || "margenManiobraM" in data) {
    const camionesPesados = leerCantidad("camionesPesados");
    const camionesMedios = leerCantidad("camionesMedios");
    const furgonetas = leerCantidad("furgonetas");
    const margenManiobraM = leerMargen("margenManiobraM");

    if (
      camionesPesados === null ||
      camionesMedios === null ||
      furgonetas === null ||
      margenManiobraM === null
    ) {
      return null;
    }

    return { camionesPesados, camionesMedios, furgonetas, margenManiobraM };
  }

  const camionesLuces = leerCantidad("camionesLuces");
  const camionesGripo = leerCantidad("camionesGripo");
  const grupoElectrogeno = leerCantidad("grupoElectrogeno");
  const trailersVestuario = leerCantidad("trailersVestuario");
  const furgonetas = leerCantidad("furgonetas");
  const espaciosSeguridad = leerCantidad("espaciosSeguridad");

  if (
    camionesLuces === null ||
    camionesGripo === null ||
    grupoElectrogeno === null ||
    trailersVestuario === null ||
    furgonetas === null ||
    espaciosSeguridad === null
  ) {
    return null;
  }

  return {
    camionesPesados: camionesLuces + camionesGripo + grupoElectrogeno,
    camionesMedios: trailersVestuario,
    furgonetas,
    margenManiobraM: espaciosSeguridad * 5,
  };
}

export function calcularMetrosLineales(desglose: DesgloseVehiculos): number {
  return (
    desglose.camionesPesados * 14 +
    desglose.camionesMedios * 10 +
    desglose.furgonetas * 6 +
    desglose.margenManiobraM
  );
}

export function crearDatosLogisticaIniciales(): DatosLogistica {
  return {
    desgloseVehiculos: { ...desgloseVehiculosVacio },
    tipoEstacionamiento: "Sin estacionamiento regulado",
    afeccionTrafico: "Sin afección",
    notasPermisos: "",
  };
}

export function normalizarDatosLogistica(value: {
  desgloseVehiculos: unknown;
  tipoEstacionamiento: unknown;
  afeccionTrafico: unknown;
  notasPermisos: unknown;
}): DatosLogistica {
  const iniciales = crearDatosLogisticaIniciales();

  return {
    desgloseVehiculos:
      parseDesgloseVehiculos(value.desgloseVehiculos) ?? iniciales.desgloseVehiculos,
    tipoEstacionamiento: opcionesEstacionamiento.includes(
      value.tipoEstacionamiento as (typeof opcionesEstacionamiento)[number],
    )
      ? (value.tipoEstacionamiento as DatosLogistica["tipoEstacionamiento"])
      : iniciales.tipoEstacionamiento,
    afeccionTrafico: opcionesAfeccionTrafico.includes(
      value.afeccionTrafico as (typeof opcionesAfeccionTrafico)[number],
    )
      ? (value.afeccionTrafico as DatosLogistica["afeccionTrafico"])
      : iniciales.afeccionTrafico,
    notasPermisos: typeof value.notasPermisos === "string" ? value.notasPermisos : "",
  };
}

export function validarDatosLogistica(value: unknown): DatosLogistica | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const data = value as Record<string, unknown>;
  const desgloseVehiculos = parseDesgloseVehiculos(data.desgloseVehiculos);
  const tipoEstacionamiento = data.tipoEstacionamiento;
  const afeccionTrafico = data.afeccionTrafico;
  const notasPermisos = data.notasPermisos;

  if (
    !desgloseVehiculos ||
    (tipoEstacionamiento !== null &&
      !opcionesEstacionamiento.includes(tipoEstacionamiento as (typeof opcionesEstacionamiento)[number])) ||
    (afeccionTrafico !== null &&
      !opcionesAfeccionTrafico.includes(afeccionTrafico as (typeof opcionesAfeccionTrafico)[number])) ||
    typeof notasPermisos !== "string" ||
    notasPermisos.length > 4000
  ) {
    return null;
  }

  return {
    desgloseVehiculos,
    tipoEstacionamiento: tipoEstacionamiento as DatosLogistica["tipoEstacionamiento"],
    afeccionTrafico: afeccionTrafico as DatosLogistica["afeccionTrafico"],
    notasPermisos: notasPermisos.trim(),
  };
}
