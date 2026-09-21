import type { DayCell } from "@/lib/engine";
import { formatDayShort } from "@/lib/day";

function cellClass(cell: DayCell, minWords: number) {
  switch (cell.state) {
    case "cumplido":
      if (cell.words >= minWords * 3) return "bg-tint";
      if (cell.words >= minWords * 2) return "bg-tint/70";
      return "bg-tint/45";
    case "fallado":
      return "bg-bad-soft ring-[1.5px] ring-inset ring-bad";
    case "comodin":
      return "bg-rare/60";
    case "hoy":
      return "bg-surface-2 ring-2 ring-inset ring-tint";
    case "pendiente":
      return "bg-surface-2";
    default:
      return "bg-surface-2/50";
  }
}

const STATE_LABEL: Record<DayCell["state"], string> = {
  cumplido: "cumplido",
  fallado: "fallado",
  comodin: "comodín",
  hoy: "hoy, pendiente",
  pendiente: "sin evaluar",
  fuera: "",
};

/** Calendario de cuadritos: columnas = semanas (lunes arriba), filas = días. */
export function Heatmap({ cells, minWords }: { cells: DayCell[]; minWords: number }) {
  const weeks = Math.ceil(cells.length / 7);
  return (
    <figure>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridTemplateRows: "repeat(7, auto)", gridAutoFlow: "column" }}
      >
        {cells.map((cell) => (
          <div
            key={cell.day}
            title={cell.state === "fuera" ? undefined : `${formatDayShort(cell.day)}: ${STATE_LABEL[cell.state]}${cell.words ? `, ${cell.words} palabras` : ""}`}
            className={`aspect-square rounded-[4px] ${cellClass(cell, minWords)}`}
          />
        ))}
      </div>
      <figcaption className="caption mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-tint/45" />
          <span className="size-2.5 rounded-[3px] bg-tint/70" />
          <span className="size-2.5 rounded-[3px] bg-tint" />
          Cumplido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-bad-soft ring-[1.5px] ring-inset ring-bad" />
          Fallado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-rare/60" />
          Comodín
        </span>
      </figcaption>
    </figure>
  );
}
