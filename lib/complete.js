export const missing = (p, image) => [!image && "profile photo", !p?.city && "city", !p?.headline && "headline", !p?.about && "about me", !(p?.skills || []).length && "at least one skill", !p?.ageOk && "18+ confirmation"].filter(Boolean);

// A live profile: a real member (not demo) whose profile is complete, with a photo. Emails only recommend and go to live members.
export const isLive = (p, image) => !!p && !p.isDemo && !String(p.userId || "").startsWith("demo-") && missing(p, image).length === 0;
