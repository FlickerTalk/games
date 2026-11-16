import { TABLETOP_STYLE, canvasBoard } from "../../../kit/src/tabletop/board.js";
import { sideMark } from "./pieces.js";
import { createScene } from "./scene.js";
import { ART, themeFor } from "./theme.js";

export const STYLE = `${TABLETOP_STYLE}\n.ftg{--hue-side-0:${ART.sides[0]};--hue-side-1:${ART.sides[1]}}\n.ftc-rim{stroke:var(--muted)}`;

export const SIDES = [sideMark(0), sideMark(1)];

export const board = canvasBoard({ theme: themeFor, scene: createScene });
