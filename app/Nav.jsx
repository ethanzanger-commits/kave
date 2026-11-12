export default function Nav() {
  return (
    <nav aria-label="Main">
      <a className="brand" href="/discover">kave</a>
      <div className="links"><a href="/discover">Discover</a><a href="/around">People</a><a href="/matches">Coffees</a><a href="/profile">Profile</a></div>
      <details className="more"><summary>More</summary><div><a href="/saved">Saved</a><a href="/circles">Circles</a><a href="/leaderboard">Leaders</a><a href="/invite">Invite</a><a href="/how-to">How it works</a><a href="/contact">Contact</a></div></details>
    </nav>
  );
}
