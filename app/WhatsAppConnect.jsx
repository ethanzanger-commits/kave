import SubmitButton from "@/app/SubmitButton";
import { shareWhatsApp, skipWhatsApp, stopWhatsApp } from "./whatsappActions";
// Optional, mutual. Nothing here ever contains a phone number: the button goes through /api/whatsapp/[id].
export default function WhatsAppConnect({ id, name, wa }) {
  if (!wa) return null;
  const first = (name || "them").split(" ")[0], hid = <input type="hidden" name="id" value={id} />;
  const share = (cta) => <form action={shareWhatsApp}>{hid}
    {!wa.hasPhone && <label>Your WhatsApp number<input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="050 123 4567 or +1 212 555 0100" required /></label>}
    <p><small>{first} only sees your number if they also agree. You can stop sharing any time.</small></p>
    <div className="row"><SubmitButton className="primary">{cta}</SubmitButton></div></form>;
  return (
    <section className="card" id="whatsapp" aria-label="WhatsApp">
      <h2>Connect on WhatsApp <small>(optional)</small></h2>
      {wa.mutual ? <>
        <p className="status ok"><b>You both agreed</b></p>
        <p><a className="primary" href={`/api/whatsapp/${id}`} style={{ display: "block", textAlign: "center", padding: "1rem", textDecoration: "none" }}>Continue on WhatsApp</a></p>
        <p><small>Opens WhatsApp with a short hello ready to send. You choose whether to send it.</small></p></>
      : wa.mine === "shared" ? <>
        <p className="status"><b>Waiting</b> · for {first} to agree. Your number stays private until they do.</p></>
      : wa.theirs === "shared" ? <>
        <p className="status todo"><b>{first} would like to connect on WhatsApp.</b> Your move.</p>
        {share(`Share my number with ${first}`)}
        <form action={skipWhatsApp}>{hid}<SubmitButton>Skip for now</SubmitButton></form></>
      : <>
        <p>Prefer to arrange it by message? Share numbers only if you both want to.</p>
        <details><summary>{wa.mine === "withdrawn" ? "Share my number again" : "Connect on WhatsApp"}</summary>{share("Share my number")}
          <form action={skipWhatsApp}>{hid}<SubmitButton>Skip for now</SubmitButton></form></details></>}
      {wa.mine === "shared" && <details><summary>Stop sharing</summary>
        <form action={stopWhatsApp}>{hid}<label style={{ display: "flex", gap: ".5rem", alignItems: "center", fontWeight: 400 }}><input type="checkbox" name="erase" style={{ width: "auto", minHeight: 0, margin: 0 }} />Also delete my saved number</label>
          <SubmitButton>Stop sharing</SubmitButton></form></details>}
    </section>
  );
}
