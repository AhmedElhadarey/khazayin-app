import fs from "fs";
import path from "path";

import { RESERVED_COLUMNS } from "@/constants/layout";
import { RAIL_EDGE_GUTTER, railListGeometry } from "@/constants/responsive";

const read = (rel: string) =>
  fs.readFileSync(path.join(__dirname, "..", rel), "utf8");

/**
 * Every screen that must sit in the tablet reading column, and what that
 * means for it. `scroll` is how many content containers carry `columnStyle`;
 * `header` that every InlineHeader (or SegmentTabs) gets it; `blocks` that the
 * fixed search/input/state blocks outside the scroll get it; `rail` that the
 * alphabet rail is positioned by `railListGeometry`; `footer` that a pinned
 * apply bar keeps its rule full width but puts its button in the column (the
 * outer bar drops its side padding, the inner wrapper carries it).
 *
 * archive and settings-progress render their search/input block inside the
 * scroll content, which already carries the column, so they omit `blocks`.
 */
interface ColumnSpec {
  file: string;
  scroll?: number;
  header?: boolean;
  blocks?: boolean;
  rail?: boolean;
  footer?: boolean;
}

const S = "app/(tabs)/sections";
const M = "app/(tabs)/more";
const COLUMN_SCREENS: ColumnSpec[] = [
  { file: `${S}/books.tsx`, scroll: 1, header: true, blocks: true },
  { file: `${S}/prophet.tsx`, scroll: 1, header: true, blocks: true },
  { file: `${S}/queen.tsx`, scroll: 1, header: true, blocks: true },
  { file: `${S}/radio.tsx`, scroll: 1, header: true, blocks: true },
  {
    file: `${S}/scholar.tsx`,
    scroll: 1,
    header: true,
    blocks: true,
    rail: true,
  },
  {
    file: `${S}/reciter.tsx`,
    scroll: 1,
    header: true,
    blocks: true,
    rail: true,
  },
  { file: `${S}/dawah.tsx`, scroll: 1, header: true, blocks: true },
  { file: `${S}/reciter/[id].tsx`, scroll: 1, header: true, blocks: true },
  { file: `${S}/dawah/[month].tsx`, scroll: 1, header: true, blocks: true },
  { file: `${S}/book/[id].tsx`, scroll: 1, header: true, blocks: true },
  { file: `${S}/discussion/index.tsx`, scroll: 1, header: true },
  { file: `${S}/discussion/[lectureId].tsx`, scroll: 1, header: true, blocks: true },
  {
    file: "components/khazain/sections/RailedLectureList.tsx",
    scroll: 1,
    header: true,
    blocks: true,
    rail: true,
  },
  { file: "app/(tabs)/library.tsx", scroll: 1 },
  { file: `${M}/index.tsx`, scroll: 1 },
  { file: `${M}/about.tsx`, scroll: 1, header: true, blocks: true },
  { file: `${M}/archive.tsx`, scroll: 1, header: true },
  { file: `${M}/contact.tsx`, scroll: 1, header: true, blocks: true },
  { file: `${M}/community/index.tsx`, scroll: 1, header: true },
  { file: `${M}/community/guidelines.tsx`, scroll: 1, header: true },
  { file: `${M}/community/create.tsx`, scroll: 1, header: true },
  { file: `${M}/community/join.tsx`, scroll: 1, header: true, blocks: true },
  { file: `${M}/community/group/[id].tsx`, scroll: 1, header: true },
  { file: `${M}/settings.tsx`, scroll: 1 },
  { file: `${M}/settings-progress.tsx`, scroll: 1, header: true },
  { file: "app/settings-about.tsx", scroll: 1 },
  { file: "app/settings-font-size.tsx", scroll: 1, footer: true },
  { file: "app/settings-notifications.tsx", scroll: 1 },
  { file: "app/settings-prayer.tsx", scroll: 1 },
  { file: "app/settings-qiraa.tsx", scroll: 1 },
  { file: "app/settings-reciter.tsx", scroll: 1 },
  { file: "app/settings-wird-goal.tsx", scroll: 1, footer: true },
  { file: "app/settings-wird-reminder.tsx", scroll: 1, footer: true },
  { file: "app/content-search.tsx", scroll: 2, header: true, blocks: true },
];

/** Index just past the `}` that closes the `{` at `open`. */
function closeBrace(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return i + 1;
  }
  throw new Error("unbalanced braces");
}

