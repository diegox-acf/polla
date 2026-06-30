// Marcador de un partido: los goles a los 90' y, si se definió por penales,
// el resultado de la tanda entre paréntesis (p. ej. "1 (3) – 1 (4)").
// Los penales no cuentan para el puntaje; son solo informativos (REGLAS.md §1).
export function MatchScore({
  home90,
  away90,
  homePenalties,
  awayPenalties,
  className,
}: {
  home90: number;
  away90: number;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  className?: string;
}) {
  const pens = homePenalties != null && awayPenalties != null;
  return (
    <span className={className}>
      {home90}
      {pens && <Pens n={homePenalties} />} – {away90}
      {pens && <Pens n={awayPenalties} />}
    </span>
  );
}

function Pens({ n }: { n: number }) {
  return (
    <span className="align-super text-[0.6em] font-semibold text-zinc-500 dark:text-zinc-400">
      ({n})
    </span>
  );
}
