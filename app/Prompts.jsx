export default function Prompts({ p }) {
  const rows = [["What I'm working on", p.workingOn], ["What I can help with", p.canHelp], ["What I'd like to learn", p.lookingFor]].filter((r) => r[1]);
  if (!rows.length) return null;
  return <dl className="prompts">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}
