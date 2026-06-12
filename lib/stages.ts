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

// "GROUP_A" → "Grupo A"
export function groupLabel(group: string): string {
  return group.replace(/^GROUP_/, "Grupo ");
}
