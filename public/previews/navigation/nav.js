(() => {
  const LISTS_KEY = 'uixo-lists';
  const DEFAULT_LIST_ID = 'favourites';

  const resources = [
    {
      id: 'orbkit',
      name: 'Orbkit',
      description: 'Drop-in WebGL orbs and shader backgrounds for React, with controls for colour, distortion and motion.',
      category: 'Components',
      subcategory: 'Animation',
      tags: ['Shaders', 'React'],
      pricing: 'Free',
      creator: 'zzzzshawn',
      formats: ['React'],
      aliases: ['orb kit', 'shader', 'webgl', 'three.js', 'sphere', 'animated background'],
      featured: true,
      url: 'https://orbkit.zzzzshawn.cloud/',
    },
    {
      id: 'grainient',
      name: 'Grainient',
      description: 'Grainy gradient backgrounds in high-resolution PNG, grouped into collections you can browse by mood and colour.',
      category: 'Backgrounds',
      subcategory: 'Gradients',
      tags: ['Textures', 'Gradients'],
      pricing: 'Freemium',
      creator: 'Basit',
      formats: ['PNG'],
      aliases: ['grain', 'noise', 'mesh gradient', 'wallpaper', 'texture', 'hero background'],
      featured: true,
      url: 'https://grainient.supply/collections',
    },
    {
      id: 'shadcn',
      name: 'shadcn/ui',
      description: 'Accessible React components you copy into your own codebase and own outright — no dependency to upgrade, no styles to fight.',
      category: 'UI libraries',
      subcategory: 'React',
      tags: ['React', 'Components'],
      pricing: 'Free',
      creator: 'shadcn',
      formats: ['React'],
      aliases: ['shad cn', 'shadcn ui', 'radix', 'tailwind components', 'headless ui'],
      featured: true,
      url: 'https://ui.shadcn.com/',
    },
    {
      id: 'reactbits',
      name: 'React Bits',
      description: 'Animated React components — text effects, backgrounds and transitions — with the source shown beside every live demo.',
      category: 'Components',
      subcategory: 'Animation',
      tags: ['React', 'Motion'],
      pricing: 'Freemium',
      creator: 'David Haz',
      formats: ['React'],
      aliases: ['react bits', 'animation', 'motion', 'text effects', 'scroll effects'],
      featured: true,
      url: 'https://reactbits.dev/',
    },
    {
      id: 'lucide',
      name: 'Lucide',
      description: 'The community fork of Feather: a large, consistent outline icon set available as raw SVG and as a tree-shakeable React package.',
      category: 'Icons',
      subcategory: 'Outline',
      tags: ['SVG', 'Open source'],
      pricing: 'Free',
      creator: 'Lucide',
      formats: ['SVG', 'React'],
      aliases: ['feather icons', 'icon set', 'svg icons', 'icon pack', 'stroke icons'],
      featured: true,
      url: 'https://lucide.dev/',
    },
    {
      id: 'built',
      name: 'Built by Designers',
      description: 'A directory of tools and sites assembled by working designers, biased toward things people actually ship rather than bookmark.',
      category: 'Inspiration',
      subcategory: 'Directories',
      tags: ['Websites', 'Tools'],
      pricing: 'Free',
      creator: 'shedsgns & Phil Hedayatnia',
      formats: ['Web'],
      aliases: ['built by designers', 'curated directory', 'design resources', 'tool list'],
      featured: false,
      url: 'https://builtbydesigners.com/',
    },
    {
      id: 'ui8',
      name: 'UI8',
      description: 'A marketplace of UI kits, templates, mockups and fonts from independent designers, with a rotating set of free downloads.',
      category: 'Marketplace',
      subcategory: 'Design assets',
      tags: ['Templates', 'UI kits', 'Mockups', 'Fonts'],
      pricing: 'Freemium',
      creator: 'UI8',
      formats: ['Figma', 'Framer', 'Webflow', 'SVG'],
      aliases: ['ui 8', 'marketplace', 'ui kits', 'templates', 'mockups', 'fonts', 'figma files'],
      featured: true,
      url: 'https://ui8.net/',
    },
  ];

  const collections = [
    {
      slug: 'saas-landing-page',
      name: 'Build a SaaS landing page',
      tagline: 'Everything for a marketing page that ships this week.',
      description: 'A hero that moves, components you can restyle, an icon set that stays consistent at small sizes, and a background that carries the whole page.',
      resourceIds: ['grainient', 'shadcn', 'orbkit', 'lucide'],
    },
    {
      slug: 'first-portfolio-free',
      name: 'Free resources for a first portfolio',
      tagline: 'Nothing here asks for a card.',
      description: 'Everything in this collection has a genuinely usable free tier.',
      resourceIds: ['shadcn', 'lucide', 'orbkit', 'built'],
    },
    {
      slug: 'motion-and-depth',
      name: 'Motion and depth',
      tagline: 'For when flat has stopped being interesting.',
      description: 'Shaders, animated components and grainy gradients — material without a 3D pipeline.',
      resourceIds: ['orbkit', 'reactbits', 'grainient'],
    },
    {
      slug: 'design-system-starters',
      name: 'Design system starters',
      tagline: 'The bones, not the paint.',
      description: 'Libraries and icon sets you can adopt, restyle and keep.',
      resourceIds: ['shadcn', 'lucide', 'ui8'],
    },
  ];

  const categories = [
    { name: 'Components', icon: 'layers', subs: ['Animation', 'Buttons', 'Navigation'] },
    { name: 'UI libraries', icon: 'box', subs: ['React', 'Vue', 'CSS'] },
    { name: 'Templates', icon: 'panels', subs: ['Coded', 'Framer', 'Webflow'] },
    { name: 'Icons', icon: 'shapes', subs: ['Outline', 'Solid', '3D'] },
    { name: 'Backgrounds', icon: 'image', subs: ['Gradients', 'Textures', 'Shaders'] },
    { name: 'Illustrations', icon: 'pen', subs: ['Vector', '3D', 'Hand-drawn'] },
    { name: 'Fonts', icon: 'type', subs: ['Sans serif', 'Serif', 'Display'] },
    { name: 'Mockups', icon: 'device', subs: ['Devices', 'Branding', 'Packaging'] },
    { name: 'Inspiration', icon: 'bulb', subs: ['Directories', 'Landing pages', 'Portfolios'] },
    { name: 'Marketplace', icon: 'store', subs: ['Design assets', 'UI kits'] },
  ];

  const why = {
    orbkit: 'We reach for this when a hero needs a living material, not a video loop.',
    grainient: 'Atmosphere without standing up a 3D pipeline. The grain is the point.',
    shadcn: 'You own the code. That is the whole argument.',
    reactbits: 'Motion you can read, because the source sits next to the demo.',
    lucide: 'Holds up at 16px. That is rarer than it sounds.',
    built: 'A directory with taste, which is the only kind worth listing here.',
    ui8: 'When the job is a kit, not a component you will rewrite anyway.',
  };

  function byId(id) {
    return resources.find((item) => item.id === id);
  }

  function collectionBySlug(slug) {
    return collections.find((item) => item.slug === slug);
  }

  function categoryCount(name) {
    return resources.filter((item) => item.category === name).length;
  }

  function populatedSubs(name) {
    const entry = categories.find((item) => item.name === name);
    if (!entry) return [];
    return entry.subs.filter((sub) => resources.some((item) => item.category === name && item.subcategory === sub));
  }

  function blurb(item) {
    const stop = item.description.indexOf('.');
    return stop > 24 ? item.description.slice(0, stop + 1) : item.description;
  }

  function haystack(item) {
    return [item.name, item.description, item.category, item.subcategory, item.creator, item.pricing, ...(item.tags || []), ...(item.aliases || [])]
      .join(' ')
      .toLowerCase();
  }

  function filter({ q = '', category = null, sub = null, pricing = 'All', featured = null, ids = null } = {}) {
    const query = q.trim().toLowerCase();
    return resources.filter((item) => {
      if (ids && !ids.includes(item.id)) return false;
      if (category && item.category !== category) return false;
      if (sub && item.subcategory !== sub) return false;
      if (pricing && pricing !== 'All' && item.pricing !== pricing) return false;
      if (featured === true && !item.featured) return false;
      if (query && !haystack(item).includes(query)) return false;
      return true;
    });
  }

  function searchHits(q) {
    const query = q.trim().toLowerCase();
    if (!query) {
      return {
        categories: categories.filter((item) => categoryCount(item.name) > 0).slice(0, 6),
        collections: collections.slice(0, 3),
        resources: resources.filter((item) => item.featured).slice(0, 4),
      };
    }
    return {
      categories: categories.filter((item) => item.name.toLowerCase().includes(query) || item.subs.some((sub) => sub.toLowerCase().includes(query))),
      collections: collections.filter((item) => `${item.name} ${item.tagline} ${item.description}`.toLowerCase().includes(query)),
      resources: filter({ q: query }),
    };
  }

  function card(item, extra = '') {
    return `<article class="card">
      <button type="button" class="thumb" data-open="${item.id}"><img src="/assets/${item.id}.png" alt=""></button>
      <h3>${item.name}</h3>
      <p>${blurb(item)}</p>
      <p class="meta">${item.creator.split('&')[0].trim()} · ${item.pricing}</p>
      ${extra}
    </article>`;
  }

  function cards(items, empty = 'Nothing in the directory matches that.') {
    if (!items.length) return `<p class="empty">${empty}</p>`;
    return items.map((item) => card(item)).join('');
  }

  function setCard(item) {
    const thumbs = item.resourceIds.map((id) => `<img src="/assets/${id}.png" alt="">`).join('');
    return `<button type="button" class="set" data-go="collection" data-slug="${item.slug}">
      <span class="covers">${thumbs}</span>
      <h3>${item.name}</h3>
      <p>${item.tagline}</p>
      <p class="meta">${item.resourceIds.length} websites</p>
    </button>`;
  }

  function row(item, note = '') {
    return `<button type="button" class="row" data-open="${item.id}">
      <img src="/assets/${item.id}.png" alt="">
      <span><b>${item.name}</b><br><span class="meta">${item.category} · ${item.pricing}</span></span>
      <span class="meta">${note || 'Open'}</span>
    </button>`;
  }

  function defaultLists() {
    return [{ id: DEFAULT_LIST_ID, name: 'Favourites', resourceIds: [] }];
  }

  function loadLists() {
    try {
      const stored = JSON.parse(localStorage.getItem(LISTS_KEY) || 'null');
      if (Array.isArray(stored) && stored.length) return stored;
    } catch {
      /* guest */
    }
    return defaultLists();
  }

  function writeLists(lists) {
    try {
      localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
    } catch {
      /* private mode */
    }
  }

  function savedIds() {
    return loadLists().flatMap((list) => list.resourceIds);
  }

  function isSaved(id) {
    return savedIds().includes(id);
  }

  function toggleSave(id) {
    const lists = loadLists();
    const next = lists.map((list) => {
      if (list.id !== DEFAULT_LIST_ID) return list;
      const has = list.resourceIds.includes(id);
      return {
        ...list,
        resourceIds: has ? list.resourceIds.filter((item) => item !== id) : [...list.resourceIds, id],
      };
    });
    writeLists(next);
    return next;
  }

  function sheetMarkup() {
    return `<div class="sheet" id="uixo-sheet" hidden>
      <div class="panel">
        <img id="uixo-sheet-img" alt="">
        <div class="pad">
          <p class="meta" id="uixo-sheet-meta"></p>
          <h2 id="uixo-sheet-name"></h2>
          <p class="why" id="uixo-sheet-why"></p>
          <div class="sheet-actions">
            <a class="solid" id="uixo-sheet-visit" target="_blank" rel="noreferrer">Visit website</a>
            <button type="button" class="ghost" id="uixo-sheet-save">Save</button>
            <button type="button" class="ghost" id="uixo-sheet-close">Close</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function searchLayerMarkup() {
    return `<div class="search-layer" id="uixo-search" hidden>
      <div class="search-panel">
        <label class="search search-wide">
          <input id="uixo-search-input" placeholder="Icons, grain, React components…" />
          <kbd>esc</kbd>
        </label>
        <div id="uixo-search-hits"></div>
      </div>
    </div>`;
  }

  function ensureChrome() {
    if (!document.getElementById('uixo-sheet')) {
      document.body.insertAdjacentHTML('beforeend', sheetMarkup());
    }
    if (!document.getElementById('uixo-search')) {
      document.body.insertAdjacentHTML('beforeend', searchLayerMarkup());
    }
  }

  function fillSheet(id) {
    const item = byId(id);
    if (!item) return;
    document.getElementById('uixo-sheet-img').src = `/assets/${item.id}.png`;
    document.getElementById('uixo-sheet-name').textContent = item.name;
    document.getElementById('uixo-sheet-meta').textContent = `${item.category} · ${item.pricing} · ${item.formats.join(' · ')}`;
    document.getElementById('uixo-sheet-why').textContent = why[item.id] || item.description;
    document.getElementById('uixo-sheet-visit').href = item.url;
    document.getElementById('uixo-sheet-save').textContent = isSaved(item.id) ? 'Saved' : 'Save';
    document.getElementById('uixo-sheet').hidden = false;
    document.getElementById('uixo-sheet').dataset.open = item.id;
  }

  function closeSheet() {
    const sheet = document.getElementById('uixo-sheet');
    if (sheet) sheet.hidden = true;
  }

  function renderSearchHits(q) {
    const hits = searchHits(q);
    const box = document.getElementById('uixo-search-hits');
    const cats = hits.categories
      .map((item) => `<button type="button" data-go="category" data-cat="${item.name}"><span>${item.name}</span><em>category · ${categoryCount(item.name)}</em></button>`)
      .join('');
    const cols = hits.collections
      .map((item) => `<button type="button" data-go="collection" data-slug="${item.slug}"><span>${item.name}</span><em>collection</em></button>`)
      .join('');
    const rows = hits.resources
      .map((item) => `<button type="button" data-open="${item.id}"><span>${item.name}</span><em>${item.category} · ${item.pricing}</em></button>`)
      .join('');
    box.innerHTML = `
      ${cats || cols || rows ? '' : '<p class="empty">Nothing matches that.</p>'}
      ${cats ? `<p class="sheet-label">Categories</p><div class="suggest">${cats}</div>` : ''}
      ${cols ? `<p class="sheet-label">Collections</p><div class="suggest">${cols}</div>` : ''}
      ${rows ? `<p class="sheet-label">Websites</p><div class="suggest">${rows}</div>` : ''}
    `;
  }

  function openSearch(seed = '') {
    ensureChrome();
    const layer = document.getElementById('uixo-search');
    const input = document.getElementById('uixo-search-input');
    layer.hidden = false;
    input.value = seed;
    renderSearchHits(seed);
    input.focus();
  }

  function closeSearch() {
    const layer = document.getElementById('uixo-search');
    if (layer) layer.hidden = true;
  }

  function bind(handlers) {
    ensureChrome();
    const onGo = handlers.onGo;
    const onOpen = handlers.onOpen || ((id) => fillSheet(id));
    const onChanged = handlers.onChanged || (() => {});

    document.addEventListener('click', (event) => {
      const closeSearchBtn = event.target.closest('#uixo-search');
      if (closeSearchBtn && event.target.id === 'uixo-search') {
        closeSearch();
        return;
      }
      const opener = event.target.closest('[data-search-open], .js-search');
      if (opener && !event.target.closest('input')) {
        event.preventDefault();
        openSearch(opener.dataset.q || '');
        return;
      }
      const closer = event.target.closest('#uixo-sheet-close, #uixo-sheet');
      if (closer && (event.target.id === 'uixo-sheet-close' || event.target.id === 'uixo-sheet')) {
        closeSheet();
        return;
      }
      const save = event.target.closest('#uixo-sheet-save');
      if (save) {
        const id = document.getElementById('uixo-sheet').dataset.open;
        toggleSave(id);
        save.textContent = isSaved(id) ? 'Saved' : 'Save';
        onChanged();
        return;
      }
      const open = event.target.closest('[data-open]');
      if (open) {
        closeSearch();
        onOpen(open.dataset.open);
        return;
      }
      const go = event.target.closest('[data-go]');
      if (go) {
        closeSearch();
        closeSheet();
        onGo(go.dataset.go, go);
      }
    });

    document.addEventListener('input', (event) => {
      if (event.target.id === 'uixo-search-input') renderSearchHits(event.target.value);
      if (event.target.matches('[data-search]')) handlers.onQuery?.(event.target.value);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && !event.target.closest('input, textarea')) {
        event.preventDefault();
        openSearch();
      }
      if (event.key === 'Escape') {
        closeSearch();
        closeSheet();
      }
    });
  }

  window.UIXO = {
    resources,
    collections,
    categories,
    why,
    byId,
    collectionBySlug,
    categoryCount,
    populatedSubs,
    blurb,
    filter,
    searchHits,
    card,
    cards,
    setCard,
    row,
    loadLists,
    savedIds,
    isSaved,
    toggleSave,
    fillSheet,
    closeSheet,
    openSearch,
    closeSearch,
    bind,
  };
})();
(() => {
  if (window.self !== window.top) {
    document.documentElement.classList.add('embed');
    return;
  }

  const here = location.pathname.split('/').pop() || 'index.html';
  const links = [
    ['index.html', 'Gallery'],
    ['current.html', 'Today'],
    ['editorial.html', 'A'],
    ['three-homes.html', 'B'],
    ['search-first.html', 'C'],
    ['slim-sidebar.html', 'D'],
    ['mobile.html', 'E'],
    ['f.html', 'F'],
  ];

  const bar = document.createElement('header');
  bar.className = 'studio';
  bar.innerHTML = `
    <a class="brand" href="index.html">UIXO</a>
    <nav>${links
      .map(
        ([href, label]) =>
          `<a href="${href}"${here === href ? ' class="on"' : ''}>${label}</a>`,
      )
      .join('')}</nav>
    <a class="ghost" href="index.html#why">Why</a>
  `;
  document.body.prepend(bar);
  document.querySelectorAll('.back').forEach((el) => el.remove());
})();
