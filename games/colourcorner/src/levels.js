import { defineProgress } from "../../../kit/src/progress/index.js";
import { FREE_PAGES, PAGE_ORDER } from "./pages.js";

export const PROGRESS = defineProgress({ gifts: { looks: [...PAGE_ORDER], free: FREE_PAGES } });

export const openPages = (record) => PROGRESS.owned(record);

export function finishPicture(record) {
  const { record: next, gift } = PROGRESS.awardRound(record, { won: true });
  return { record: next, gift };
}
