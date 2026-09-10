/** The year is read at render so the notice never goes stale on its own. */
export function Copyright() {
  return <span>&copy; {new Date().getFullYear()} Emotive Impact</span>;
}
