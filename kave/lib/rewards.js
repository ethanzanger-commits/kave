export const TIERS = [
  { n: 1, name: "Early Bird", slug: "early-bird", perk: "A badge on your profile" },
  { n: 3, name: "Insider", slug: "insider", perk: "Unlimited coffee requests, and names in Who's around" },
  { n: 5, name: "Connector", slug: "connector", perk: "You're shown first to people nearby" },
  { n: 10, name: "Founding Host", slug: "founding-host", perk: "A Founding Host badge" },
];
export const tierFor = (n) => [...TIERS].reverse().find((t) => n >= t.n) || null;
