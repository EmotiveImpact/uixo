// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/enemy-health-display.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import EnemyHealthDisplay from '../../vendor/8bitcn/components/ui/8bit/enemy-health-display';

export default function Demo() {
  return (
    <>
      <div className="w-full max-w-md space-y-6">
        <EnemyHealthDisplay
          enemyName="Fire Dragon"
          level={25}
          currentHealth={850}
          maxHealth={1000}
          healthBarVariant="retro"
          healthBarColor="bg-red-500"
          enemyNameColor="text-red-500"
        />
        <EnemyHealthDisplay
          enemyName="Goblin Warrior"
          level={5}
          currentHealth={45}
          maxHealth={100}
          healthBarVariant="retro"
          healthBarColor="bg-orange-500"
          enemyNameColor="text-green-500"
        />
      </div>
    </>
  );
}
