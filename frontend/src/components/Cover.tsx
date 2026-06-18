import type { CSSProperties } from "react";
import type { MediaRead } from "../types";
import { coverBg, COVER_FG } from "../lib/ui";

interface Props {
  title?: string | null;
  artist?: string | null;
  catalog?: string | null;
  cover?: MediaRead | null;
  size?: number | string; // ширина; высота = ширине (aspect 1:1)
  radius?: number;
}

// Обложка: реальный скан (если есть) или собственный плейсхолдер-«конверт»
// (цветное поле + намёк на диск + кант + типографика). Логотип «Мелодии» не
// используется — это собственная графика.
export function Cover({ title, artist, catalog, cover, size = "100%", radius = 0 }: Props) {
  const bg = coverBg(`${artist ?? ""}|${title ?? ""}`);
  const box: CSSProperties = {
    width: size,
    aspectRatio: "1",
    position: "relative",
    overflow: "hidden",
    boxShadow: "var(--shadow)",
    borderRadius: radius,
    background: bg,
    containerType: "inline-size", // чтобы cqw в типографике считался от ширины обложки
  };

  if (cover?.url) {
    return (
      <div style={box}>
        <img
          src={cover.url}
          alt={title ?? ""}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  return (
    <div style={box}>
      {/* кант */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          top: "8%",
          borderTop: `1px solid ${COVER_FG}`,
          opacity: 0.35,
        }}
      />
      {/* намёк на диск */}
      <div
        style={{
          position: "absolute",
          right: "-30%",
          top: "50%",
          transform: "translateY(-50%)",
          width: "80%",
          height: "80%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at center, transparent 25%, rgba(0,0,0,.16) 26%, rgba(0,0,0,.16) 28%, transparent 29%)",
        }}
      />
      {catalog && (
        <div
          style={{
            position: "absolute",
            left: "8%",
            top: "12%",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(8px, 2.2cqw, 11px)",
            letterSpacing: ".04em",
            color: COVER_FG,
          }}
        >
          {catalog}
        </div>
      )}
      <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "9%" }}>
        {artist && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(7px, 1.8cqw, 9px)",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              opacity: 0.85,
              marginBottom: 5,
              color: COVER_FG,
            }}
          >
            {artist}
          </div>
        )}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(14px, 5cqw, 22px)",
            lineHeight: 0.98,
            color: COVER_FG,
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
}
