// Fotos de jugadores desde TheSportsDB (football-data.org no las ofrece).
// Estrategia en dos niveles: (1) el plantel de la selección en TSDB, (2) búsqueda
// por nombre para los que falten, filtrando por nacionalidad. Todo cacheado 24 h.
// Lo que igual no matchee cae a un avatar de iniciales en la UI.
// Free tier: key de prueba "123" (configurable con SPORTSDB_KEY).

const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "123"}`;

// Nombres de football-data que TheSportsDB escribe distinto
const TEAM_ALIASES: Record<string, string> = {
  Czechia: "Czech Republic",
  "United States": "USA",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Clave insensible al orden de los tokens ("In-beom Hwang" vs "Hwang In-beom")
function sortedKey(name: string): string {
  return normalize(name).split(" ").sort().join(" ");
}

async function tsdbFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface TsdbTeam {
  idTeam: string;
  strTeam: string;
  strSport: string;
  strLeague: string | null;
}

interface TsdbPlayer {
  strPlayer: string;
  strSport?: string;
  strNationality?: string | null;
  strCutout: string | null;
  strThumb: string | null;
}

// Nivel 1: fotos del plantel publicado en la página de la selección
async function fetchTeamPhotoMap(alias: string): Promise<Map<string, string>> {
  const search = await tsdbFetch<{ teams: TsdbTeam[] | null }>(
    `/searchteams.php?t=${encodeURIComponent(alias)}`,
  );
  const candidates = (search?.teams ?? []).filter((t) => t.strSport === "Soccer");
  // La selección adulta aparece en la liga "FIFA World Cup" (las juveniles no)
  const team =
    candidates.find(
      (t) => t.strLeague === "FIFA World Cup" && normalize(t.strTeam) === normalize(alias),
    ) ??
    candidates.find((t) => normalize(t.strTeam) === normalize(alias)) ??
    null;
  if (!team) return new Map();

  const detail = await tsdbFetch<{ player: TsdbPlayer[] | null }>(
    `/lookup_all_players.php?id=${team.idTeam}`,
  );
  const map = new Map<string, string>();
  for (const player of detail?.player ?? []) {
    const url = player.strCutout || player.strThumb;
    if (!url) continue;
    map.set(normalize(player.strPlayer), url);
    map.set(sortedKey(player.strPlayer), url);
  }
  return map;
}

// Nivel 2: búsqueda individual (muchos jugadores están bajo su club, no la selección)
async function searchPlayerPhoto(name: string, countryAlias: string): Promise<string | null> {
  const data = await tsdbFetch<{ player: TsdbPlayer[] | null }>(
    `/searchplayers.php?p=${encodeURIComponent(name)}`,
  );
  const candidates = (data?.player ?? []).filter((p) => p.strSport === "Soccer");
  const sameCountry = candidates.filter(
    (p) => p.strNationality && normalize(p.strNationality) === normalize(countryAlias),
  );
  const pick = (sameCountry.length > 0 ? sameCountry : candidates).find(
    (p) => p.strCutout || p.strThumb,
  );
  return pick ? pick.strCutout || pick.strThumb : null;
}

// Mapa nombre-original → URL de foto para una nómina completa
export async function fetchSquadPhotos(
  teamName: string,
  memberNames: string[],
): Promise<Map<string, string>> {
  const alias = TEAM_ALIASES[teamName] ?? teamName;
  const teamMap = await fetchTeamPhotoMap(alias);

  const photos = new Map<string, string>();
  const missing: string[] = [];
  for (const name of memberNames) {
    const url = teamMap.get(normalize(name)) ?? teamMap.get(sortedKey(name));
    if (url) photos.set(name, url);
    else missing.push(name);
  }

  // Las búsquedas fallidas no se cachean, así que se reintentan en visitas futuras
  const fallbacks = await Promise.allSettled(
    missing.map(async (name) => ({ name, url: await searchPlayerPhoto(name, alias) })),
  );
  for (const result of fallbacks) {
    if (result.status === "fulfilled" && result.value.url) {
      photos.set(result.value.name, result.value.url);
    }
  }
  return photos;
}

export function initials(playerName: string): string {
  const tokens = playerName.trim().split(/\s+/);
  const first = tokens[0]?.[0] ?? "";
  const last = tokens.length > 1 ? (tokens[tokens.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
