import { ArrowUpRight } from 'lucide-react';
import { Thumbnail } from './Thumbnail';
import { editorPick, resources } from '../data';

type EditorPickProps = { onOpen: (id: string) => void; href: string };

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * One listing, with the reason in the editor's own voice. The note is the point — if it
 * reads like the card description, this band is not earning its space.
 */
export function EditorPick({ onOpen, href }: EditorPickProps) {
  const resource = resources.find((entry) => entry.id === editorPick.resourceId);
  if (!resource) return null;

  const open = (event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    onOpen(resource.id);
  };

  return (
    <aside className="pick" aria-label="Editor's pick">
      <div className="pick-body">
        <p className="pick-eyebrow">
          <span className="pick-dot" aria-hidden="true" />
          Editor&rsquo;s pick
        </p>
        <p className="pick-note">{editorPick.note}</p>
      </div>

      <a className="pick-attrib" href={href} onClick={open}>
        <span className="pick-mark">
          <Thumbnail id={resource.id} alt="" sizes="34px" eager onError={() => undefined} />
        </span>
        <span className="pick-who">
          <strong>
            {resource.name} <ArrowUpRight size={14} />
          </strong>
          <span>
            {resource.category} · {resource.pricing} · Picked {formatDate(editorPick.pickedOn)}
          </span>
        </span>
      </a>
    </aside>
  );
}
