// Only allows a plain path inside the site, never another address, so the "return to" link can't be abused.
export const safeNext = (v) => (typeof v === "string" && v.length < 200 && /^\/(?!\/)[A-Za-z0-9\-_/]*(\?[A-Za-z0-9\-_=&%.]*)?$/.test(v) ? v : null);
