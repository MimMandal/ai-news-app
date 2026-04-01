export default function SkeletonCard() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 220px)",
        background: "rgba(255, 252, 247, 0.86)",
        border: "1px solid var(--line)",
        borderRadius: "32px",
        overflow: "hidden",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div className="skeleton" style={{ aspectRatio: "16 / 9", width: "100%", borderRadius: 0 }} />
      <div style={{ padding: "20px 18px 24px" }}>
        <div className="skeleton" style={{ height: "11px", width: "116px", marginBottom: "18px" }} />
        <div className="skeleton" style={{ height: "34px", width: "92%", marginBottom: "10px" }} />
        <div className="skeleton" style={{ height: "34px", width: "76%", marginBottom: "16px" }} />
        <div className="skeleton" style={{ height: "48px", width: "100%", marginBottom: "18px" }} />
        <div className="skeleton" style={{ height: "16px", width: "100%", marginBottom: "10px" }} />
        <div className="skeleton" style={{ height: "16px", width: "97%", marginBottom: "10px" }} />
        <div className="skeleton" style={{ height: "16px", width: "84%", marginBottom: "10px" }} />
        <div className="skeleton" style={{ height: "16px", width: "93%", marginBottom: "10px" }} />
        <div className="skeleton" style={{ height: "16px", width: "76%", marginBottom: "24px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div className="skeleton" style={{ height: "36px", width: "132px", borderRadius: "999px" }} />
          <div className="skeleton" style={{ height: "36px", width: "92px", borderRadius: "999px" }} />
        </div>
      </div>
    </div>
  );
}
