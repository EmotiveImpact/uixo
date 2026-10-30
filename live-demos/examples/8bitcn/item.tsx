// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/item.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Button } from '../../vendor/8bitcn/components/ui/8bit/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '../../vendor/8bitcn/components/ui/8bit/item';

export default function Demo() {
  return (
    <>
      <ItemGroup>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Sword &bull; 300$</ItemTitle>
            <ItemDescription>The demonic sword</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="outline" size="sm">
              Buy
            </Button>
          </ItemActions>
        </Item>
        <ItemSeparator />
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Shield &bull; 250$</ItemTitle>
            <ItemDescription>The divine shield</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="outline" size="sm">
              Buy
            </Button>
          </ItemActions>
        </Item>
        <ItemSeparator />
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Bow &bull; 280$</ItemTitle>
            <ItemDescription>The bow of precision</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="outline" size="sm">
              Buy
            </Button>
          </ItemActions>
        </Item>
      </ItemGroup>
    </>
  );
}
