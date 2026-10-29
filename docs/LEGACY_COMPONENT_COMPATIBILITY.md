# Legacy component compatibility

`components/sections/sectionRegistry.js` remains required by the old editor controls. `public-section-registry.js` references the same React views without importing its property panels; `SectionRenderer` uses that render-only map. All thirteen default fixtures have passing SSR regression checks. No section data converter was implemented.

| Stored section type | Existing view in frontend/components/sections | Status | Puck relationship / conversion |
|---|---|---|---|
| header | Header.jsx | Legacy but still required | Navbar/Header alias differs in props; no conversion |
| hero | Hero.jsx | Legacy but still required | Hero layout/content/config differs; no conversion |
| logocloud | LogoCloud.jsx | Legacy but still required | LogoCloud props differ; no conversion |
| about | About.jsx | Legacy but still required | Composed layout; no proven lossless mapping |
| services | Services.jsx | Legacy but still required | Could use composed cards; no automatic mapping |
| portfolio | Portfolio.jsx | Legacy but still required | ProjectCard presentation is not a data adapter |
| gallery | Gallery.jsx | Legacy but still required | ImageGallery has different schema |
| stats | Stats.jsx | Legacy but still required | StatsCounter differs in layout/content |
| testimonials | Testimonials.jsx | Legacy but still required | Testimonial is not a lossless section replacement |
| process | Process.jsx | Legacy but still required | Timeline is a different implementation |
| cta | CTA.jsx | Legacy but still required | CallToAction schema differs |
| contact | Contact.jsx | Legacy but still required | ContactForm has no submission backend |
| footer | Footer.jsx | Legacy but still required | Footer slots/navigation structure differs |

All active Puck registrations and shared utilities are listed in [component inventory](COMPONENT_REGISTRY_INVENTORY.md). Legacy `builder/properties` files remain outside the public dependency graph and are preserved with the section editor registry. Other old builder implementations are not deleted or reclassified as safe to remove by M2; removal needs an independent import/runtime audit.

## Safe customer-data migration plan

1. Inventory actual saved documents with read-only exports, preserving page/site IDs, owners, legacy sections, responsive state and published hashes. Repository fixtures do not prove the full customer corpus.
2. Run `inspect-document.js` on unversioned exports. Review warnings, unknown fields, default/range drift, URLs and nested responsive structures. Preserve original bytes/export and publication snapshot.
3. Leave valid historical rendering active. Do not attach version tags just by opening/viewing/saving. Fix or explicitly map incompatibilities in a separate draft copy under a reviewed, deterministic adapter; sections need type-specific mapping and browser evidence.
4. Offer an explicit copy/preview conversion, with field-level loss reporting and desktop/tablet/mobile checks. Where conversion is not proven lossless, retain the old renderer and block Puck replacement through `assertPuckEditable`.
5. Validate a canonical copy, preserve stable IDs where semantically equivalent, explicitly assign document identity, then request authorized apply/publish. Do not mutate the old published snapshot during preview. Future revision storage should precede broad customer migration.
6. Observe the migrated copy, provide rollback to original publication, then retire legacy code only after database corpus inventory, customer acceptance and retention approval show no remaining dependency.

Existing browser/Clerk gates remain unverified. No claim is made that arbitrary legacy section JSON can be opened as an editable Puck page today. Null editorData with sections is intentionally protected with HTTP 409.
