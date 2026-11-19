import SubmitButton from "@/app/SubmitButton";
import BookForm from "./BookForm";
import LinkedInButton from "./LinkedInButton";
import ThankShare from "./ThankShare";
import { schedule, respond, confirmCoffee, saveFeedback } from "./coffeeActions";
import { sendThanks, hideThanks } from "./actions";
import { fmt, gcal, nowIL } from "@/lib/fmt";
import { coffeeState, STATE_LABEL } from "@/lib/coffee";
// Everything a person can do about one coffee, in one place (used by /matches and /coffee/[id]).
// The status line always says whose move it is. Private feedback is read only for the signed-in author.
export default function CoffeePanel({ m, me, name, mine, oCity, confs = [], fb = null, thanks = [], near = [], pins = {}, host }) {
  const st = coffeeState(m), first = (name || "them").split(" ")[0], my = confs.find((c) => c.userId === me), theirs = confs.find((c) => c.userId !== me);
  const book = (cta, open) => <BookForm id={m.id} cafes={near} schedule={schedule} hood={mine?.neighborhood} center={pins.center} pins={pins.pins} min={nowIL()} cta={cta} />;
  const hdr = (txt, cls = "") => <p className={"status " + cls}><b>{STATE_LABEL[st]}</b>{txt ? ` · ${txt}` : ""}</p>;
  const legacy = m.met === true && confs.length === 0;
  return (
    <section className="coffee-panel" aria-label="Coffee status">
      {st === "no_plan" && <>{hdr("your move: pick a time and place", "todo")}{book("Propose this time")}</>}
      {st === "proposed" && (m.proposedBy === me ? <>
        {hdr(`waiting for ${first} to confirm ${fmt(m.when)} at ${m.place}`)}
        <form action={respond}><input type="hidden" name="id" value={m.id} /><SubmitButton name="a" value="cancel">Withdraw proposal</SubmitButton></form>
        <details><summary>Change my proposal</summary>{book("Send new proposal")}</details></> : <>
        {hdr(`${first} suggested ${fmt(m.when)} at ${m.place}. Your move.`, "todo")}
        <form action={respond} className="row"><input type="hidden" name="id" value={m.id} /><SubmitButton name="a" value="accept" className="primary">Accept this time</SubmitButton><SubmitButton name="a" value="cancel">Decline</SubmitButton></form>
        <details><summary>Suggest another time instead</summary>{book("Send my suggestion")}</details></>)}
      {st === "scheduled" && <>
        {hdr(`${fmt(m.when)} at ${m.place}`, "ok")}
        <p><a href={`/card/${m.id}`}>Coffee card</a>{" · "}<a href={`/coffee/${m.id}`}>Cheat sheet</a>{gcal(m) && <>{" · "}<a href={gcal(m)}>Add to calendar</a></>}{" · "}
          <a href={"https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(m.place + " " + (mine?.neighborhood || ""))} target="_blank" rel="noopener noreferrer">Directions</a>{" · "}
          <a href={`https://wa.me/?text=${encodeURIComponent("Coffee booked on kave https://" + host + "/card/" + m.id)}`}>WhatsApp</a>{" · "}
          <LinkedInButton text={"Coffee booked on Kave, meeting someone new from outside my network: https://" + host + "/card/" + m.id}>LinkedIn</LinkedInButton></p>
        <details><summary>Reschedule</summary>{book("Propose new time")}</details>
        <form action={respond}><input type="hidden" name="id" value={m.id} /><SubmitButton name="a" value="cancel">Cancel this coffee</SubmitButton></form></>}
      {st === "awaiting_confirmation" && <>
        {!my ? <>{hdr(`did your coffee with ${first} happen? Your move.`, "todo")}
          <form action={confirmCoffee} className="row"><input type="hidden" name="id" value={m.id} /><SubmitButton name="met" value="yes" className="primary">Yes, we met</SubmitButton><SubmitButton name="met" value="no">It didn't happen</SubmitButton></form>
          <p><small>It counts as completed once you both confirm.</small></p></>
          : hdr(`you said ${my.outcome === "met" ? "it happened" : "it didn't happen"}. Waiting for ${first} to confirm.${theirs ? "" : ""}`)}</>}
      {st === "completed" && <>
        {hdr(legacy ? "marked as met" : "you both confirmed", "ok")}
        {thanks.filter((x) => x.fromId !== me).map((x) => <div key={x.fromId}><p className="why">{x.text}</p>{x.isPublic && !x.hidden && <form action={hideThanks}><input type="hidden" name="id" value={m.id} /><SubmitButton>Hide from my profile</SubmitButton></form>}</div>)}
        {!thanks.some((x) => x.fromId === me) && <form action={sendThanks}><input type="hidden" name="id" value={m.id} /><input name="text" maxLength={140} placeholder={`Say thanks to ${first} in one line`} required /><label style={{ display: "flex", gap: ".5rem", alignItems: "center", fontWeight: 400 }}><input type="checkbox" name="public" style={{ width: "auto", minHeight: 0, margin: 0 }} />Also show it on their profile</label><SubmitButton>Send thanks</SubmitButton></form>}
        {fb ? <p className="why">Your private feedback is saved. Only you can see it.</p> : <form action={saveFeedback}><input type="hidden" name="id" value={m.id} /><p><b>Quick private feedback</b><br /><small>Only you see this. {first} never does.</small></p>
          <label>Would you meet {first} again?<select name="again" required defaultValue=""><option value="" disabled>Choose</option><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option></select></label>
          <label>Rating (optional)<select name="rating" defaultValue=""><option value="">Skip</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label>Private note (optional)<textarea name="note" maxLength={500} rows={2} /></label><SubmitButton>Save feedback</SubmitButton></form>}
        {mine?.refCode && <ThankShare first={first} city={oCity} code={mine.refCode} />}</>}
      {st === "did_not_happen" && hdr("recorded as not happening")}
    </section>
  );
}
