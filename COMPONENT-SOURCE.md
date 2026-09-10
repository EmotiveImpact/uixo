# Sidebar source

The sidebar uses Be UI's Animated Sidebar directly (MIT), as requested.

Source: https://beui.dev/r/animated-sidebar
Documentation: https://beui.dev/components/motion/animated-sidebar

The following registry files are included verbatim under src/:

- components/motion/animated-sidebar.tsx
- components/motion/shared-layout-bg.tsx
- lib/ease.ts
- lib/utils.ts

UILIST composition lives in src/App.tsx and src/components/AppSidebar.tsx. It uses the supplied provider, sidebar, header, content, groups, menus, submenus, footer, trigger, rail and inset; only app content and theme tokens are customized.
