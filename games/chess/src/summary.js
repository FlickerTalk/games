import { summarize } from "../../../kit/src/table.js";
import { pgn } from "./rules.js";

export function summary(seen, { t, lang, name, icon }) {
  const round = seen.round;
  const end = round?.end;
  if (!end) return summarize(seen, { t, lang, name, icon });
  const number = new Intl.NumberFormat(lang);
  const white = round.starter;
  const winner = end.winner;
  const how = end.k === "resign" ? t("resignation") : t(end.result.reason);
  const n = number.format(Math.ceil(round.state.ply / 2));
  let text =
    winner === null
      ? t("sayDrawn", { game: name, result: t("sayDraw"), how, n })
      : t("sayWin", { game: name, result: t(winner === seen.me ? "sayIWon" : "sayYouWon"), side: t(winner === white ? "white" : "black"), how, n });
  if (seen.rounds.length > 1) {
    text += ` · ${t("score")} ${number.format(seen.score.me)}–${number.format(seen.score.them)}`;
    if (seen.score.draws) text += ` · ${t("sayDraws", { n: number.format(seen.score.draws) })}`;
  }
  const token = winner === null ? "1/2-1/2" : winner === white ? "1-0" : "0-1";
  return `${icon} ${text}\n\n${pgn(round.state, token)}`;
}

export function how(result, t) {
  return result?.reason ? t(result.reason) : "";
}
