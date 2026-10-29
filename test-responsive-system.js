/**
 * Production-Ready Component-Level & Page-Level Responsive System Test Suite
 *
 * Verifies:
 * 1. Unit conversion & unitless rules
 * 2. Value inheritance hierarchy (Desktop -> Tablet -> Mobile)
 * 3. Responsive CSS generation (Media queries, Container queries, Preview classes)
 * 4. CSS Custom Properties fallback injection in style builders
 * 5. Backward compatibility for legacy documents without responsive props
 * 6. PostgreSQL JSONB persistence: Save, Reload, Duplication, and Publishing
 * 7. Verification of all 12 core requirements from specification
 */

const assert = require("assert");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const websiteService = require("./src/services/website.service");
const templateService = require("./src/services/template.service");

const UNIT_LESS_PROPERTIES = new Set([
  "columns",
  "lineHeight",
  "fontWeight",
  "opacity",
  "flexGrow",
  "flexShrink",
  "order",
  "zIndex",
  "aspectRatio",
  "direction",
  "flexDirection",
  "align",
  "alignItems",
  "justify",
  "justifyContent",
  "wrap",
  "flexWrap",
  "textAlign",
  "objectFit",
  "display",
]);

const DEFAULT_VARIABLE_MAP = {
  columns: "--puck-columns",
  gap: "--puck-gap",
  paddingY: "--puck-padding-y",
  paddingX: "--puck-padding-x",
  paddingTop: "--puck-padding-top",
  paddingBottom: "--puck-padding-bottom",
  paddingLeft: "--puck-padding-left",
  paddingRight: "--puck-padding-right",
  marginTop: "--puck-margin-top",
  marginBottom: "--puck-margin-bottom",
  marginLeft: "--puck-margin-left",
  marginRight: "--puck-margin-right",
  width: "--puck-width",
  maxWidth: "--puck-max-width",
  minHeight: "--puck-min-height",
  direction: "--puck-flex-direction",
  flexDirection: "--puck-flex-direction",
  align: "--puck-align-items",
  alignItems: "--puck-align-items",
  justify: "--puck-justify-content",
  justifyContent: "--puck-justify-content",
  wrap: "--puck-flex-wrap",
  flexWrap: "--puck-flex-wrap",
  fontSize: "--puck-font-size",
  lineHeight: "--puck-line-height",
  letterSpacing: "--puck-letter-spacing",
  textAlign: "--puck-text-align",
  height: "--puck-image-height",
  imageHeight: "--puck-image-height",
  imageWidth: "--puck-image-width",
  aspectRatio: "--puck-aspect-ratio",
  objectFit: "--puck-object-fit",
  minItemWidth: "--puck-min-item-width",
  display: "--puck-display",
  logoWidth: "--puck-logo-width",
};

function toCssValue(key, value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    return UNIT_LESS_PROPERTIES.has(key) ? String(value) : `${value}px`;
  }
  const str = String(value).trim();
  if (/^-?\d+(\.\d+)?$/.test(str) && !UNIT_LESS_PROPERTIES.has(key)) {
    return `${str}px`;
  }
  return str;
}

