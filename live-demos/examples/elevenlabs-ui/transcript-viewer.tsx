// UIXO glue: the provider's transcript-viewer-demo fetches its word timings from the
// provider site's own /sounds folder. A sandboxed preview frame has an opaque origin, so
// that cross-origin fetch is not dependable. The provider's alignment file is vendored
// unchanged, and this frame answers that one request with it before rendering the
// unchanged demo. Every other request, including the audio itself (an <audio> element,
// resolved against the provider's origin), goes out as normal.
import alignment from '../../vendor/elevenlabs-ui/public/sounds/transcript-viewer/transcript-viewer-alignment.json';
import TranscriptViewerDemo from '../../vendor/elevenlabs-ui/registry/elevenlabs-ui/examples/transcript-viewer-demo';

const ALIGNMENT_PATH = '/sounds/transcript-viewer/transcript-viewer-alignment.json';
const networkFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (new URL(href, document.baseURI).pathname === ALIGNMENT_PATH)
    return Promise.resolve(
      new Response(JSON.stringify(alignment), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  return networkFetch(input, init);
};

export default TranscriptViewerDemo;
