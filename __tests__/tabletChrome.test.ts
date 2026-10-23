import * as fs from "fs";
import * as path from "path";

import {
  MINI_PLAYER_MARGIN,
  miniPlayerColumn,
  noteEditorSheetExtra,
  sheetColumn,
  tabItemStyle,
  tabRowColumn,
} from "@/constants/responsive";
import { headerArtGeometry, headerArtInset } from "@/components/khazain/patterns/HeaderArt";

const src = (rel: string) =>
  fs.readFileSync(path.join(__dirname, "..", rel), "utf8");

describe("headerArtGeometry", () => {
  it("ignores the inset on phones", () => {
    expect(headerArtGeometry(false, 300)).toEqual(headerArtGeometry(false, 16));
  });

  it("anchors the tablet art from the physical right at the page column", () => {
    const g = headerArtGeometry(true, 156);
    // Geometry values are pinned in headerArtGeometry.test.tsx.
    expect(g.tile).toMatchObject({ position: "absolute", top: -42.5, right: 140, width: 392, height: 392 });
    expect(g.cornerSmall).toMatchObject({ right: 140, top: 36, width: 37, height: 36 });
    expect(g.cornerLarge).toHaveProperty("right");
  });

  it("defaults the inset to the content edge, 16pt inside the column", () => {
    expect(headerArtInset(140)).toBe(156);
    expect(headerArtInset(140, 99)).toBe(99);
  });

  it("does not stretch the tablet tile", () => {
    const g = headerArtGeometry(true, 156);
    expect(g.tile).not.toHaveProperty("left");
  });
});

const SIDE = { left: 0, right: 44 };
const column = (maxWidth: number) => ({
  width: "100%",
  maxWidth,
  alignSelf: "center",
  marginLeft: 0,
  marginRight: 44,
});

describe("tablet chrome styles", () => {
  it("are undefined on phones", () => {
    expect(miniPlayerColumn(393, SIDE)).toBeUndefined();
    expect(tabRowColumn(393, SIDE)).toBeUndefined();
    expect(tabItemStyle(393)).toBeUndefined();
    expect(sheetColumn(393, SIDE)).toBeUndefined();
    expect(noteEditorSheetExtra(393, 852)).toBeUndefined();
  });

  it("size the tablet chrome", () => {
    expect(miniPlayerColumn(834, SIDE)).toEqual({
      ...column(600),
      marginLeft: MINI_PLAYER_MARGIN,
    });
    expect(tabRowColumn(834, SIDE)).toEqual(column(4 * 96 + 3 * 24));
    expect(tabItemStyle(834)).toEqual({ maxWidth: 96 });
    expect(sheetColumn(834, SIDE)).toEqual(column(600));
  });

  it("keeps the MiniPlayer's own margin where the insets are smaller", () => {
    const zero = { left: 0, right: 0 };
    expect(miniPlayerColumn(600, zero)).toMatchObject({ marginLeft: 10, marginRight: 10 });
    const wide = { left: 30, right: 30 };
    expect(miniPlayerColumn(700, wide)).toMatchObject({ marginLeft: 30, marginRight: 30 });
    expect(tabRowColumn(600, zero)).toMatchObject({ marginLeft: 0, marginRight: 0 });
    expect(sheetColumn(600, zero)).toMatchObject({ marginLeft: 0, marginRight: 0 });
  });

  it("floors the note editor height at 420 on a tall tablet", () => {
    expect(noteEditorSheetExtra(834, 1194)).toEqual({ minHeight: 420 });
    expect(noteEditorSheetExtra(834, 600)).toEqual({ minHeight: 300 });
  });
});

describe("tablet chrome wiring", () => {
  it.each([
    [
      "components/khazain/primitives/CustomTabBar.tsx",
      ["miniPlayerColumn", "tabRowColumn", "tabItemStyle"],
    ],
    ["components/khazain/sheets/SheetShell.tsx", ["sheetColumn"]],
    ["app/note-editor.tsx", ["sheetColumn", "noteEditorSheetExtra"]],
    ["app/notes-viewer.tsx", ["sheetColumn"]],
  ])("%s uses the helpers", (file, names) => {
    const s = src(file);
    for (const n of names) expect(s).toContain(`${n}(`);
  });
});
