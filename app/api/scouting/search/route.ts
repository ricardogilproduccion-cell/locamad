interface NominatimPlace {
  osm_type: string;
  osm_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

let ultimaConsultaNominatim = 0;

function esRegistroDeCadenas(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function inferirTipoEspacio(query: string) {
  const termino = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

  if (/vintage|anos? 7[08]|setenta|ochenta/.test(termino)) return "Interior vintage";
  if (/brutal|institucional/.test(termino)) return "Edificio institucional";
  if (/nave|industrial|fabrica|almacen/.test(termino)) return "Nave industrial";
  if (/hospital|clinica|comisaria|policia/.test(termino)) return "Hospital / comisaría";
  if (/vivienda|atico|piso|casa/.test(termino)) return "Vivienda";
  if (/comercial|farmacia|tienda|local/.test(termino)) return "Local comercial";
  return "Exterior";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const zone = searchParams.get("zona")?.trim() || "Madrid";

  if (!query || query.length > 120 || zone.length > 100) {
    return Response.json(
      { error: "Indica una búsqueda de hasta 120 caracteres y una zona de hasta 100 caracteres." },
      { status: 400 },
    );
  }

  const ahora = Date.now();
  if (ahora - ultimaConsultaNominatim < 1000) {
    return Response.json(
      { error: "Espera un momento antes de volver a buscar en internet." },
      { status: 429, headers: { "Retry-After": "1" } },
    );
  }
  ultimaConsultaNominatim = ahora;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", `${query}, ${zone}`);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  url.searchParams.set("countrycodes", "es");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LocaMad/0.1.0 (location scouting search)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error("OpenStreetMap search failed with status", response.status);
      return Response.json({ error: "No se pudo completar la búsqueda en internet." }, { status: 502 });
    }

    const places: unknown = await response.json();
    if (!Array.isArray(places)) {
      console.error("OpenStreetMap search returned an invalid response.");
      return Response.json({ error: "El servicio de búsqueda devolvió una respuesta no válida." }, { status: 502 });
    }

    const results = places
      .filter(
        (place): place is NominatimPlace =>
          typeof place === "object" &&
          place !== null &&
          typeof place.osm_type === "string" &&
          typeof place.osm_id === "number" &&
          typeof place.display_name === "string" &&
          typeof place.lat === "string" &&
          typeof place.lon === "string" &&
          (!("name" in place) || typeof place.name === "string") &&
          (!("address" in place) || esRegistroDeCadenas(place.address)),
      )
      .map((place) => ({
        id: `${place.osm_type}-${place.osm_id}`,
        nombre: place.name?.trim() || place.display_name.split(",")[0].trim(),
        direccion: place.display_name,
        lat: Number(place.lat),
        lng: Number(place.lon),
        municipio:
          place.address?.city ??
          place.address?.town ??
          place.address?.village ??
          place.address?.municipality ??
          zone,
        distritoBarrio:
          place.address?.city_district ??
          place.address?.suburb ??
          place.address?.borough ??
          place.address?.neighbourhood ??
          place.address?.quarter ??
          null,
        tipoEspacio: inferirTipoEspacio(query),
      }))
      .filter(
        (place) =>
          place.nombre.length > 0 &&
          Number.isFinite(place.lat) &&
          Number.isFinite(place.lng) &&
          place.lat >= -90 &&
          place.lat <= 90 &&
          place.lng >= -180 &&
          place.lng <= 180,
      );

    return Response.json({ results });
  } catch (error) {
    console.error("Could not reach OpenStreetMap search.", error);
    return Response.json({ error: "No se pudo conectar con el servicio de búsqueda en internet." }, { status: 502 });
  }
}
