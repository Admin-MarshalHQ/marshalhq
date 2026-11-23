import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Setru. Location marshal hiring for UK film and TV.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const mark = await readFile(join(process.cwd(), "public/brand/setru-mark.svg"), "base64");
  const source = `data:image/svg+xml;base64,${mark}`;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "60px 72px", borderTop: "10px solid #ff786a", background: "#fffcf9", color: "#152238" }}>
      <div style={{ display: "flex", flexDirection: "column", width: 655 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 46, fontWeight: 700 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders directly to PNG. */}
          <img src={source} width={52} height={52} alt="" />
          Setru
        </div>
        <div style={{ marginTop: 48, display: "flex", color: "#9f342b", fontSize: 21, fontWeight: 700, letterSpacing: 2 }}>
          FOR UK FILM AND TELEVISION
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 14, fontSize: 76, lineHeight: 1.04, letterSpacing: -4, fontWeight: 700 }}>
          <span>Location marshal</span>
          <span>hiring,</span>
          <span style={{ color: "#9f342b" }}>made clear.</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 330, height: 330, borderRadius: 28, background: "#f9e0d5", border: "2px solid #efcfc0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders directly to PNG. */}
        <img src={source} width={174} height={174} alt="" />
      </div>
    </div>,
    size,
  );
}
