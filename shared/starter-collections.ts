import type { CollectionInput } from './intelligence';

/** Release editorial selections, not installation bundles or accessibility certifications.
 * Persistent registries receive these as drafts unless an operator explicitly publishes them.
 */
export const STARTER_COLLECTIONS: CollectionInput[] = [
  {
    slug: 'dashboard-foundations',
    title: 'Dashboard foundations',
    description:
      'Navigation, data and focused actions. A practical starting set for a considered workspace.',
    items: [
      {
        kind: 'asset',
        targetId: 'shadcn/sidebar',
        note: 'Give the workspace a consistent navigation structure and a collapsible state.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/table',
        note: 'Start with readable structured data before introducing sorting or bulk actions.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/card',
        note: 'Group related information without turning every item into a separate panel.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/command',
        note: 'Offer a keyboard-led route to frequent actions alongside visible navigation.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/dialog',
        note: 'Use a focused overlay for a short task, not an entire secondary application.',
      },
    ],
  },
  {
    slug: 'considered-forms',
    title: 'Considered forms',
    description:
      'Clear labels, purposeful inputs and useful feedback. The basics of a less frustrating form.',
    items: [
      {
        kind: 'asset',
        targetId: 'shadcn/label',
        note: 'Keep each field explicitly named; a disappearing placeholder is not a label.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/input',
        note: 'Match the input type, autocomplete and supporting text to the information requested.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/select',
        note: 'Choose from a constrained set when free text would create unnecessary ambiguity.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/checkbox',
        note: 'Make independent choices explicit and do not preselect consent.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/alert',
        note: 'Explain what happened and what the person can do next. Test error announcements in context.',
      },
    ],
  },
  {
    slug: 'navigation-essentials',
    title: 'Navigation essentials',
    description:
      'Help people find their place and their next step. Choose the pattern that fits the task.',
    items: [
      {
        kind: 'asset',
        targetId: 'shadcn/navigation-menu',
        note: 'Organise primary destinations without forcing every route into the first level.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/breadcrumb',
        note: 'Show the position within a hierarchy, not a substitute for browser history.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/tabs',
        note: 'Switch between related views while keeping the surrounding context stable.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/pagination',
        note: 'Keep result position explicit and preserve it when returning from a detail view.',
      },
    ],
  },
  {
    slug: 'feedback-and-status',
    title: 'Feedback and status',
    description:
      'Loading, progress and outcomes. Give every state a clear meaning without adding noise.',
    items: [
      {
        kind: 'asset',
        targetId: 'shadcn/alert',
        note: 'Reserve prominent messages for information that deserves immediate attention.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/badge',
        note: 'Pair concise status labels with meaning that does not depend on colour alone.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/progress',
        note: 'Show measured progress only when there is a meaningful total.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/skeleton',
        note: 'Indicate the shape of loading content while preserving space and avoiding layout jumps.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/spinner',
        note: 'Use for a short indeterminate operation and provide a useful error or timeout state.',
      },
    ],
  },
  {
    slug: 'overlays-and-dialogues',
    title: 'Overlays and dialogues',
    description:
      'Focused tasks and supporting context. Select the smallest interruption the work needs.',
    items: [
      {
        kind: 'asset',
        targetId: 'shadcn/dialog',
        note: 'Keep a modal task short and verify focus returns to the trigger when it closes.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/alert-dialog',
        note: 'Ask for confirmation when an action has consequences, not for every ordinary click.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/drawer',
        note: 'Explore a touch-oriented presentation and verify it with the actual content and keyboard.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/sheet',
        note: 'Bring supporting detail alongside the current workspace without losing the parent task.',
      },
      {
        kind: 'asset',
        targetId: 'shadcn/tooltip',
        note: 'Use for supplementary help; essential instructions must remain available without hovering.',
      },
    ],
  },
  {
    slug: 'purposeful-motion',
    title: 'Purposeful motion',
    description:
      'Small moments of movement for hierarchy, transitions and feedback. Use less, and make it count.',
    items: [
      {
        kind: 'asset',
        targetId: 'magic-ui/blur-fade',
        note: 'Introduce content gently, with a reduced-motion alternative in the finished interface.',
      },
      {
        kind: 'asset',
        targetId: 'magic-ui/animated-list',
        note: 'Help people follow additions to a changing list without hiding the reading order.',
      },
      {
        kind: 'asset',
        targetId: 'magic-ui/text-animate',
        note: 'Animate short emphasis rather than body copy and keep text readable throughout.',
      },
      {
        kind: 'asset',
        targetId: 'magic-ui/number-ticker',
        note: 'Make numerical changes legible, while ensuring assistive technology receives a stable value.',
      },
      {
        kind: 'asset',
        targetId: 'magic-ui/border-beam',
        note: 'Use one deliberate point of emphasis instead of competing animated borders.',
      },
    ],
  },
];
