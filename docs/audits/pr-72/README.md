# PR #72 content audit

Audited 7 October 2026 against `19bb4c87a21c52b82539a3da9ac49a12717dd775` and base `73a751be3b64e7794d7a127c59539af5d75ff20a`.

## Scope and result

- Reviewed all 303 new rows, all 153 remapped subcategories, and contact sheets of all 302 available new-listing thumbnails. Decoded both WebP variants for each of those 302 listings, including the 73 pairs added by this PR.
- 12 new rows removed: 9 duplicate resources and 3 destinations no longer matching the listing. Final catalogue: 552 resources, a net addition of 291 over the base.
- 37 retained new rows corrected. No existing/base listing, taxonomy definition, application behaviour, or pricing-token handling changed.
- All retained remapped entries retain their original scout subcategory as a tag.
- Removed seven invalid PNG/WebP capture sets and their WebP manifest entries. The existing image-error letter tile handles these until recaptured; wireframekits already lacked an image.

## Removed rows

| ID              | Reason                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------- |
| screenlane      | Redirects to existing page-flows listing.                                                   |
| ui-movement     | Redirects to existing page-flows listing.                                                   |
| heroui-native-2 | Same canonical documentation as existing heroui-native.                                     |
| originui        | Redirects to existing coss-ui listing.                                                      |
| lucide-icons    | Same icon library as existing lucide.                                                       |
| nextui          | Redirects to existing heroui; destination is not a legacy archive.                          |
| three-ui        | Same ThreeUI catalogue as threeui.                                                          |
| sonaui-com      | Same Sona UI catalogue as sona-ui; keep first ID and update its URL.                        |
| design-vault    | Redirects to existing screensdesign.                                                        |
| briefup         | Captured gambling content and unrelated redirects; no longer the described brief generator. |
| screely         | Current destination and capture show gambling content, not screenshot mockups.              |
| farm-ui         | Captured parking page and current ww547.farmui.com parking redirect, not a UI library.      |

## Corrections

| ID                      | Reason                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| sona-ui                 | Old hostname redirects to canonical Sona UI site; retain original ID.                                                           |
| fwa                     | fwa.com points to chemical manufacturer Indulor; awards site is thefwa.com.                                                     |
| godly                   | godly.website redirects to Recent; describe current destination.                                                                |
| pivotal-ui              | Use working official documentation instead of failed styleguide host.                                                           |
| gsap                    | Official pricing page says library and plugins are free.                                                                        |
| shift-graphics          | Official site is a free font editor, not textures.                                                                              |
| vessa                   | Brand-guideline authoring tool, not inspiration gallery; publishing is paid.                                                    |
| apple-design-resources  | Figma and Sketch design resources, not coded templates.                                                                         |
| openmotion              | Motion-video authoring app, not a Framer template; current plan is free.                                                        |
| animos                  | Browser motion-template tool, not Framer templates.                                                                             |
| preview-kit             | Website-to-presentation video tool, not a coded template.                                                                       |
| shards-ui               | Official Shards page describes Bootstrap 4 UI kit; React edition is separate.                                                   |
| league-of-moveable-type | Foundry catalogue spans multiple type styles, not only sans serif.                                                              |
| tunera                  | Foundry catalogue spans multiple type styles and offers open fonts.                                                             |
| symbl                   | Logo preview utility, not an icon pack.                                                                                         |
| awesome-shadcn-ui       | Index/search of resources, not a component or UI kit.                                                                           |
| registry-directory      | Index/search of resources, not a component or UI kit.                                                                           |
| ui-registries           | Index/search of resources, not a component or UI kit.                                                                           |
| shoogle                 | Index/search of resources, not a component or UI kit.                                                                           |
| react-cosmos            | Component development sandbox, not a component.                                                                                 |
| storybook               | Component workshop tool, not a React-only component library.                                                                    |
| shadcn-lint             | Linting tool, not a React component.                                                                                            |
| tweakcn                 | Theme editor, not a downloadable UI kit.                                                                                        |
| screenshot-to-code      | Screenshot-to-code app, not an installable agent skill.                                                                         |
| diffui                  | Prompt-to-design app, not an installable agent skill.                                                                           |
| uisfx                   | Reusable audio assets, not React components.                                                                                    |
| cuelume                 | Web interaction-sound library, not visual UI components.                                                                        |
| lightugc                | AI content creation tool, not stock assets; remove scout provenance from copy.                                                  |
| closeit-fast            | Electronic-signature app is not a design asset; remove research notes.                                                          |
| color-review            | Replace scout provenance with observed function.                                                                                |
| animated-icons-co       | Remove bookmark-list provenance from public copy.                                                                               |
| craftwork               | Remove bookmark-list provenance from public copy.                                                                               |
| alpha-lyrae             | Remove scout-list provenance from public copy.                                                                                  |
| shadcn-io               | Current destination is a React component library, not just a directory.                                                         |
| polaris                 | Point to official source repository matching the listed React library; previous host failed or redirected to different content. |
| supabase-ui             | Point to official source repository matching the listed React library; previous host failed or redirected to different content. |
| reach-ui                | Point to official source repository matching the listed React library; previous host failed or redirected to different content. |

