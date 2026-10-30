// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/xp-bar.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import XpBar from '../../vendor/8bitcn/components/ui/8bit/xp-bar';

export default function Demo() {
  return (
    <>
      <div className="md:min-w-[300px] min-w-[200px] flex flex-col gap-8">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Default XP bar</p>
          <div className="flex justify-between text-sm mb-2 retro">
            <span>XP</span>
            <span>65%</span>
          </div>
          <XpBar value={65} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Retro XP bar</p>
          <div className="flex justify-between text-sm mb-2 retro">
            <span>XP</span>
            <span>45%</span>
          </div>
          <XpBar value={45} variant="retro" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Level Up! (100%)</p>
          <div className="flex justify-between text-sm mb-2 retro">
            <span>XP</span>
            <span>100%</span>
          </div>
          <XpBar value={100} />
        </div>
      </div>
    </>
  );
}