/** The source of every `<Tag ...>` opening tag, JSX braces respected. */
function openingTags(src: string, tag: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(
    new RegExp(`<${tag}(?:<[^>]*>)?(?=\\s|/|>)`, "g"),
  )) {
    let i = m.index! + m[0].length;
    while (i < src.length && src[i] !== ">")
      i = src[i] === "{" ? closeBrace(src, i) : i + 1;
    out.push(src.slice(m.index!, i + 1));
  }
  return out;
}

/** The `{...}` expression of every `prop={...}` in `source` (whitespace tolerant). */
function propExpressions(source: string, prop: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(
    new RegExp(`(?<![A-Za-z])${prop}=\\{`, "g"),
  )) {
    const open = m.index! + m[0].length - 1;
    out.push(source.slice(open, closeBrace(source, open)));
  }
  return out;
}

const usesColumn = (expr: string) => /\bcolumnStyle\b/.test(expr);

function columnProblems(spec: ColumnSpec, src: string): string[] {
  const problems: string[] = [];
  if (!/useResponsiveLayout|columnStyle/.test(src))
    problems.push("never obtains columnStyle");

  if (spec.scroll !== undefined) {
    const hits = propExpressions(src, "contentContainerStyle").filter(
      usesColumn,
    ).length;
    if (hits < spec.scroll) {
      problems.push(
        `contentContainerStyle carries columnStyle ${hits}x, expected ${spec.scroll}`,
      );
    }
    for (const tag of [
      ...openingTags(src, "ScrollView"),
      ...openingTags(src, "FlatList"),
    ]) {
      if (propExpressions(tag, "style").some(usesColumn)) {
        problems.push(
          "columnStyle is on a ScrollView/FlatList `style`, not its content container",
        );
      }
    }
  }

  if (spec.header) {
    const tags = [
      ...openingTags(src, "InlineHeader"),
      ...openingTags(src, "SegmentTabs"),
    ];
    if (tags.length === 0) problems.push("has no InlineHeader");
    for (const tag of tags) {
      if (!propExpressions(tag, "style").some(usesColumn)) {
        problems.push(
          `header without columnStyle: ${tag.replace(/\s+/g, " ").slice(0, 60)}`,
        );
      }
    }
  }

  if (spec.blocks) {
    for (const tag of openingTags(src, "View")) {
      for (const expr of propExpressions(tag, "style")) {
        if (
          /styles\.(searchBlock|inputRow|stateBlock)\b/.test(expr) &&
          !usesColumn(expr)
        ) {
          problems.push(
            `fixed block outside the scroll misses columnStyle: ${expr}`,
          );
        }
      }
    }
  }

  if (spec.footer) {
    const inner = openingTags(src, "View").some((tag) =>
      propExpressions(tag, "style").some(
        (expr) => /styles\.footerInner\b/.test(expr) && usesColumn(expr),
      ),
    );
    if (!inner) problems.push("footer button is not wrapped in the column");
    const outer = src.match(/^ {2}footer: \{[^}]*\}/m)?.[0] ?? "";
    if (/paddingHorizontal/.test(outer))
      problems.push("footer keeps its own side padding");
  }

  if (spec.rail) {
    if (!/railListGeometry\(/.test(src))
      problems.push("does not call railListGeometry");
    if (!/\brail\.railStyle\b/.test(src))
      problems.push("rail does not use rail.railStyle");
    if (/\[LETTER_INDEX_EDGE\]/.test(src))
      problems.push("rail computes its edge inline");
  }
  return problems;
}

describe("content-search no-results state", () => {
  it("carries columnStyle on noResultsWrap", () => {
    const src = read("app/content-search.tsx");
    expect(src).toMatch(/style=\{\[styles\.noResultsWrap,\s*columnStyle\]\}/);
  });
});

describe("every list screen sits in the tablet reading column", () => {
  it.each(COLUMN_SCREENS.map((s) => [s.file, s] as const))(
    "%s",
    (file, spec) => {
      expect(columnProblems(spec, read(file))).toEqual([]);
    },
  );

  it("the checker rejects a column on the list itself and a bare header", () => {
    const bad = `const { columnStyle } = useResponsiveLayout();
      <FlatList
        style={[styles.a, columnStyle]}
        contentContainerStyle={styles.b}
      />
      <InlineHeader title="x" />`;
    expect(
      columnProblems({ file: "x", scroll: 1, header: true }, bad),
    ).toHaveLength(3);
    const good = `const { columnStyle } = useResponsiveLayout();
      <FlatList
        contentContainerStyle={[
          styles.b,
          columnStyle,
        ]}
      />
      <InlineHeader title="x" style={[columnStyle]} />`;
    expect(
      columnProblems({ file: "x", scroll: 1, header: true }, good),
    ).toEqual([]);
  });
});

