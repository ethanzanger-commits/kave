"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
const CafeMap = dynamic(() => import("./CafeMap"), { ssr: false });
export default function BookForm({ id, cafes, schedule, hood, center, pins }) {
  const [place, setPlace] = useState("");
  const [map, setMap] = useState(false);
  return (
    <form action={schedule}>
      <input type="hidden" name="id" value={id} />
      <p><b>Pick a spot (somewhere public) and a time</b></p>
      <p>{cafes.map((c) => <button type="button" key={c} className="chip cafe" onClick={() => setPlace(c)}>{c}</button>)}</p>
      <p><a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("cafes near " + (hood || ""))} target="_blank" rel="noopener noreferrer">Browse cafés on Google Maps</a></p>
      {center && pins?.length > 0 && (map ? <CafeMap center={center} pins={pins} onPick={setPlace} /> : <button type="button" onClick={() => setMap(true)}>Show cafés on a map</button>)}
      <input name="place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Which café?" required />
      {place && <p><a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place + " " + (hood || ""))} target="_blank" rel="noopener noreferrer">Check it on Google Maps</a></p>}
      <input name="when" type="datetime-local" required />
      <p></p><button className="primary">Book coffee </button>
    </form>
  );
}
