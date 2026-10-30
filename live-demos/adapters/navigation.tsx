// next/navigation inside a sandboxed demo: there is no Next router, and provider
// navigation stays inert, like the Link adapter.
const router = {
  push() {},
  replace() {},
  refresh() {},
  back() {},
  forward() {},
  prefetch() {},
};
export function useRouter() {
  return router;
}
export function usePathname() {
  return '/';
}
export function useSearchParams() {
  return new URLSearchParams();
}
export function useParams() {
  return {};
}
