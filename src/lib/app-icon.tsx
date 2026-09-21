import { ImageResponse } from "next/og";

/** Icono: una chispa (la idea que se enciende) sobre brasa. */
export function renderAppIcon(size: number) {
  const mark = Math.round(size * 0.56);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #e0632a 0%, #c2410f 100%)",
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 100 100">
          <path d="M50 4 C54 33 67 46 96 50 C67 54 54 67 50 96 C46 67 33 54 4 50 C33 46 46 33 50 4 Z" fill="#fefbf8" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
