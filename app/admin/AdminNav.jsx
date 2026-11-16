export default function AdminNav() {
  return (
    <nav aria-label="Admin">
      <a className="brand" href="/admin">Admin</a>
      <div className="links"><a href="/admin/weekly">Weekly</a><a href="/admin/insights">Insights</a><a href="/admin/people">People</a><a href="/admin/experiments">Experiments</a></div>
      <details className="more"><summary>More</summary><div><a href="/admin/growth">Growth</a><a href="/admin/analytics">Analytics</a><a href="/admin/circles">Circles</a><a href="/discover">App</a></div></details>
    </nav>
  );
}
