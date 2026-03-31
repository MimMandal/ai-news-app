export default function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Image placeholder */}
      <div
        className="skeleton"
        style={{ aspectRatio: "16/9", width: "100%" }}
      />
      {/* Content */}
      <div style={{ padding: "20px" }}>
        <div className="skeleton" style={{ height: "11px", width: "60px", marginBottom: "12px" }} />
        <div className="skeleton" style={{ height: "20px", width: "90%", marginBottom: "8px" }} />
        <div className="skeleton" style={{ height: "20px", width: "70%", marginBottom: "16px" }} />
        <div className="skeleton" style={{ height: "2px", width: "32px", marginBottom: "12px" }} />
        <div className="skeleton" style={{ height: "13px", width: "100%", marginBottom: "6px" }} />
        <div className="skeleton" style={{ height: "13px", width: "85%", marginBottom: "6px" }} />
        <div className="skeleton" style={{ height: "13px", width: "75%", marginBottom: "16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
          <div className="skeleton" style={{ height: "13px", width: "80px" }} />
          <div className="skeleton" style={{ height: "20px", width: "60px", borderRadius: "4px" }} />
        </div>
      </div>
    </div>
  );
}
