export default function AdminNav() {
  return <nav aria-label="Admin"><a className="brand" href="/admin">Admin</a><div className="links"><a href="/admin/weekly">Weekly</a><a href="/admin/people">People</a><a href="/admin/experiments">Tests</a><a href="/admin/growth">Growth</a></div><details className="more"><summary>More</summary><div><a href="/admin/analytics">Analytics</a><a href="/admin/circles">Circles</a><a href="/discover">Back to app</a></div></details></nav>;
}
