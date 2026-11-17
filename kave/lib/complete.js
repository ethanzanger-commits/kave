export const missing = (p, image) => [!image && "profile photo", !p?.city && "city", !p?.headline && "headline", !p?.about && "about me", !(p?.skills || []).length && "at least one skill", !p?.ageOk && "18+ confirmation"].filter(Boolean);

// A finished profile has none of the missing items above. Every count and list in the app uses this.
export const isFinished = (p, image) => missing(p, image).length === 0;
