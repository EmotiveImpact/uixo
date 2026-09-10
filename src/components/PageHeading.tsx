import { X } from 'lucide-react';

type PageHeadingProps = {
  title: string;
  subtitle: string;
  canClear: boolean;
  onClear: () => void;
};

export function PageHeading({ title, subtitle, canClear, onClear }: PageHeadingProps) {
  return (
    <section className="heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {canClear && (
        <button className="clear" onClick={onClear}>
          Clear filters <X size={12} />
        </button>
      )}
    </section>
  );
}
