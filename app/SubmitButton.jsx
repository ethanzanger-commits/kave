"use client";
import { useFormStatus } from "react-dom";
// Drop-in for <button> inside a <form action={...}>. Shows a spinner and "Working…" on the clicked button and locks the form while it runs.
export default function SubmitButton({ children, pendingText = "Working…", ...rest }) {
  const { pending, data } = useFormStatus();
  const clicked = pending && (rest.name ? data?.get(rest.name) === rest.value : true);
  return (
    <button {...rest} disabled={pending || rest.disabled} aria-busy={clicked ? "true" : undefined}>
      {clicked ? pendingText : children}
    </button>
  );
}
