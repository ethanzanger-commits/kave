// All email copy lives here. Edit the subject and body text freely.
// Body rules: blank line = new paragraph. A line like "SIGN IN TO KAVE: https://..." on its own becomes a button.
import { sendMail } from "@/lib/mail";
const first = (n) => String(n || "").trim().split(/\s+/)[0] || "there";
export const COPY = {
  signin: ({ url }) => ["Your Kave sign-in link", `Tap the button to sign in to Kave.\n\nSIGN IN TO KAVE: ${url}\n\nThis link works once and expires in 24 hours. If you didn't ask for it, you can safely ignore this email.`],
  welcome: ({ name, founding, base }) => [`You're in, ${first(name)}. Welcome to Kave`, `Hi ${first(name)},\n\nYour account is set up and your profile is live.${founding ? `\n\nYou're also KAVE FOUNDING 50 #${founding}. That badge is yours for good.` : ""}\n\nThe best next step is to meet someone.\n\nMEET PEOPLE: ${base}/discover\n\nKnow someone who'd be a great addition? Bring them along: ${base}/invite`],
  reminder1: ({ link }) => ["Your Kave profile is waiting", `You're one step away from joining Kave.\n\nComplete your profile and start discovering professionals worth meeting over coffee.\n\nCOMPLETE MY PROFILE: ${link}`],
  reminder2: ({ link }) => ["Your spot among the first 50", `The first 50 people to complete their Kave profiles receive Founding 50 recognition.\n\nYour profile isn't finished yet. Come claim your place.\n\nCOMPLETE MY PROFILE: ${link}`],
  reminder3: ({ link }) => ["Still up for coffee?", `Your Kave account is ready, but your profile isn't complete.\n\nThere are interesting people to meet and conversations to start. Finish setting up your profile and join the network.\n\nCOMPLETE MY PROFILE: ${link}`],
  weekly: ({ first: f, pick, headline, why, base, unsub }) => [`Your Kave pick this week: ${pick}`, `Hi ${f || "there"},\n\nThis week's pick is ${pick}${headline ? `, ${headline}` : ""}.\n\nWhy you two? ${why}\n\nSEE THEIR PROFILE: ${base}/discover\n\nPrefer fewer emails? Unsubscribe: ${unsub}`],
  coffeeRequest: ({ from, base }) => [`${from} would like to grab coffee`, `${from} would like to meet you for a coffee on Kave.\n\nSEE THE REQUEST: ${base}/matches\n\nAccept to pick a time and place, or decline if it's not a fit. No pressure either way.`],
  match: ({ other, base }) => [`It's a match: you and ${other}`, `You and ${other} both said yes to coffee.\n\nPICK A TIME AND PLACE: ${base}/matches\n\nA quick hello first can make the meeting easier. You can message each other from the same page.`],
  coffeeProposed: ({ from, when, place, base }) => [`${from} suggested a coffee`, `${from} suggested ${when} at ${place}.\n\nACCEPT OR CHANGE THE PLAN: ${base}/matches\n\nIf the time doesn't work, suggest another one from the same page.`],
  coffeeConfirmed: ({ from, base }) => [`Coffee confirmed with ${from}`, `${from} confirmed your coffee. It's booked.\n\nWe'll remind you the day before and send a short cheat sheet on the morning.\n\nSEE THE DETAILS: ${base}/matches`],
  coffeeCancelled: ({ from, base }) => [`${from} cancelled your coffee`, `${from} had to cancel your coffee. These things happen.\n\nPICK A NEW TIME: ${base}/matches`],
  newMessage: ({ from, text, base }) => [`New message from ${from}`, `${from} wrote:\n\n"${text}"\n\nREPLY ON KAVE: ${base}/matches`],
  intro: ({ by, other, base }) => [`${by} thinks you should meet ${other}`, `${by} thinks you'd get on with ${other}.\n\nSAY YES OR PASS: ${base}/matches\n\nIt's a double opt-in. You only connect if you both say yes.`],
  dayBefore: ({ other, when, place, base }) => [`Coffee tomorrow with ${other}`, `A quick reminder: you're meeting ${other} tomorrow, ${when}, at ${place}.\n\nNeed to change it? Do it early so they know.\n\nMANAGE MY COFFEE: ${base}/matches`],
  morningOf: ({ other }) => [`Your Kave coffee today: ${other}`, `Coffee day. Here's a short cheat sheet to make it easy.`],
};
export const copy = (key, vars) => COPY[key](vars);
export const sendTemplate = (to, key, vars) => sendMail(to, ...copy(key, vars));
