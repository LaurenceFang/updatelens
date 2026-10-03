import type { CSSProperties } from "react";
const shapes = {
  arrow: "M4 12h16M14 6l6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  check: "m5 12 4 4L19 6",
  folder: "M3 7h6l2 2h10v11H3zM3 7V4h6l2 3",
  file: "M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6",
  pin: "m8 3 9 3-3 5 2 4-5-1-4 3-1-5-4-2 6-2zM8 16l-4 5",
  external: "M14 3h7v7M21 3l-11 11M10 3H3v18h18v-7",
  info: "M12 11v6M12 7h.01",
  close: "m6 6 12 12M6 18 18 6",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  search: "M20 20l-5-5",
  monitor: "M3 4h18v13H3zM8 21h8M12 17v4",
  refresh:
    "M20 6v5h-5M4 18v-5h5M5 8a8 8 0 0 1 13-3l2 3M19 16a8 8 0 0 1-13 3l-2-3",
} as const;
export default function Icon({
  name,
  size = 18,
  style,
}: {
  name: keyof typeof shapes;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {name === "info" ? (
        <circle cx="12" cy="12" r="9" />
      ) : name === "search" ? (
        <circle cx="10.5" cy="10.5" r="6.5" />
      ) : null}
      <path d={shapes[name]} />
    </svg>
  );
}
