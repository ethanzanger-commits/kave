import { FLAIR } from "@/lib/leaders";
export default function Flair({ cats = [], isNew }) {
  return <>{isNew && <span className="chip" style={{ background: "#ffd0da" }}>New</span>}{cats.map((c) => <span className="chip" key={c} style={{ background: "#ffe3a3" }}><img className="badgeimg" src={FLAIR[c].img} alt="" width="16" height="16" /> {FLAIR[c].label}</span>)}</>;
}
