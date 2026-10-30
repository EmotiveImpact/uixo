// 8bitcn's profile card is shown on its Profile Creator page (components/profile-creator.tsx),
// which renders the unchanged ProfileCard with the values the creator opens with: no name
// yet, the /avatar.jpg avatar, the "warrior" badge and no description or social links.
// The creator keeps those values in the URL through nuqs; this file passes the same defaults.
import ProfileCard from '../../vendor/8bitcn/components/profile-card';

export default function Demo() {
  return (
    <ProfileCard
      avatarUrl="/avatar.jpg"
      badgeTitle="warrior"
      description=""
      isRetroAvatar={false}
      name=""
      safeGithubUrl=""
      safeXUrl=""
    />
  );
}