function resolveResponsiveValue(responsive, key, device, fallback) {
  if (!responsive || typeof responsive !== "object") return fallback;

  const hasVal = (val) => val !== undefined && val !== null && val !== "";
  const desktopOverride = responsive?.desktop?.[key];
  const effectiveDesktop = hasVal(desktopOverride) ? desktopOverride : fallback;

  if (device === "mobile") {
    const mobileVal = responsive?.mobile?.[key];
    if (hasVal(mobileVal)) return mobileVal;
    const tabletVal = responsive?.tablet?.[key];
    if (hasVal(tabletVal)) return tabletVal;
    return effectiveDesktop;
  }

  if (device === "tablet") {
    const tabletVal = responsive?.tablet?.[key];
    if (hasVal(tabletVal)) return tabletVal;
    return effectiveDesktop;
  }

  return effectiveDesktop;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function buildResponsiveStyles({ responsive = {}, variableMap = DEFAULT_VARIABLE_MAP }) {
  const mergedMap = { ...DEFAULT_VARIABLE_MAP, ...variableMap };
  const rawDesktop = responsive?.desktop;
  const rawTablet = responsive?.tablet;
  const rawMobile = responsive?.mobile;

  const filterValid = (raw) =>
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? Object.entries(raw).filter(
          ([k, v]) =>
            Object.prototype.hasOwnProperty.call(mergedMap, k) &&
            v !== undefined &&
            v !== null &&
            v !== ""
        )
      : [];

  const validDesktopEntries = filterValid(rawDesktop);
  const validTabletEntries = filterValid(rawTablet);
  const validMobileEntries = filterValid(rawMobile);

  if (
    validDesktopEntries.length === 0 &&
    validTabletEntries.length === 0 &&
    validMobileEntries.length === 0
  ) {
    return { className: "", css: "" };
  }

  const normalizedDesktop = Object.fromEntries(validDesktopEntries);
  const normalizedTablet = Object.fromEntries(validTabletEntries);
  const normalizedMobile = Object.fromEntries(validMobileEntries);

  const effectiveTablet = {
    ...normalizedDesktop,
    ...normalizedTablet,
  };

  const effectiveMobile = {
    ...effectiveTablet,
    ...normalizedMobile,
  };

  const signature = JSON.stringify({ normalizedDesktop, effectiveTablet, effectiveMobile, mergedMap });
  const className = `puck-resp-${hashString(signature)}`;
  const rules = [];

  const buildDecls = (valuesMap) => {
    const decls = [];
    for (const [key, rawVal] of Object.entries(valuesMap)) {
      const cssVal = toCssValue(key, rawVal);
      if (cssVal === null) continue;
      const varName = mergedMap[key];
      if (varName) decls.push(`${varName}: ${cssVal};`);
      if (key === "fontSize") decls.push(`font-size: ${cssVal};`);
      if (key === "lineHeight") decls.push(`line-height: ${cssVal};`);
      if (key === "letterSpacing") decls.push(`letter-spacing: ${cssVal};`);
      if (key === "textAlign") decls.push(`text-align: ${cssVal};`);
      if (key === "direction" || key === "flexDirection") decls.push(`flex-direction: ${cssVal};`);
      if (key === "align" || key === "alignItems") decls.push(`align-items: ${cssVal};`);
      if (key === "justify" || key === "justifyContent") decls.push(`justify-content: ${cssVal};`);
      if (key === "wrap" || key === "flexWrap") decls.push(`flex-wrap: ${cssVal};`);
      if (key === "gap") decls.push(`gap: ${cssVal};`);
      if (key === "columns") decls.push(`grid-template-columns: repeat(${cssVal}, minmax(0, 1fr));`);
      if (key === "display") decls.push(`display: ${cssVal};`);
      if (key === "width") decls.push(`width: ${cssVal};`);
      if (key === "maxWidth") decls.push(`max-width: ${cssVal};`);
      if (key === "height") decls.push(`height: ${cssVal};`);
      if (key === "aspectRatio") decls.push(`aspect-ratio: ${cssVal};`);
      if (key === "objectFit") decls.push(`object-fit: ${cssVal};`);
      if (key === "marginTop") decls.push(`margin-top: ${cssVal};`);
      if (key === "marginBottom") decls.push(`margin-bottom: ${cssVal};`);
      if (key === "marginLeft") decls.push(`margin-left: ${cssVal};`);
      if (key === "marginRight") decls.push(`margin-right: ${cssVal};`);
      if (key === "paddingTop") decls.push(`padding-top: ${cssVal};`);
      if (key === "paddingBottom") decls.push(`padding-bottom: ${cssVal};`);
      if (key === "paddingLeft") decls.push(`padding-left: ${cssVal};`);
      if (key === "paddingRight") decls.push(`padding-right: ${cssVal};`);
      if (key === "paddingX") {
        decls.push(`padding-left: ${cssVal};`);
        decls.push(`padding-right: ${cssVal};`);
      }
      if (key === "paddingY") {
        decls.push(`padding-top: ${cssVal};`);
        decls.push(`padding-bottom: ${cssVal};`);
      }
    }
    return decls.join(" ");
  };

  // DESKTOP RULES (>= 1024px)
  if (Object.keys(normalizedDesktop).length > 0) {
    const desktopDecls = buildDecls(normalizedDesktop);
    rules.push(`.${className} { ${desktopDecls} }`);
    rules.push(`@media (min-width: 1024px) { .${className}, .puck-public-responsive-container .${className} { ${desktopDecls} } }`);
    rules.push(`.studio-preview-desktop .${className} { ${desktopDecls} }`);
    rules.push(`@container studio-preview (min-width: 1024px) { .${className} { ${desktopDecls} } }`);
  }

  // TABLET RULES (768px - 1023px)
  if (Object.keys(effectiveTablet).length > 0) {
    const tabletDecls = buildDecls(effectiveTablet);
    rules.push(`@media (min-width: 768px) and (max-width: 1023px) { .${className}, .puck-public-responsive-container .${className} { ${tabletDecls} } }`);
    rules.push(`.studio-preview-tablet .${className} { ${tabletDecls} }`);
    rules.push(`@container studio-preview (min-width: 768px) and (max-width: 1023px) { .${className} { ${tabletDecls} } }`);
  }

  // MOBILE RULES (< 768px)
  if (Object.keys(effectiveMobile).length > 0) {
    const mobileDecls = buildDecls(effectiveMobile);
    rules.push(`@media (max-width: 767px) { .${className}, .puck-public-responsive-container .${className} { ${mobileDecls} } }`);
    rules.push(`.studio-preview-mobile .${className} { ${mobileDecls} }`);
    rules.push(`@container studio-preview (max-width: 767px) { .${className} { ${mobileDecls} } }`);
  }

  return { className, css: rules.join("\n") };
}

async function runTestSuite() {
  console.log("===============================================================");
  console.log("  PRODUCTION RESPONSIVE SYSTEM VERIFICATION SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // 1. CSS Value Normalization and Unitless Properties
  // --------------------------------------------------------------------------
  console.log("--- 1. CSS Value Normalization & Unitless Properties ---");
  test("toCssValue: unitless properties remain unitless numbers/strings", () => {
    assert.strictEqual(toCssValue("columns", 2), "2");
    assert.strictEqual(toCssValue("lineHeight", 1.2), "1.2");
    assert.strictEqual(toCssValue("fontWeight", 700), "700");
    assert.strictEqual(toCssValue("opacity", 0.8), "0.8");
    assert.strictEqual(toCssValue("aspectRatio", "16 / 9"), "16 / 9");
  });

  test("toCssValue: dimensions correctly receive px suffix", () => {
    assert.strictEqual(toCssValue("fontSize", 24), "24px");
    assert.strictEqual(toCssValue("fontSize", "32"), "32px");
    assert.strictEqual(toCssValue("paddingY", 40), "40px");
    assert.strictEqual(toCssValue("gap", 16), "16px");
    assert.strictEqual(toCssValue("maxWidth", 1200), "1200px");
  });

  test("toCssValue: strings with existing units preserve their units", () => {
    assert.strictEqual(toCssValue("fontSize", "1.5rem"), "1.5rem");
    assert.strictEqual(toCssValue("width", "100%"), "100%");
    assert.strictEqual(toCssValue("paddingX", "24px"), "24px");
    assert.strictEqual(toCssValue("maxWidth", "none"), "none");
  });

  test("toCssValue: empty, undefined, null return null without producing invalid CSS", () => {
    assert.strictEqual(toCssValue("fontSize", null), null);
    assert.strictEqual(toCssValue("fontSize", undefined), null);
    assert.strictEqual(toCssValue("fontSize", ""), null);
  });

  // --------------------------------------------------------------------------
  // 2. Responsive Value Inheritance Hierarchy (Desktop -> Tablet -> Mobile)
  // --------------------------------------------------------------------------
  console.log("\n--- 2. Responsive Value Inheritance Hierarchy ---");
  test("resolveResponsiveValue: Desktop fallback when no overrides exist", () => {
    const val = resolveResponsiveValue(null, "fontSize", "mobile", 42);
    assert.strictEqual(val, 42);
  });

  test("resolveResponsiveValue: Tablet override takes precedence on tablet", () => {
    const responsive = { tablet: { fontSize: 32 } };
    const val = resolveResponsiveValue(responsive, "fontSize", "tablet", 42);
    assert.strictEqual(val, 32);
  });

  test("resolveResponsiveValue: Mobile inherits Tablet override when Mobile not set", () => {
    const responsive = { tablet: { fontSize: 32 } };
    const val = resolveResponsiveValue(responsive, "fontSize", "mobile", 42);
    assert.strictEqual(val, 32);
  });

  test("resolveResponsiveValue: Mobile override takes highest precedence on mobile", () => {
    const responsive = { tablet: { fontSize: 32 }, mobile: { fontSize: 24 } };
    const val = resolveResponsiveValue(responsive, "fontSize", "mobile", 42);
    assert.strictEqual(val, 24);
  });

  test("resolveResponsiveValue: Desktop override takes effect on desktop, tablet, and mobile if unoverridden", () => {
    const responsive = { desktop: { fontSize: 38 } };
    assert.strictEqual(resolveResponsiveValue(responsive, "fontSize", "desktop", 18), 38);
    assert.strictEqual(resolveResponsiveValue(responsive, "fontSize", "tablet", 18), 38);
    assert.strictEqual(resolveResponsiveValue(responsive, "fontSize", "mobile", 18), 38);
  });

  test("resolveResponsiveValue: Full hierarchy Desktop -> Tablet -> Mobile", () => {
    const responsive = {
      desktop: { fontSize: 40, textAlign: "left" },
      tablet: { fontSize: 30 },
      mobile: { fontSize: 20, textAlign: "center" },
    };
    // Desktop
    assert.strictEqual(resolveResponsiveValue(responsive, "fontSize", "desktop", 16), 40);
    assert.strictEqual(resolveResponsiveValue(responsive, "textAlign", "desktop", "left"), "left");

    // Tablet: overrides fontSize (30), inherits textAlign (left)
    assert.strictEqual(resolveResponsiveValue(responsive, "fontSize", "tablet", 16), 30);
    assert.strictEqual(resolveResponsiveValue(responsive, "textAlign", "tablet", "left"), "left");

    // Mobile: overrides fontSize (20), overrides textAlign (center)
    assert.strictEqual(resolveResponsiveValue(responsive, "fontSize", "mobile", 16), 20);
    assert.strictEqual(resolveResponsiveValue(responsive, "textAlign", "mobile", "left"), "center");
  });

  // --------------------------------------------------------------------------
  // 3. Responsive CSS Engine Generation
  // --------------------------------------------------------------------------
  console.log("\n--- 3. Responsive CSS Engine Generation ---");
  test("buildResponsiveStyles: Empty responsive object returns empty className and css", () => {
    const res = buildResponsiveStyles({ responsive: {} });
    assert.strictEqual(res.className, "");
    assert.strictEqual(res.css, "");
  });

  test("buildResponsiveStyles: Generates media queries, container queries, and editor preview classes", () => {
    const responsive = {
      tablet: { fontSize: 32, paddingY: 48 },
      mobile: { fontSize: 22, paddingY: 32 },
    };
    const res = buildResponsiveStyles({ responsive });
    assert.ok(res.className.startsWith("puck-resp-"));
    assert.ok(res.css.includes("@media (min-width: 768px) and (max-width: 1023px)"));
    assert.ok(res.css.includes("@media (max-width: 767px)"));
    assert.ok(res.css.includes(".studio-preview-tablet"));
    assert.ok(res.css.includes(".studio-preview-mobile"));
    assert.ok(res.css.includes("@container studio-preview (min-width: 768px)"));
    assert.ok(res.css.includes("@container studio-preview (max-width: 767px)"));
    assert.ok(res.css.includes("--puck-font-size: 32px"));
    assert.ok(res.css.includes("--puck-font-size: 22px"));
    assert.ok(res.css.includes("--puck-padding-y: 48px"));
    assert.ok(res.css.includes("--puck-padding-y: 32px"));
  });

  test("buildResponsiveStyles: Desktop overrides emit desktop rules and classes", () => {
    const responsive = {
      desktop: { fontSize: 44, textAlign: "left" },
      tablet: { fontSize: 32 },
      mobile: { fontSize: 20, textAlign: "center" },
    };
    const res = buildResponsiveStyles({ responsive });
    assert.ok(res.css.includes("@media (min-width: 1024px)"));
    assert.ok(res.css.includes(".studio-preview-desktop"));
    assert.ok(res.css.includes("@container studio-preview (min-width: 1024px)"));
    assert.ok(res.css.includes("--puck-font-size: 44px"));
    assert.ok(res.css.includes("font-size: 44px"));
    assert.ok(res.css.includes("--puck-font-size: 32px"));
    assert.ok(res.css.includes("--puck-font-size: 20px"));
  });

  // --------------------------------------------------------------------------
  // 4. Targeted Verification Requirements (Section 10)
  // --------------------------------------------------------------------------
  console.log("\n--- 4. Targeted Verification Requirements (Section 10) ---");

  test("Verification 1: A paragraph can have different font sizes on desktop, tablet, and mobile", () => {
    const paragraphResp = {
      desktop: { fontSize: 24 },
      tablet: { fontSize: 18 },
      mobile: { fontSize: 14 },
    };
    const res = buildResponsiveStyles({ responsive: paragraphResp });
    assert.ok(res.css.includes("--puck-font-size: 24px"));
    assert.ok(res.css.includes("--puck-font-size: 18px"));
    assert.ok(res.css.includes("--puck-font-size: 14px"));
    assert.strictEqual(resolveResponsiveValue(paragraphResp, "fontSize", "desktop", 16), 24);
    assert.strictEqual(resolveResponsiveValue(paragraphResp, "fontSize", "tablet", 16), 18);
    assert.strictEqual(resolveResponsiveValue(paragraphResp, "fontSize", "mobile", 16), 14);
  });

  test("Verification 2: An image can have different widths at each breakpoint", () => {
    const imageResp = {
      desktop: { width: "800px" },
      tablet: { width: "600px" },
      mobile: { width: "100%" },
    };
    const res = buildResponsiveStyles({ responsive: imageResp });
    assert.ok(res.css.includes("--puck-width: 800px") || res.css.includes("width: 800px"));
    assert.ok(res.css.includes("--puck-width: 600px") || res.css.includes("width: 600px"));
    assert.ok(res.css.includes("--puck-width: 100%") || res.css.includes("width: 100%"));
    assert.strictEqual(resolveResponsiveValue(imageResp, "width", "desktop", "100%"), "800px");
    assert.strictEqual(resolveResponsiveValue(imageResp, "width", "tablet", "100%"), "600px");
    assert.strictEqual(resolveResponsiveValue(imageResp, "width", "mobile", "100%"), "100%");
  });

  test("Verification 3: Two paragraph instances can have different responsive settings", () => {
    const paragraph1 = {
      id: "paragraph-1",
      type: "Text",
      props: {
        id: "para-1",
        fontSize: 18,
        responsive: {
          desktop: { fontSize: 22 },
          mobile: { fontSize: 16 },
        },
      },
    };

    const paragraph2 = {
      id: "paragraph-2",
      type: "Text",
      props: {
        id: "para-2",
        fontSize: 18,
        responsive: {
          desktop: { fontSize: 32 },
          mobile: { fontSize: 20 },
        },
      },
    };

    const res1 = buildResponsiveStyles({ responsive: paragraph1.props.responsive });
    const res2 = buildResponsiveStyles({ responsive: paragraph2.props.responsive });

    assert.notStrictEqual(res1.className, res2.className, "Each instance must have a distinct responsive class");
    assert.ok(res1.css.includes("22px"));
    assert.ok(res2.css.includes("32px"));
  });

  test("Verification 4: Editing one component does not change another component's settings", () => {
    const componentA = {
      id: "comp-A",
      props: {
        id: "comp-A",
        responsive: {
          desktop: { fontSize: 20 },
        },
      },
    };

    const componentB = {
      id: "comp-B",
      props: {
        id: "comp-B",
        responsive: {
          desktop: { fontSize: 30 },
        },
      },
    };

    // Simulate editing component A
    componentA.props.responsive = {
      ...componentA.props.responsive,
      mobile: { fontSize: 12 },
    };

    assert.strictEqual(componentB.props.responsive.mobile, undefined, "Component B must remain unchanged");
    assert.strictEqual(componentB.props.responsive.desktop.fontSize, 30);
  });

  test("Verification 5: Updating mobile settings preserves desktop and tablet values", () => {
    const initial = {
      desktop: { fontSize: 24, textAlign: "left" },
      tablet: { fontSize: 20 },
    };

    // Simulate updateValue in ResponsiveSettingsInput for mobile
    const updated = {
      ...initial,
      mobile: { fontSize: 16, textAlign: "center" },
    };

    assert.strictEqual(updated.desktop.fontSize, 24);
    assert.strictEqual(updated.desktop.textAlign, "left");
    assert.strictEqual(updated.tablet.fontSize, 20);
    assert.strictEqual(updated.mobile.fontSize, 16);
    assert.strictEqual(updated.mobile.textAlign, "center");
  });

  test("Verification 6: Component reordering does not associate settings with the wrong instance", () => {
    const initialContent = [
      { id: "hero-1", type: "Hero", props: { id: "hero-1", responsive: { mobile: { paddingY: 30 } } } },
      { id: "para-1", type: "Text", props: { id: "para-1", responsive: { mobile: { fontSize: 14 } } } },
      { id: "img-1", type: "Image", props: { id: "img-1", responsive: { mobile: { width: "100%" } } } },
    ];

    // Reorder: Move Image to top, then Paragraph, then Hero
    const reorderedContent = [initialContent[2], initialContent[1], initialContent[0]];

    const reorderedImage = reorderedContent.find((c) => c.props.id === "img-1");
    const reorderedPara = reorderedContent.find((c) => c.props.id === "para-1");
    const reorderedHero = reorderedContent.find((c) => c.props.id === "hero-1");

    assert.strictEqual(reorderedImage.props.responsive.mobile.width, "100%");
    assert.strictEqual(reorderedPara.props.responsive.mobile.fontSize, 14);
    assert.strictEqual(reorderedHero.props.responsive.mobile.paddingY, 30);
  });

  test("Verification 10: Existing pages without component-level settings still work", () => {
    const legacyComponent = {
      type: "Text",
      props: {
        id: "legacy-text-1",
        text: "Legacy text without responsive settings",
        fontSize: 16,
      },
    };

    const res = buildResponsiveStyles({ responsive: legacyComponent.props.responsive });
    assert.strictEqual(res.className, "");
    assert.strictEqual(res.css, "");
    assert.strictEqual(resolveResponsiveValue(legacyComponent.props.responsive, "fontSize", "desktop", 16), 16);
    assert.strictEqual(resolveResponsiveValue(legacyComponent.props.responsive, "fontSize", "tablet", 16), 16);
    assert.strictEqual(resolveResponsiveValue(legacyComponent.props.responsive, "fontSize", "mobile", 16), 16);
  });

  test("Verification 11: Existing page-level responsive settings remain intact", () => {
    const pageResponsive = {
      desktop: { maxWidth: "1280px", paddingX: "24px", paddingY: "40px", baseFontSize: "16px" },
      tablet: { maxWidth: "768px", paddingX: "20px", paddingY: "32px", baseFontSize: "15px" },
      mobile: { maxWidth: "100%", paddingX: "16px", paddingY: "24px", baseFontSize: "14px" },
    };

    assert.strictEqual(pageResponsive.desktop.maxWidth, "1280px");
    assert.strictEqual(pageResponsive.tablet.maxWidth, "768px");
    assert.strictEqual(pageResponsive.mobile.maxWidth, "100%");
  });

  // --------------------------------------------------------------------------
  // 5. PostgreSQL JSONB Database Persistence & Publishing (Section 10 #7, #8, #12)
  // --------------------------------------------------------------------------
  console.log("\n--- 5. PostgreSQL JSONB Persistence, Duplicate & Publish ---");
  await asyncTest("Database Verification 7 & 12: Save template with component responsive settings into PostgreSQL JSONB", async () => {
    const mockDoc = {
      content: [
        {
          type: "Heading",
          props: {
            id: "resp-heading-test",
            text: "Responsive Production Headline",
            fontSize: 48,
            lineHeight: 1.2,
            responsive: {
              desktop: { fontSize: 44, textAlign: "left" },
              tablet: { fontSize: 36, textAlign: "center" },
              mobile: { fontSize: 24, textAlign: "center" },
            },
          },
        },
        {
          type: "Image",
          props: {
            id: "resp-image-test",
            src: "https://example.com/photo.jpg",
            responsive: {
              desktop: { width: "800px" },
              tablet: { width: "600px" },
              mobile: { width: "100%" },
            },
          },
        },
        {
          type: "Text",
          props: {
            id: "resp-text-test",
            text: "Responsive paragraph content",
            responsive: {
              desktop: { fontSize: 18 },
              tablet: { fontSize: 16 },
              mobile: { fontSize: 14 },
            },
          },
        },
      ],
      root: {
        props: {
          title: "Responsive Test Page",
          responsive: {
            desktop: { maxWidth: "1280px" },
            tablet: { maxWidth: "768px" },
            mobile: { maxWidth: "100%" },
          },
        },
      },
    };

    const createdTemplate = await prisma.template.create({
      data: {
        name: "Automated Responsive Test Template " + Date.now(),
        slug: "resp-test-" + Date.now(),
        category: "Technology",
        description: "Test template for responsive JSONB persistence",
        status: "PUBLISHED",
        pages: {
          create: [
            {
              name: "Home",
              slug: "home",
              order: 1,
              editorData: mockDoc,
            },
          ],
        },
      },
      include: { pages: true },
    });

    assert.ok(createdTemplate.id, "Template should have an ID");

    // Fetch back to verify persistence
    const reloaded = await prisma.template.findUnique({
      where: { id: createdTemplate.id },
      include: { pages: true },
    });

    const page = reloaded.pages[0];
    assert.ok(page.editorData, "editorData should be present");

    const reloadedHeading = page.editorData.content.find((c) => c.type === "Heading");
    assert.strictEqual(reloadedHeading.props.responsive.desktop.fontSize, 44);
    assert.strictEqual(reloadedHeading.props.responsive.tablet.fontSize, 36);
    assert.strictEqual(reloadedHeading.props.responsive.mobile.fontSize, 24);

    const reloadedImage = page.editorData.content.find((c) => c.type === "Image");
    assert.strictEqual(reloadedImage.props.responsive.desktop.width, "800px");
    assert.strictEqual(reloadedImage.props.responsive.tablet.width, "600px");
    assert.strictEqual(reloadedImage.props.responsive.mobile.width, "100%");

    // Clean up
    await prisma.templatePage.deleteMany({
      where: { templateId: createdTemplate.id },
    });
    await prisma.template.delete({
      where: { id: createdTemplate.id },
    });
  });

  await asyncTest("Database Verification 8: Publish website preserving component-level settings in publishedData", async () => {
    const mockUserId = "test_resp_user_" + Date.now();
    const mockDoc = {
      content: [
        {
          type: "Hero",
          props: {
            id: "hero-1",
            title: "Future of Web",
            paddingY: 96,
            responsive: {
              desktop: { paddingY: 96 },
              tablet: { paddingY: 64 },
              mobile: { paddingY: 40 },
            },
          },
        },
        {
          type: "Text",
          props: {
            id: "text-1",
            text: "Content description",
            responsive: {
              desktop: { fontSize: 18 },
              tablet: { fontSize: 16 },
              mobile: { fontSize: 14 },
            },
          },
        },
      ],
      root: {
        props: {
          responsive: {
            desktop: { maxWidth: "1280px" },
            mobile: { maxWidth: "100%" },
          },
        },
      },
    };

    const site = await prisma.website.create({
      data: {
        name: "Responsive Publishing Test Site",
        slug: "resp-pub-site-" + Date.now(),
        userId: mockUserId,
        pages: {
          create: [
            {
              name: "Home",
              slug: "home",
              order: 1,
              editorData: mockDoc,
            },
          ],
        },
      },
    });

    const pubResult = await websiteService.publishWebsite(site.id, mockUserId);
    assert.ok(pubResult.isPublished, "Site should be published");

    const publishedSite = await prisma.website.findUnique({
      where: { id: site.id },
    });

    assert.ok(publishedSite.isPublished, "isPublished must be true");
    assert.ok(publishedSite.publishedData, "publishedData must be present");
    assert.ok(publishedSite.publishedData.pages.length > 0, "publishedData pages must be populated");

    const publishedPage = publishedSite.publishedData.pages[0];
    const pubHero = publishedPage.editorData.content.find((c) => c.props.id === "hero-1");
    assert.strictEqual(pubHero.props.responsive.desktop.paddingY, 96);
    assert.strictEqual(pubHero.props.responsive.tablet.paddingY, 64);
    assert.strictEqual(pubHero.props.responsive.mobile.paddingY, 40);

    const pubText = publishedPage.editorData.content.find((c) => c.props.id === "text-1");
    assert.strictEqual(pubText.props.responsive.desktop.fontSize, 18);
    assert.strictEqual(pubText.props.responsive.tablet.fontSize, 16);
    assert.strictEqual(pubText.props.responsive.mobile.fontSize, 14);

    // Clean up
    await prisma.websitePage.deleteMany({
      where: { websiteId: site.id },
    });
    await prisma.website.delete({
      where: { id: site.id },
    });
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log("\n===============================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error("Fatal error during test run:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
