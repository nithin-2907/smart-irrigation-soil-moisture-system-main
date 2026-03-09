const StatCard = ({ title, value, unit, icon, color }) => {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderRadius: "16px",
        padding: "24px",
        width: "240px",
        boxShadow: "var(--shadow-card)",
        borderLeft: `6px solid ${color}`,
        transition: "0.25s",
        cursor: "pointer"
      }}

      onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-8px)"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
    >
      <div style={{ color: "var(--text-secondary)" }}>
        {icon} {title}
      </div>

      <h2 style={{ marginTop: "10px" }}>
        {value ?? "--"} {unit}
      </h2>
    </div>
  );
};

export default StatCard;