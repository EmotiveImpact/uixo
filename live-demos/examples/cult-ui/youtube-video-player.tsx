// cult-ui's docs demo is a long page of examples whose first player sits below the fold
// of a card. This shows that first example on its own: the unchanged YouTubePlayer with
// the same video and custom thumbnail the demo leads with.
import { YouTubePlayer } from '../../vendor/cult-ui/registry/default/ui/youtube-video-player';

export function YouTubeVideoPlayerExample() {
  return (
    <div className="w-[420px] max-w-full">
      <YouTubePlayer
        videoId="jNQXAC9IVRw"
        title="Me at the zoo - First YouTube Video"
        customThumbnail="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=450&fit=crop&crop=center"
      />
    </div>
  );
}
