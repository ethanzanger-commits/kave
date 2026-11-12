export const cityOf = (p) => (p?.city || (p?.neighborhood || "").split(",").pop() || "").trim();