describe("the column never lands on a ScrollView's own style", () => {
  // A side border on a ScrollView offsets its content container, and iOS
  // applies that offset twice (RCTScrollViewComponentView takes the frame
  // origin from the children's bounding rect).
  it("SegmentTabs puts the caller's style on a wrapper, not the ScrollView", () => {
    const src = read("components/khazain/primitives/SegmentTabs.tsx");
    const [scroll] = openingTags(src, "ScrollView");
    expect(propExpressions(scroll, "style")).toEqual(["{styles.strip}"]);
    expect(src).toMatch(/<View style=\{style\}>\s*<ScrollView/);
  });
});

describe("iOS page-sheet modals take the column from the sheet, not the window", () => {
  // `presentation: 'modal'` is a page sheet on iPad, narrower than the window
  // the column is computed from. iPadOS already narrows it, so iOS drops the
  // column there (`usePageSheetLayout`); Android shows these full screen.
  const layout = read("app/_layout.tsx");
  const sheets = [
    ...layout.matchAll(
      /name="([^"]+)"\s*options=\{\{[^}]*presentation: 'modal'/g,
    ),
  ]
    .map((m) => m[1])
    .filter((name) => name !== "modal");

  it("finds the page-sheet routes", () => {
    expect(sheets.length).toBeGreaterThanOrEqual(8);
  });

  it.each(sheets)("%s uses usePageSheetLayout", (name) => {
    const src = read(`app/${name}.tsx`);
    expect(src).toMatch(/usePageSheetLayout\(\)/);
    expect(src).not.toMatch(/useResponsiveLayout\(\)/);
  });
});

describe("onboarding keeps its hero full width and its steps in the column", () => {
  it("puts the progress dots and footer in the column", () => {
    const src = read("app/onboarding.tsx");
    expect(src).toMatch(/useResponsiveLayout/);
    expect(src).toMatch(
      /style=\{\[\s*styles\.progressWrap,\s*columnStyle\s*\]\}/,
    );
    expect(src).toMatch(
      /style=\{\[\s*styles\.footerWrap,\s*columnStyle\s*\]\}/,
    );
  });

  it.each(["Qiraa", "Reciter", "Welcome", "Channels"])(
    "%sStep puts its container in the column",
    (name) => {
      const src = read(`components/khazain/onboarding/${name}Step.tsx`);
      expect(src).toMatch(/useResponsiveLayout/);
      expect(src).toMatch(/\{\[\s*styles\.container,\s*columnStyle\s*\]\}/);
    },
  );

  it("leaves the welcome gradient full width and only the content in the column", () => {
    const src = read("components/khazain/onboarding/WelcomeStep.tsx");
    expect(src).toMatch(/style=\{styles\.gradient\}/);
    expect(src).toMatch(
      /contentContainerStyle=\{\[\s*styles\.container,\s*columnStyle\s*\]\}/,
    );
  });
});

describe("railListGeometry", () => {
  it("leaves a phone exactly as authored", () => {
    expect(
      railListGeometry({
        isTablet: false,
        reading: { width: 361, inset: 123 },
      }),
    ).toEqual({
      list: {
        flex: 1,
        paddingLeft: 16,
        paddingRight: RESERVED_COLUMNS.letterRailInset,
      },
      inner: undefined,
      edge: 16,
      railStyle: { right: 16 },
    });
  });

  it("moves the padding inside the column and the rail to its edge on a tablet", () => {
    const g = railListGeometry({
      isTablet: true,
      reading: { width: 720, inset: 24 },
    });
    expect(g.list).toEqual({ flex: 1 });
    expect(g.inner).toEqual({
      paddingLeft: RAIL_EDGE_GUTTER,
      paddingRight: RESERVED_COLUMNS.letterRailInset,
    });
    expect(g.edge).toBe(24 + RAIL_EDGE_GUTTER);
    expect(g.railStyle).toEqual({ right: 24 + RAIL_EDGE_GUTTER });
  });
});
