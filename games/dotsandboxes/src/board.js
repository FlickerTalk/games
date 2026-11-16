import { TABLETOP_STYLE, canvasBoard } from "../../../kit/src/tabletop/board.js";
import { sideMark } from "./pieces.js";
import { createScene } from "./scene.js";
import { ART, themeFor } from "./theme.js";

const LINE = ".ftg .ftt-layer>button[data-line]";
const PRESSED = "content:\"\";position:absolute;left:50%;top:50%;width:max(44px,100%);height:max(44px,100%);box-sizing:border-box;border:3px solid var(--ink);border-radius:50%;background:color-mix(in srgb,var(--ink) 12%,transparent);transform:translate(-50%,-50%);pointer-events:none";
const LINE_STYLE = `${LINE}{transform:rotate(45deg)}\n${LINE}:not(:disabled):active::after{${PRESSED}}\n@media (hover:hover){${LINE}:not(:disabled):hover::after{${PRESSED}}}`;

export const STYLE = `${TABLETOP_STYLE}\n.ftg{--hue-side-0:${ART.pieces[0].body};--hue-side-1:${ART.pieces[1].body}}\n${LINE_STYLE}`;

export const MARKS = [sideMark(0), sideMark(1)];

export const board = canvasBoard({ theme: themeFor, scene: createScene });
