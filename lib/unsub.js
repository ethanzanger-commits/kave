import crypto from "crypto";
export const sig = (email) => crypto.createHmac("sha256", process.env.AUTH_SECRET || "").update(String(email).toLowerCase()).digest("hex").slice(0, 32);
