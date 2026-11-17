export default function Milestone({ stats }) {
  const pct = Math.min(100, Math.round((stats.count / stats.target) * 100));
  return (
    <div className="card">
      <b>{stats.count} {stats.count === 1 ? "professional has" : "professionals have"} joined Kave.</b>
      <p style={{ margin: ".2rem 0" }}>Help us reach {stats.target}. {stats.remaining} to go.</p>
      <div className="bar"><div style={{ width: pct + "%" }} /></div>
    </div>
  );
}
