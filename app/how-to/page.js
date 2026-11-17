import Nav from "../Nav";
import { TIERS } from "@/lib/rewards";
export const metadata = { title: "How kave works" };
const Step = ({ n, title, children }) => <div className="card"><h2>{n}. {title}</h2>{children}</div>;
export default function HowTo() {
  return (
    <main>
      <Nav />
      <h1>How kave works</h1>
      <p className="lead">Five steps from sign-up to a real coffee.</p>
      <Step n={1} title="Build your profile"><p>Add a profile photo, your city, a headline, a short About me and at least one skill. The fastest way: upload your CV (PDF, Word, or your LinkedIn data ZIP) and kave fills most of it in. Check it over, then save.</p></Step>
      <Step n={2} title="Meet people"><p>On <b>Discover</b>, you see one person at a time with a line on why you two might click. Tap <b>Coffee?</b> if you'd like to meet, or <b>Maybe later</b>. <b>Who's around</b> shows everyone nearby so you can pick for yourself. Tap <b>I'm free for coffee this week</b> to show up higher.</p></Step>
      <Step n={3} title="Match and say hi"><p>When you both say Coffee?, it's a match. Find it under <b>My coffees</b>, send a one-line hello, and use the conversation topics if you're stuck.</p></Step>
      <Step n={4} title="Book it"><p>Pick a café (the map shows nearby ones) and a time. The other person gets an email and can accept, decline, or suggest another time. Once it's confirmed you get a map, a calendar link and a cheat sheet. On the morning of your coffee we email you the cheat sheet again.</p></Step>
      <Step n={5} title="After the coffee"><p>Tell us if it happened and send a one-line thanks. If you met someone great, introduce them to another person you've met.</p></Step>
      <div className="card">
        <h2>Invite friends, earn badges</h2>
        {TIERS.map((t) => <div key={t.n} style={{ display: "flex", gap: ".8rem", alignItems: "center", margin: ".5rem 0" }}><img className="badgeimg" src={`/badges/${t.slug}.svg`} alt="" width="48" height="48" /><p style={{ margin: 0 }}><b>{t.name}</b> · {t.n} {t.n === 1 ? "friend" : "friends"}: {t.perk}</p></div>)}
        <p>Friends who join with your link start with 6 free coffee requests instead of 3. Get your link on the <a href="/invite">Invite</a> page.</p>
      </div>
      <div className="card"><h2>Monthly leaderboards</h2>
        <p>Two boards reset every month: <b>most converted invites</b> (friends who join through your link and finish their profile) and <b>most coffee dates</b> (coffees confirmed as having happened). See the top 5 on <a href="/leaderboard">Leaders</a>.</p>
        <p>The winner of each board gets special flair on their profile and <b>priority in search</b> for the whole next month. New members also show first for their first week under <b>Who's new</b>. If there's a tie, we pick one winner.</p></div>
      <div className="card"><h2>Staying safe</h2><p>Meet in a public place and tell a friend where you're going. Use <b>Block</b> or <b>Report</b> on any card. You can delete your account and data any time from your Profile page.</p></div>
      <div className="card"><h2>Questions</h2>
        <p><b>Why can't I see anyone?</b> Finish your profile first, including the photo.</p>
        <p><b>Stop the weekly email?</b> Untick it on your Profile page.</p>
        <p><b>Wrong details from my CV?</b> Edit anything before you save.</p></div>
    </main>
  );
}
