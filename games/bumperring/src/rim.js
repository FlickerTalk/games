import { withRim } from "../../../kit/src/canvas/pen.js";

export const rimmed = (ctx, theme, draw) => withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, draw);
