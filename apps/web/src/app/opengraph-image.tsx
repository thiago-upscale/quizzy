import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(135deg, #10233f 0%, #0f766e 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "#f59e0b",
              color: "#10233f",
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            Q
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Quizzy</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 980,
            }}
          >
            O quiz ao vivo com a cara da sua empresa.
          </div>
          <div style={{ fontSize: 30, opacity: 0.85, maxWidth: 900 }}>
            PIN no telão, plateia no celular, ranking em tempo real e
            relatório pronto no fim.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "12px 28px",
              borderRadius: 999,
              background: "#f59e0b",
              color: "#10233f",
            }}
          >
            Treinamentos
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 28px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
            }}
          >
            Convenções
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 28px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
            }}
          >
            Ativações internas
          </div>
        </div>
      </div>
    ),
    size,
  );
}
