// Etiquetas en español para los valores de stage/group de football-data.org

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Fase de grupos",
  LAST_32: "Dieciseisavos de final",
  ROUND_OF_32: "Dieciseisavos de final",
  LAST_16: "Octavos de final",
  QUARTER_FINALS: "Cuartos de final",
  SEMI_FINALS: "Semifinales",
  THIRD_PLACE: "Tercer puesto",
  FINAL: "Final",
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

// Slugs para la URL del filtro del fixture (?fase=...)
const STAGE_SLUGS: Record<string, string> = {
  LAST_32: "dieciseisavos",
  ROUND_OF_32: "dieciseisavos",
  LAST_16: "octavos",
  QUARTER_FINALS: "cuartos",
  SEMI_FINALS: "semifinales",
  THIRD_PLACE: "tercer-puesto",
  FINAL: "final",
};

export function stageSlug(stage: string): string {
  return STAGE_SLUGS[stage] ?? stage.toLowerCase().replace(/_/g, "-");
}

// Etiquetas cortas para los chips del filtro
const STAGE_SHORT_LABELS: Record<string, string> = {
  LAST_32: "16avos",
  ROUND_OF_32: "16avos",
  LAST_16: "Octavos",
  QUARTER_FINALS: "Cuartos",
  SEMI_FINALS: "Semis",
  THIRD_PLACE: "3er puesto",
  FINAL: "Final",
};

export function stageShortLabel(stage: string): string {
  return STAGE_SHORT_LABELS[stage] ?? stageLabel(stage);
}

// "GROUP_A" → "Grupo A"
export function groupLabel(group: string): string {
  return group.replace(/^GROUP_/, "Grupo ");
}
