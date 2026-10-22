import * as fs from "fs";
import * as path from "path";

import {
  miniPlayerColumn,
  noteEditorSheetExtra,
  sheetColumn,
  tabItemStyle,
  tabRowColumn,
} from "@/constants/responsive";
import { headerArtGeometry } from "@/components/khazain/patterns/HeaderArt";

const src = (rel: string) =>
  fs.readFileSync(path.join(__dirname, "..", rel), "utf8");

describe("headerArtGeometry", () => {
  it("keeps the phone styles exactly as they were", () => {
    expect(headerArtGeometry(false, 16)).toEqual({
      tile: { position: "absolute", left: 0, top: 0, right: 0, height: 549 },
      cornerLarge: {
        position: "absolute",
        left: 84,
        top: -17,
        width: 96,
        height: 94,
      },
      cornerSmall: {
        position: "absolute",
        left: 356,
        top: 36,
        width: 37,
        height: 36,
      },
    });
  });

  it("ignores the inset on phones", () => {
    expect(headerArtGeometry(false, 300)).toEqual(headerArtGeometry(false, 16));
  });

  it("anchors the tablet art from the physical right at the page column", () => {
    const g = headerArtGeometry(true, 156);
    expect(g.tile).toEqual({
      position: "absolute",
      top: 0,
      right: 140,
      width: 393,
      height: 549,
    });
    expect(g.cornerLarge).toEqual({
      position: "absolute",
      right: 353,
      top: -17,
      width: 96,
      height: 94,
    });
    expect(g.cornerSmall).toEqual({
      position: "absolute",
      right: 140,
      top: 36,
      width: 37,
      height: 36,
    });
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
    expect(miniPlayerColumn(834, SIDE)).toEqual(column(600));
    expect(tabRowColumn(834, SIDE)).toEqual(column(4 * 96 + 3 * 24));
    expect(tabItemStyle(834)).toEqual({ maxWidth: 96 });
    expect(sheetColumn(834, SIDE)).toEqual(column(600));
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
