export default function Prompts({ p }) {
  const rows = [["Working on", p.workingOn], ["Can help with", p.canHelp], ["Wants to learn", p.lookingFor]].filter((r) => r[1]);
  if (!rows.length) return null;
  return <dl className="prompts">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}
