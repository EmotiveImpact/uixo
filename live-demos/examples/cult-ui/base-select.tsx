// cult-ui ships Base Select without a docs page or demo. This renders the unchanged
// component the way its shadcn-style API is used: a trigger, a value and grouped items.
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../../vendor/cult-ui/registry/default/ui/base-select';

const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blueberry', value: 'blueberry' },
];
const vegetables = [
  { label: 'Carrot', value: 'carrot' },
  { label: 'Leek', value: 'leek' },
];

export function BaseSelectExample() {
  return (
    <div className="flex h-[300px] w-[260px] flex-col items-center justify-start pt-4">
      <Select defaultValue="banana" defaultOpen modal={false}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            {fruits.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Vegetables</SelectLabel>
            {vegetables.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
