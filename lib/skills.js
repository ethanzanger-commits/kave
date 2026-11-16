// A skill vocabulary for marketing, partnerships, growth, product, sales and tech roles. Finds skills anywhere in a CV, not only under a "Skills" heading.
const T = [
  ["Partnerships", ["partnerships", "partnership", "strategic partnerships", "channel partnerships", "alliances", "partner marketing", "partner management"]],
  ["Business Development", ["business development", "biz dev", "bizdev"]],
  ["Go-to-Market", ["go-to-market", "go to market", "gtm"]],
  ["Growth Marketing", ["growth marketing", "growth hacking", "growth strategy", "user acquisition", "demand generation", "demand gen", "lead generation", "lead gen"]],
  ["Performance Marketing", ["performance marketing", "performance media", "ppc", "paid acquisition"]],
  ["Paid Media", ["paid media", "paid social", "media buying", "media planning", "media strategy", "programmatic", "display advertising"]],
  ["Meta Ads", ["meta ads", "facebook ads", "instagram ads", "meta advertising", "facebook advertising"]],
  ["TikTok Ads", ["tiktok ads", "tiktok advertising"]],
  ["Google Ads", ["google ads", "adwords", "google advertising", "sem"]],
  ["Amazon DSP", ["amazon dsp", "amazon ads", "amazon advertising"]],
  ["The Trade Desk", ["the trade desk", "trade desk"]],
  ["Retail Media", ["retail media", "commerce media"]],
  ["Social Media", ["social media", "community management", "social strategy"]],
  ["Influencer Marketing", ["influencer marketing", "creator partnerships", "creator marketing"]],
  ["Content Marketing", ["content marketing", "content strategy", "content creation", "copywriting", "content management"]],
  ["SEO", ["seo", "search engine optimization", "search engine optimisation"]],
  ["Email Marketing", ["email marketing", "crm marketing", "lifecycle marketing", "marketing automation"]],
  ["Product Marketing", ["product marketing", "pmm", "product positioning", "messaging and positioning"]],
  ["Brand Strategy", ["brand strategy", "branding", "brand management", "brand marketing", "brand building"]],
  ["Marketing Strategy", ["marketing strategy", "marketing planning", "integrated marketing", "campaign strategy"]],
  ["Campaign Management", ["campaign management", "campaign optimization", "campaign optimisation", "campaign execution"]],
  ["Analytics", ["analytics", "data analysis", "marketing analytics", "web analytics", "google analytics", "ga4", "measurement", "attribution"]],
  ["A/B Testing", ["a/b testing", "ab testing", "experimentation", "conversion rate optimization", "cro"]],
  ["Account Management", ["account management", "client management", "client services", "stakeholder management", "client relationships"]],
  ["Sales", ["sales", "enterprise sales", "b2b sales", "account executive", "sales strategy", "selling"]],
  ["Customer Success", ["customer success", "customer retention", "customer experience"]],
  ["B2B SaaS", ["b2b saas", "saas", "b2b marketing", "b2b"]],
  ["AdTech", ["adtech", "ad tech", "advertising technology", "dsp", "ssp"]],
  ["MarTech", ["martech", "marketing technology", "marketing tech"]],
  ["Fintech", ["fintech", "financial technology", "payments"]],
  ["E-commerce", ["e-commerce", "ecommerce", "commerce marketing", "shopify", "dtc", "d2c"]],
  ["Product Management", ["product management", "product manager", "roadmapping", "product strategy"]],
  ["Project Management", ["project management", "program management", "agile", "scrum", "pmo"]],
  ["Team Leadership", ["team leadership", "people management", "team management", "leading teams", "mentoring", "managed a team", "led a team"]],
  ["Budget Management", ["budget management", "p&l", "budgeting", "media budgets", "budget planning"]],
  ["Negotiation", ["negotiation", "negotiations", "contract negotiation", "deal structuring", "deal making"]],
  ["Public Speaking", ["public speaking", "presentations", "storytelling"]],
  ["Fundraising", ["fundraising", "investor relations", "venture capital", "vc"]],
  ["Operations", ["operations", "operations management", "process improvement", "supply chain"]],
  ["HR & Recruiting", ["recruiting", "recruitment", "talent acquisition", "human resources"]],
  ["Design", ["ux design", "ui design", "product design", "graphic design", "figma", "adobe creative suite", "photoshop"]],
  ["Video Production", ["video production", "video editing", "video marketing", "premiere pro"]],
  ["SQL", ["sql", "bigquery", "snowflake"]],
  ["Python", ["python", "pandas"]],
  ["JavaScript", ["javascript", "typescript", "react", "node.js", "nodejs"]],
  ["Data Visualization", ["data visualization", "tableau", "looker", "power bi", "looker studio", "data studio"]],
  ["Excel", ["excel", "google sheets", "spreadsheets"]],
  ["Salesforce", ["salesforce"]],
  ["HubSpot", ["hubspot"]],
  ["Machine Learning", ["machine learning", "artificial intelligence", "generative ai", "llm", "prompt engineering"]],
  ["Cybersecurity", ["cybersecurity", "cyber security", "infosec"]],
  ["Hebrew", ["hebrew"]],
  ["Event Marketing", ["event marketing", "events", "conferences", "trade shows", "event management"]],
  ["PR & Communications", ["public relations", "communications", "media relations", "press"]],
  ["Market Research", ["market research", "consumer insights", "competitive analysis", "competitor analysis"]],
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
const ALIAS = new Map(), RX = [];
for (const [name, list] of T) { for (const a of list) ALIAS.set(a, name); ALIAS.set(name.toLowerCase(), name); RX.push([name, new RegExp(`(?<![\\p{L}\\d])(?:${[name.toLowerCase(), ...list].map(esc).join("|")})(?![\\p{L}\\d])`, "giu")]); }
const title = (s) => s.replace(/\s+/g, " ").trim().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + (s === s.toUpperCase() && s.length <= 5 ? b : b.toUpperCase()));
// Cleans one listed skill: maps known aliases to the canonical name, drops sentences and junk.
export function cleanSkill(raw) {
  const t = String(raw || "").replace(/^[-–*•·\d.)\s]+/, "").replace(/[.;:,]+$/, "").trim();
  if (t.length < 2 || t.length > 32 || t.split(/\s+/).length > 4 || /https?:|@|\b(19|20)\d{2}\b|\.\s/.test(t)) return "";
  return ALIAS.get(t.toLowerCase()) || title(t);
}
export function mergeSkills(...lists) {
  const seen = new Set(), out = [];
  for (const l of lists) for (const x of l || []) { const c = cleanSkill(x); if (c && !seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); out.push(c); } }
  return out;
}
// Skills found anywhere in the text, most mentioned first. Skills the person listed themselves rank higher.
export function extractSkills(text, listed = [], max = 20) {
  const score = new Map(), body = String(text || "");
  for (const [name, rx] of RX) { const n = (body.match(rx) || []).length; if (n) score.set(name, Math.min(n, 5)); }
  const own = mergeSkills(listed);
  own.forEach((s, i) => score.set(s, (score.get(s) || 0) + 6 - Math.min(i, 3)));
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s).slice(0, max);
}
