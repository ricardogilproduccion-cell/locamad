export function puedeGestionarLocalizaciones(rol?: string | null) {
  return rol === "PRODUCCION" || rol === "LOCALIZACIONES";
}

export function nombreRol(rol?: string | null) {
  switch (rol) {
    case "PRODUCCION":
      return "Producción";
    case "LOCALIZACIONES":
      return "Localizaciones";
    case "INVITADO":
      return "Invitado · solo consulta";
    default:
      return "Solo consulta";
  }
}