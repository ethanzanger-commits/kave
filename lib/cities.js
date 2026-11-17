export const CITIES = ["Jerusalem", "Tel Aviv-Yafo", "Haifa", "Beer Sheva", "Rishon LeZion", "Petah Tikva", "Netanya", "Ashdod", "Ramat Gan", "Herzliya", "Ra'anana", "Kfar Saba", "Modi'in", "Beit Shemesh", "Rehovot", "Holon", "Bat Yam", "Hod HaSharon", "Givatayim", "Nazareth", "Tiberias", "Eilat", "Other in Israel"];
const ALIAS = { "tel aviv": "Tel Aviv-Yafo", yafo: "Tel Aviv-Yafo", jaffa: "Tel Aviv-Yafo", beersheba: "Beer Sheva", "be er sheva": "Beer Sheva", raanana: "Ra'anana", modiin: "Modi'in", "petach tikva": "Petah Tikva", "petah tiqva": "Petah Tikva", "kfar sava": "Kfar Saba", herzlia: "Herzliya", "rishon le zion": "Rishon LeZion", "rishon lezion": "Rishon LeZion" };
const norm = (s) => String(s || "").toLowerCase().replace(/['’`\-]/g, " ").replace(/\s+/g, " ").trim();
// Maps free text (for example a reverse-geocoded address) to one of the preset cities, or null.
export function matchCity(text) {
  const t = " " + norm(text) + " ";
  for (const c of CITIES.slice(0, -1)) if (t.includes(" " + norm(c) + " ")) return c;
  for (const [k, v] of Object.entries(ALIAS)) if (t.includes(" " + k + " ")) return v;
  return null;
}
