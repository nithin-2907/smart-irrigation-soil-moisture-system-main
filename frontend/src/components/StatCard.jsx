const StatCard = ({ title, value, unit, icon, color }) => {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "24px",
        width: "240px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
        borderLeft: `6px solid ${color}`,
        transition:"0.25s",
        cursor:"pointer"
      }}

      onMouseEnter={(e)=> e.currentTarget.style.transform="translateY(-8px)"}
      onMouseLeave={(e)=> e.currentTarget.style.transform="translateY(0px)"}
    >
      <div style={{color:"#6b7280"}}>
        {icon} {title}
      </div>

      <h2 style={{marginTop:"10px"}}>
        {value ?? "--"} {unit}
      </h2>
    </div>
  );
};

export default StatCard;