## Thumbnail evidence

| ID                   | Invalid capture                                                       |
| -------------------- | --------------------------------------------------------------------- |
| dx-figgle, lio-icons | Connection-security verification page                                 |
| harmony-modern-serif | Google homepage rather than the font                                  |
| pivotal-ui           | Browser TLS error                                                     |
| fwa                  | Indulor chemical company rather than website awards                   |
| free-css             | Bricks WordPress builder rather than the listed free-template archive |
| metalforge           | Sign-in screen rather than the shader editor                          |

## First-party evidence

- https://gsap.com/pricing/ confirms GSAP and plugins are free.
- https://www.tunera.xyz/ lists free use/distribution/modification and the SIL Open Font License.
- https://www.shift.graphics/ identifies a free open-source font editor.
- https://vessa.design/ describes free authoring with paid publishing.
- https://openmotion.design/ identifies a motion app with a currently free plan and Claude Code/Codex subscription dependency.
- https://animos.app/ identifies motion templates for design showcases.
- https://developer.apple.com/design/resources/ provides design kits, not coded templates.
- https://designrevision.com/downloads/shards/ identifies Bootstrap 4; Shards React is a separate product.
- https://color.review/ identifies a colour-contrast checker.
- https://uisfx.com/ and https://cuelume.dev/ identify sound resources.
- https://lightugc.com/ identifies an AI content-creation/scheduling tool.
- https://www.sonaui.com/ is the canonical destination of sona-ui.vercel.app.
- https://originui.com/ redirects to https://coss.com/ui, already listed.
- https://designvault.io/ redirects to https://screensdesign.com/, already listed.
- https://nextui.org/ redirects to https://heroui.com/, already listed.
- https://thefwa.com/ is the awards site; fwa.com redirected to Indulor.
- https://recent.design/ is the destination reached from godly.website.
- https://pivotal-cf.github.io/pivotal-ui/ is working official Pivotal documentation.
- https://github.com/Shopify/polaris-react-archive and https://github.com/supabase/ui are the archived React products.
- https://github.com/reach/reach-ui is the official source for Reach UI.

## Verification and limits

- One bounded GET sweep of all 303 added URLs: 294 returned 200/206, six 502, one 403, one 526, one 530. A success status establishes reachability only, not content quality or pricing. Redirects and suspect identities were checked separately against page text and stored captures.
- `listing-audit.csv` records every URL outcome and remaining unverified destinations. Network failures were not treated as proof of a dead product.
- The existing taxonomy lacks natural homes for sound tools and general creative software. Corrections use the closest existing Tools/Design assets categories; no new taxonomy was invented.
- `/candidates` intentionally remains the raw, explicitly staged scout file. It still contains historical duplicates, inaccurate scout pricing and rejected destinations; do not treat it as an approved catalogue or re-import it wholesale.
- Remaining weak but not demonstrably false one-line descriptions were retained. Rubik product identity and closeit.fast editorial relevance need follow-up. Pricing was corrected only where first-party evidence was clear; this is not a verified pricing certificate for every new product.
- Preview at input head: authorised Vercel access succeeded; home showed 564 resources; `/candidates` loaded 562 staged rows, labelled as not live; searching GSAP returned GSAP and Tween UI with source links.
- Validation results and final commit/preview status are recorded in the PR evidence comment.
