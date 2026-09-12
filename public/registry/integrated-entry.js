// All registry links resolve through the shared UIXO application.
const target = new URL('/browse/assets', location.origin);
target.search = location.search;
location.replace(target.href);
