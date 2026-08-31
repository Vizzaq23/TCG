import { ImageResponse } from "next/og";

export const alt = "One Piece TCG Shelf collection and storefront";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background:
          "radial-gradient(circle at 72% 24%, #3f2a12 0%, #15100b 26%, #07090d 68%)",
        color: "#f4f4f5",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          border: "1px solid #3f3f46",
          borderRadius: 30,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: "72px 82px",
          width: 1020,
        }}
      >
        <div
          style={{
            color: "#fbbf24",
            display: "flex",
            fontSize: 25,
            letterSpacing: 7,
            textTransform: "uppercase",
          }}
        >
          Collector platform · Secure storefront
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1.02,
          }}
        >
          One Piece TCG Shelf
        </div>
        <div
          style={{
            color: "#a1a1aa",
            display: "flex",
            fontSize: 32,
            lineHeight: 1.35,
          }}
        >
          Catalog, showcase, share, and shop the collection.
        </div>
      </div>
    </div>,
    size,
  );
}
