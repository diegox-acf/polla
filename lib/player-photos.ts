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
  strTeam?: string | null;
  strHeight?: string | null;
  strCutout: string | null;
  strThumb: string | null;
}

// Datos de carta por jugador (lo que se pueda conseguir; todo opcional)
export interface PlayerInfo {
  photo: string | null;
  club: string | null;
  height: string | null;
}

// "1.85 m", "1,85", "6ft 1in (1.85 m)" → "1.85 m"
function cleanHeight(height: string | null | undefined): string | null {
  if (!height) return null;
  const match = height.match(/(\d[.,]\d{2})/);
  return match ? `${match[1].replace(",", ".")} m` : null;
}

// Nivel 1: el plantel publicado en la página de la selección
async function fetchTeamRoster(alias: string): Promise<Map<string, TsdbPlayer>> {
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
  const map = new Map<string, TsdbPlayer>();
  for (const player of detail?.player ?? []) {
    map.set(normalize(player.strPlayer), player);
    map.set(sortedKey(player.strPlayer), player);
  }
  return map;
}

// Nivel 2: búsqueda individual (muchos jugadores están bajo su club, no la selección)
async function searchPlayer(name: string, countryAlias: string): Promise<TsdbPlayer | null> {
  const data = await tsdbFetch<{ player: TsdbPlayer[] | null }>(
    `/searchplayers.php?p=${encodeURIComponent(name)}`,
  );
  const candidates = (data?.player ?? []).filter((p) => p.strSport === "Soccer");
  const sameCountry = candidates.filter(
    (p) => p.strNationality && normalize(p.strNationality) === normalize(countryAlias),
  );
  const pool = sameCountry.length > 0 ? sameCountry : candidates;
  return pool.find((p) => p.strCutout || p.strThumb) ?? pool[0] ?? null;
}

function toInfo(player: TsdbPlayer, alias: string): PlayerInfo {
  const club = player.strTeam ?? null;
  return {
    photo: player.strCutout || player.strThumb || null,
    // En la página de la selección strTeam es el propio país: no es un club
    club: club && normalize(club) !== normalize(alias) ? club : null,
    height: cleanHeight(player.strHeight),
  };
}

// Mapa nombre-original → datos de carta para una nómina completa
export async function fetchSquadInfo(
  teamName: string,
  memberNames: string[],
): Promise<Map<string, PlayerInfo>> {
  const alias = TEAM_ALIASES[teamName] ?? teamName;
  const roster = await fetchTeamRoster(alias);

  const info = new Map<string, PlayerInfo>();
  const missing: string[] = [];
  for (const name of memberNames) {
    const player = roster.get(normalize(name)) ?? roster.get(sortedKey(name));
    if (player && (player.strCutout || player.strThumb)) {
      info.set(name, toInfo(player, alias));
    } else {
      missing.push(name);
    }
  }

  // Las búsquedas fallidas no se cachean, así que se reintentan en visitas futuras
  const fallbacks = await Promise.allSettled(
    missing.map(async (name) => ({ name, player: await searchPlayer(name, alias) })),
  );
  for (const result of fallbacks) {
    if (result.status === "fulfilled" && result.value.player) {
      info.set(result.value.name, toInfo(result.value.player, alias));
    }
  }
  return info;
}

export function initials(playerName: string): string {
  const tokens = playerName.trim().split(/\s+/);
  const first = tokens[0]?.[0] ?? "";
  const last = tokens.length > 1 ? (tokens[tokens.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
