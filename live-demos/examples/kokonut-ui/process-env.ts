// Next inlines process.env values into client code at build time; kokonutui.com's build
// sets NEXT_PUBLIC_SITE_URL to its own host. The browser frame has no process object.
const scope = globalThis as { process?: { env: Record<string, string | undefined> } };
scope.process ??= { env: {} };
scope.process.env.NEXT_PUBLIC_SITE_URL ??= 'kokonutui.com';
