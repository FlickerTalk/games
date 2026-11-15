# FlickerTalk games

Board games for [FlickerTalk](https://flickertalk.com), played between the two phones of a
conversation. Each game is its own package of the signed plugin catalogue: a web component that runs
in an isolated frame, without network access, and talks to the same game on the other phone over the
conversation's direct, end-to-end encrypted connection.

**Privacy.** Matches are played over the direct connection between the two phones, encrypted, and are
stored only on them. A game sees its own matches and nothing else: not the conversation, not who the
contact is, not the network. Starting or entering a match may wake the other phone with a push that
carries no content, and the result only reaches the chat if the user sends it. A match against the
phone itself never leaves it.

## Layout

```
kit/                      shared code, compiled INTO each game's dist/index.js (not a package)
  src/                    envelope, commit–reveal, match, storage, table (live session), shell, texts
  src/live/               the real-time part: session, wire, pace, follow, the page (arena) and its texts
  build.js                buildGame(): one game folder → its dist/
  test/                   the kit's tests, and helpers.js for every game's tests
games/<name>/             one catalogue package per game
  module.json             what the catalogue reads (kind "game", live + send only)
  THIRD_PARTY_NOTICES.md  copied into dist/ by the build
  build.js                optional: `export const plugins = [...]`, esbuild plugins for this game's build
  src/                    rules.js, board.js (+ board.css), texts.js, index.js, robot.js (optional)
  dist/                   built and committed: index.js + THIRD_PARTY_NOTICES.md
  test/
preview/                  two phones side by side for review, and their screenshots
build.js                  npm run build: every game's dist/
```

The catalogue packs `module.json` and `dist/` of each `games/<name>/` folder, exactly as it packs a
plugin repository.

## Commands

```sh
npm install
npm test              # Vitest + happy-dom: the kit, every game, the preview server
npm run build         # rebuilds every games/*/dist/ (node build.js chess: just one)
npm run licenses      # production dependencies must be MIT, BSD, Apache-2.0, ISC or 0BSD
npm run preview       # http://127.0.0.1:5178/?game=tictactoe  (&lang=ar, &dark, &layout=tablet, &solo)
npm run shots         # screenshots of every game to /private/tmp/ftgames-shots/<game>/
npm run frame         # chess in Chromium inside the preview's frame: pieces drawn, tap, drag, promotion, no network
npm run bar           # the game's bar in Chromium and WebKit, in Ionic's md and ios modes: title and score inside it, clear of its buttons
npm run room          # every game, in every state, in the app's game room on two phone sizes (npm run room -- gomoku: just one)
npm run theme         # the games in the app's colours in Chromium, and in their own palette without them
npm run fill          # five games entering and leaving full screen mid-match at four frame sizes (npm run fill -- chess: just one)
```

`frame`, `room`, `bar`, `theme` and `fill` run the built packages (`frame` reads `games/chess/dist/`), so run
`npm run build` before them.

`dist/` is committed: after changing `src/` or the kit, run `npm run build` and commit what changed.
The build is deterministic, so a game whose sources and kit did not change gives the same bytes and
`git diff` says exactly which packages change. CI runs the licences, the tests and the build, and fails
if the build does not give back the committed `dist/`.

## Adding a game

1. `games/<name>/module.json`, copied from Tic-Tac-Toe: `id` `com.flickertalk.game.<name>`, `name`
   (English), `components: ["ft-<name>"]`, `version` `1.0.0`. Keep `kind: "game"`,
   `minCoreVersion: "1.6.0"` and `permissions: { "live": true, "send": "propose" }` — the app refuses a
   game that asks for anything else. Add `locales` (plugin-sdk's `module.schema.json`): the `name` and
   `summary` in the app's other 20 languages, the name being the game's own `TEXTS.<lang>.name`, so
   the app shows them in the phone's language (`checkLocales` checks them).
2. `games/<name>/THIRD_PARTY_NOTICES.md`: the full licence text (and Apache `NOTICE`) of everything
   bundled from elsewhere. Every game carries at least the kit's icons (Ionicons, MIT: copy the
   section from Tic-Tac-Toe's). Runtime dependencies go in the root `package.json` `dependencies`,
   where `npm run licenses` checks them.
3. `src/rules.js`, `src/board.js`, `src/texts.js` and `src/index.js` (below).
4. Tests in `games/<name>/test/`: the rules, the board and texts, the package (copy Tic-Tac-Toe's
   `package.test.js` and set your size cap), and two phones playing (copy `play.test.js`). A game with
   a `robot` also plays whole rounds against itself and against any legal move (copy Four in a Row's
   `robot.test.js`).
5. `npm run build`, and a line in `preview/shots.js` (`PLAYS`) so `npm run shots` can play it.

## A game

A game is a plain object handed to `defineGame`. The kit does everything else: the list of matches
kept on this phone, the other phone, the coin that says who starts, turns, resigning, the series score,
saving, the result in the chat, the honest messages, light and dark, right to left.

```js
// games/tictactoe/src/index.js
import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { board, MARKS, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";

defineGame({ id: "tictactoe", gv: 1, tag: manifest.components[0], app: manifest.version, icon: "⭕",
  initial, turn, play, result, board, sides: MARKS, style: STYLE, texts: TEXTS });
```

| Field | What it is |
| --- | --- |
| `id` | The game's name in the protocol (`g`); never changes. |
| `gv` | Version of the rules and of the move format. A phone that receives a higher `gv` applies nothing and asks the user to update. Raise it only for an incompatible change. |
| `tag`, `app` | The component name and the version, from `module.json`. |
| `icon` | One emoji, used in the summary sent to the chat. |
| `initial()` | The state of a new round. |
| `turn(state)` | The side to move: `0` (the side that started the round) or `1`. |
| `play(state, move, side)` | `{ state }` with a **new** state, or `{ error }` when the move is malformed, illegal, out of turn, or the round is over. Never mutates `state`; may throw (treated as an error). |
| `result(state)` | `null` while the round goes on; else `{ winner: 0 \| 1 \| null, ... }` (`null` is a draw). Extra fields (e.g. the winning `line`) reach the board. |
| `board` | `{ mount(host, context) → { update(context) } }`, below. |
| `texts` | `{ lang: { key: text } }` with at least `name` (the game's name in each language). |
| `sides` | Optional: two HTML snippets (trusted, the game's own), the marks of side 0 and side 1, shown on the players' chips and the turn line. |
| `style` | Optional: CSS text added to the page once (import a `.css` file: the build passes it as text). |
| `minBoard` | Optional: the smallest board, in CSS pixels, on which the game is playable (Chess 320: squares of 40 px; Four in a Row 308: columns of 44 px). In a game in the room the kit makes room for it before anything else; while waiting or on the result the board may be smaller, and in full screen it may be smaller when the frame is too short (see "Full screen"). Default 200. |
| `how(result, t)` | Optional: why a round ended by the rules, in the game's words (“checkmate”, “stalemate”), shown with the result; `result` is what `result(state)` returned. |
| `summary(view, { t, lang, name, icon, record })` | Optional: the text sent to the chat. Without it: `⭕ Tic-Tac-Toe: I won, 3–2 · draws: 1`, in the sender's language. |
| `robot` | Optional: lets the user play against their own phone (see "Playing against the phone"). `{ moves(state, side), score(state, side) }` for the kit's search, with optional `depth`, `budgetMs` and `slack`; or `{ move(state, side, memory, random, { lang }) }` for a game that finds its own moves, with an optional `unseen(state)` for the steps the board does not show. Without it the game is played between two people only. |

A **move** is a JSON number or a short string (≤ 64 characters): a cell index, a column, `e7e8q`.
Rules are run on both phones from the first move every time something arrives, so they must be pure
and deterministic.

### The board

On a phone the game lives in the conversation's room, between the app's game bar and its composer,
and the whole page fits it without scrolling: everything else of a state (bar, chips, the result's
actions) is laid out above the board, and the board, square, takes what is left of the room. What
the user is told (whose turn it is, how a round ended, a notice) is one line in a band of its own
under the bar, always as tall, so nothing above the board ever moves and nothing covers the bar (see
"Notices"). The room is the screen's height less the app's chrome, `ROOM_CHROME` in
`kit/src/stage.js` (297 px, measured on a Samsung S20+): the one number to change when the app's
room changes. In the room the frame is as tall as the game, so its own height says nothing about
the room: the kit never reads it there. When even the game's `minBoard` does not fit, the players'
chips go first. On a frame 720 px wide or more the board stands beside the players. A board must
draw inside the square it is given, whatever its size, and follow it when it changes (container
units, or measuring on every `update`, never once at `mount`). `npm run room` checks every game in
every state on a 384×853 and a 360×740 phone, in German and Spanish.

**Full screen.** The app can give the game its whole window (the full-screen button of the game
room, and its own page for a game): it says `fill: true` and the frame's root gets `data-fill`, the
frame as tall and wide as it is given; `fill: false` takes it back, the frame following the game
again. The page is not reloaded: the kit watches `data-fill` and the frame's size and lays the
match out again where it is, in either direction. In full screen the board is sized from what the
frame measures: its height less the kit's own rows (bar, band, players, the result's actions),
never `ROOM_CHROME`, no wider than the frame and no larger than 720 px (`MAX_BOARD`). A frame wider
than tall puts the board beside the players, as tall as the frame under the band. Nothing ever
scrolls: when the frame is too short for the game's `minBoard`, the players' chips go first and then
the board shrinks under `minBoard`, down to 120 px. A phone held sideways (an 844×338 frame) gives
214 px, under every game's `minBoard`: in full screen a game must stay playable on a board that small,
its controls kept and only what it can spare hidden. `npm run fill` checks five games at 360×588,
390×792, 844×338 and 1280×748 entering and leaving full screen in the middle of a match (`npm run fill
-- <game>…` for others); the preview has a full-screen button on each phone.

**The page is Ionic's.** Since app 1.6.0 the app lends Ionic to every plugin frame (all of
`@ionic/core`'s components and its stylesheet but for `structure.css`'s body rules, loaded before the
game's module; the root says `data-ionic`, `mode`, `dir` and `lang`), and the kit draws with it: an
`ion-header` with its `ion-toolbar` (the list's title and a new match; in a match the way back, the
score and the actions) and a second toolbar under it, the band where the user is told things, then
an `ion-content` that does not scroll and holds the players, the result and the board. The kit's actions are `ion-button`s and its one question (delete a match, resign a
round) is an `ion-alert`, which Ionic shows over the page in the frame's body. In the game room the
frame is as tall as its content, so an overlay is placed within it: the kit keeps the alert for what
the user must answer, and says everything else in its band under the bar. Header, toolbars and
content are made once and patched, so an Ionic component is never drawn again for nothing. Ionic's
content has no height of its own: the kit gives it that of what it holds, so the frame, as tall as its
content, still follows it. Ionic's components keep Ionic's own box sizing: the kit's `box-sizing` rule
reaches only what the kit draws. In `ios` mode (the iPhone) Ionic's title spans the whole toolbar,
centred, with room for the buttons on either side, and that only holds with its own `border-box`;
`npm run bar` checks the bar in both modes. A package never carries Ionic (each game's package test checks its `dist/`);
the games ask for core 1.6.0, the first one that lends it. A board is not touched by any of this: it
draws what it likes in its square, and its buttons are its own.

`board.mount(host, context)` is called once when a match opens; `update(context)` after every change
(a move from either side, a new round, a message); `destroy()`, if the board has it, when the match
leaves the screen or the game closes, to let go of listeners and timers. The board draws into `host` (light DOM: no shadow
root, so a library that needs `document` or `<use href="#id">` works) and never talks to the other
phone. `host` is always `dir="ltr"`: boards are not mirrored in Arabic.

**Icons.** The interface draws no emoji: its icons are [Ionicons](https://ionic.io/ionicons) (MIT), the
outline set the app itself uses, copied unchanged into `kit/src/icons.js` (only the ones drawn; a test
checks each against the `ionicons` package, a development dependency). `icon(name)`, exported by the
kit, gives one as inline SVG in `currentColor`, sized `1.2em` by the text around it and hidden from
screen readers (the button's translated label says what it does). A board marks things with it too
(`icon("time-outline")` on a move still on its way). A text that names a control draws it:
`{invite}` in `howToInvite` becomes the app's mail button. Emoji stay only in what goes to the chat
(the summary) and in a game's own `icon` field. To add one: copy its file's drawing from
`node_modules/ionicons/dist/svg/` into `ICONS`.

| `context` | |
| --- | --- |
| `state` | The round's state, from the rules. |
| `canPlay` | Whether a move by the user would be taken now (their turn, live, nothing in dispute). |
| `play(move)` | Hand the user's move to the kit, which checks it with the rules, saves it, then sends it. |
| `mySide` | `0` or `1` in this round, or `null` before the coin. |
| `last` | The last move of the round, or `null`. |
| `pending` | Whether the user's last move has not been confirmed by the other phone yet (draw it 🕓). |
| `result` | When the round has ended by the rules: `{ k: "rules", winner, result }`; else `null`. |
| `t(key, vars)`, `lang` | The texts, in the user's language; numbers and dates through `Intl`. |
| `view` | Everything the shell knows (phase, rounds, score…), for boards that need more. |
| `notify(text)` | Tell the user something that passes (a word refused, a seed lost): the kit's line under the bar, gone after a few seconds. Never draw such a line inside the board, where it would move the rest. |

**Notices.** One line at a time, in a band of its own right under the bar: a new one takes the last
one's place. The standing line (whose turn it is, why nothing can be played, how a round ended) stays
for as long as it holds; a notice or a board's `notify` passes after four seconds, then the standing
line comes back; the end of a round cuts a passing one short. The kit draws it in the frame on every
app (`role="status"`, `aria-live="polite"`): the band is a second `ion-toolbar` in the header, there
from the first screen on and always as tall (`--ftg-band`), and it takes no taps. It never hands the
text to the app's toast (the Plugin API's `ft.notify`, app 1.4.1): that one floats over the top of
the frame, which is where the bar is, and on Android it covered the way back and the resignation and
took their taps. "Try again" is a button
in the toolbar; a choice that has to be made (two phones that parted ways, a match the other person
started) is a card over the board; a question before something that cannot be undone is Ionic's alert.

`ctx.last` and the moves in `view.round.moves` come from the other phone: they have passed the game's
`play` and nothing else. A board never puts them into markup unescaped (use them as numbers, look them up,
or escape them). The kit calls `update` after every change, so a board that rewrites its whole markup there
restarts its animations each time; patch what changed instead (Four in a Row does).

Touch targets must be at least 44 px. The kit's CSS variables are there to be used: `--ink`, `--muted`,
`--paper`, `--surface`, `--surface-2`, `--line`, `--side-0`, `--side-1` (one colour per side, the app's
own accents), light and dark.

### Colours

The app sets Ionic's variables on the frame's root and keeps them in step with its theme (its three
directions, light and dark), with `data-dark` beside them. The kit's tokens read them:
`--ink` (`--ion-text-color`), `--paper` (`--ion-background-color`), `--line` (`--ion-border-color`),
`--primary` / `--on-primary` (`--ion-color-primary` / `-contrast`), `--good` (`--ion-color-success`),
`--danger` (`--ion-color-danger`). Secondary text (`--muted`) is the app's `--ion-color-medium` where
the kit measures it at 4.5:1 or more on the page and on the surface (the app's dark themes), and a mix
of ink and paper elsewhere. Surfaces (`--surface`, `--surface-2`) are mixed from ink and paper rather
than taken from `--ion-item-background`, because in mono light the app's card surface is the page
colour itself, and rows and chips would vanish white on white. The warning and `--side-0` / `--side-1`
(one colour per side) are mixed the same way, so they read on every theme.

- **Precedence**: with the app's variables present, they rule; nothing else applies a palette (the
  kit marks its root `data-themed` and ignores the system's dark mode). Without them, the kit's own
  palette applies: dark when the app says `data-dark`, or when the system is dark.
- A board uses the tokens for everything around its art, and writes its art's own colours (chess
  squares, markers) as `--art-*` tokens. A test fails on any other colour literal in the CSS.
- `npm run theme` checks this in Chromium; the preview has a theme selector (`?theme=ember-dark`…).

### Texts

`src/texts.js` exports only data: `export const TEXTS = { en: { name: "Tic-Tac-Toe", ... }, es: {...}, ... }`
in the 21 languages of the app (`en es fr de it pt ro pl ru uk tr ar hi bn id vi th ja ko zh-CN zh-TW`),
English as the source, real translations. A game's keys may not reuse the kit's. The build writes a
`texts.js` with each key once (the languages would otherwise repeat every key 21 times) and refuses one
that holds anything but texts. `checkTexts(joinTexts(KIT_TEXTS, TEXTS))` checks every language has the
same keys and `{gaps}`.

A text may have its own wording for a match against the phone: the same key with `Solo` after it
(`theyStartSolo`), in every language, naming the other side FlickerTalk (a name, never translated). In
such a match the kit's `t` gives that wording instead, to the kit's own screens and to the board alike;
in a match with a person it gives the shared one. Add one only where the shared text speaks of another
person: the kit has three (`themSolo`, `theyStartSolo`, `confirmResignSolo`), Word Duel two
(`secretHintSolo`, `secretWaitSolo`). `checkTexts` refuses a `Solo` key without its shared one.

## The match

A match is a **series** of rounds between two participants, kept on each phone as one record,
`game/<chat>/<id>` in the plugin's `records` (see below), rewritten on every change (a plugin is never told it is being
closed). Its shared part travels whole in every message that carries a game:

```json
{ "a": "<who>", "b": "<who>", "first": "<who>", "toss": { "c": "<hex>", "s": "<hex>", "r": "<hex>" },
  "moves": [4, 0, 2, 1, 6, { "x": "next" }, 0, { "x": "resign", "by": "<who>" }], "end": null }
```

- `a` started the match, `b` joined it; each is a random id per participant **per match**.
- `moves` holds the moves of every round in order, plus `{ "x": "resign", "by" }` (ends the round, the
  other side wins it) and `{ "x": "next" }` (a new round, once the last one ended; the side that did not
  start the last round starts it). Who made each move follows from the rules' `turn`. A received event
  is rebuilt to exactly one of these forms: a move is a finite number or a string of 1 to 64
  characters, and an object with any other field is refused.
- `first` is who starts round 0; it is derived from `toss` and recomputed, never trusted.
- `end` ends the whole match without a winner: `{ "k": "abandoned" | "invalid", "by" }` (the coin). Only
  `b`'s phone ends a match, and only against `a`: `invalid` when the reveal does not check out (kept on
  `b`'s phone), `abandoned` when the reveal does not come within 30 s of the seed. From the wire, `a`'s
  phone takes `{ "k": "abandoned", "by": a }` while it has not revealed, and nothing else; once the coin
  has spoken, no message can void the match. A reveal that arrives after `b` gave up and checks out
  settles the coin and the match goes on.

Nothing received is trusted: the coin is checked against its commitment and the moves are replayed
through the rules from the first one. A series whose message would pass 40,000 bytes stops there (“start
a new match”), so a message never has to be cut: the core carries 48 KiB at most; a received game larger
than 40,000 bytes is refused whole.

### A match belongs to its conversation

`onOpen` gives the game `chat`: an id for the conversation it is open in — opaque, at most 43 characters
of `[A-Za-z0-9_-]`, stable for this phone, this plugin and this contact, different on each phone and for
each plugin, and absent when the game is not opened from a conversation. It is local: the kit never puts
it in a message (a test scans every message sent).

- Matches are kept under `game/<chat>/<id>` (at most 5 + 43 + 1 + 64 = 113 bytes; the core allows 128).
  The list shows only this conversation's matches; opening, joining, deleting and everything that
  arrives look only inside this conversation's partition. The same match id may exist in two
  conversations: they are two matches.
- Without `chat` (opened from Settings, or an app that does not give it) no match is shown, started or
  played, and the user is told to open the game from a conversation. There is no shared place to fall
  back on.
- The core authenticates and encrypts `ft.live` per contact, so whatever arrives while the game is open
  in a chat comes from that chat's contact. Participant ids are not secrets: they only say which of the
  two seats is which.

### Playing against the phone

The app opens a game in the conversation of its built-in FlickerTalk contact with `solo: true` in
`onOpen`, `live: false` and that conversation's `chat`; the game is not told who the contact is. When the
game has a `robot`, the kit plays the other seat on the phone itself: the same rules, the same match
record and the same screen as a match between two people.

- Nothing goes over the live channel. In a match against the phone the kit never calls `ft.live.send`
  (a test pins it: a send would wake a real device by push), and it ignores whatever arrives while the
  game is open this way. Even if an app said `live: true` as well, `solo` wins and nothing is sent.
- A new match puts the phone in seat `b` (a fresh id), draws `first` on the phone (no coin toss) and is
  kept, as always, at `game/<chat>/<id>`, marked `solo` so that it opens again as one. Matches against
  the phone are listed only when the game is open with `solo`, matches with a person only without it,
  and a message naming a match against the phone is answered as if it did not exist.
- The other side is called FlickerTalk, the contact the user sees: on its chip, when it starts, and in
  the question before resigning (see "Texts"). The user's moves are saved at once and never shown as
  pending, and there is no "send the result to the chat". While it is the phone's turn the band under
  the bar says it is thinking. After a short wait (600 ms, so the user can follow each move on the
  board) the kit asks for the phone's move, checks it with the rules like any other, saves it, and lets
  the phone play again if the rules give it another turn. A step the user does not see (a commitment,
  a seed, a reveal) is taken at once, without the wait, when the game's `robot.unseen(state)` says so
  for the state the phone is to play in: in Backgammon the phone's turn is one wait per checker it
  moves, the dice rolled at once. "Play again" starts the next round. Closing the game and opening it
  again goes on where it was, the phone playing if it is its turn.
- `robot.moves(state, side)` lists the moves of the side to play, the likely best first (the search
  goes faster); `robot.score(state, side)` says how good a position that has not ended is for `side`
  (positive is good, `0` is even). The kit searches with alpha–beta, `depth` moves ahead (default 4),
  on the main thread (the frame allows no workers), and stops after `budgetMs` (default 300) with the
  best move it has found so far. A round won or lost counts as ±1,000,000, so `score` stays well below
  that. Moves within `slack` of the best (default 0) are picked at random, so the phone does not
  always play the same game. There is one level: the phone plays well and can be beaten.
- A game with secrets or chance of its own (a hidden fleet, dice) gives `robot.move(state, side,
  memory, random, { lang })` instead, which returns the move: `memory` is a plain JSON object kept with
  the match (the phone's secrets go there), `random()` a number in [0, 1), and `lang` the language the
  game is shown in, for a round played in a language of its own (Word Duel, Letter Grid). Such a game
  may also give `robot.unseen(state)`, true when the phone's next step is one the board does not show
  (Backgammon: `state.dice === null`, the roll).
- The phone decides only from what its seat could know: `state` and its own `memory`. Where `state`
  holds more than a seat may see, it leaves it alone: in Crazy Eights both phones work out the whole
  deal, so the user's hand and the order of the stock are there, and the phone never reads them. Its
  commitments are made and revealed exactly as a person's are, and the rules check them the same way.
- A game whose `play` is too costly to call thousands of times gives `robot.move` too, and runs the
  kit's `search` (from `kit/src/robot.js`) over positions of its own. Chess does: its rules keep every
  position they have seen, so the search uses light positions made from their parent's FEN only when
  it reaches them.
- `solo` outside a conversation, or for a game without `robot`, changes nothing: the game says to open
  it from a conversation, as before. An app that does not send `solo`, and a game that does not read
  it, stay as they were.

What another contact B of the user can do, and what it cannot:

- B reaches only the matches the user plays with B. A message naming any other match id — one the user
  plays with C, or one that does not exist — is unknown in B's conversation and gets exactly the same
  answer: `deny` for a `hello` that is not an invitation, `busy` for an invitation while the user is in a
  match, a new match with B for an invitation otherwise, and silence for anything else. B learns nothing
  of the user's other conversations, cannot open, change or delete their matches, and cannot tell
  whether a match id exists in them.
- In its own matches with the user, B is held by the same checks as anyone: moves replayed through the
  rules, no move or resignation for the user's seat, the coin against its commitment, ends only as the kit
  makes them, events rebuilt to their exact form, nothing larger than 40,000 bytes.
- B can still be a nuisance in its own conversation: send invitations (each one, when the user has the
  game open on its list, opens a new match with B, which the user can delete), stop playing, or walk away
  from the coin (below).

## Real-time games

The kit also carries a real-time part, `kit/src/live/`, for games where both phones play at once (a
race, a duel) instead of taking turns. It is compiled into a game only if the game imports it; the
turn-based games do not, so their bundles do not change. It knows nothing about the game itself: no
track, no laps, no car. Each phone simulates only its own player and tells the other phone where it
is; nothing the other phone simulates is trusted except its own finish time, accepted between
contacts.

```js
import manifest from "../module.json";
import { Follow, defineLiveGame } from "../../../kit/src/live/index.js";

defineLiveGame({
  id: "racer", gv: 1, tag: manifest.components[0], app: manifest.version,
  aspect: 1.2,                                   // width / height of the view
  check: (s) => (Number.isFinite(s?.x) && Number.isFinite(s?.y) ? { x: s.x, y: s.y } : null),
  texts: TEXTS,                                  // name, soloIntro, liveIntro in the 21 languages
  stage: {
    mount({ view, left, right }, ctx) {          // ctx: session, solo, lang, t, random, dark()
      const other = new Follow();
      return {
        reset(seat) { /* a new race: put the players on the start, `seat` 0 or 1 */ },
        heard(state, t, at) { other.push(state, t, at); },
        frame(now) {
          const { session } = ctx;
          // step the user's player (fixed timestep), then:
          if (session.phase === "running") session.run(myClock, { x, y }, now);
          // when it crosses the line: session.finish(myClock)
          // solo: drive the rival on the phone, then session.rival(rivalClock, rivalFinish ?? null)
          // draw: yours, and other.at(now) (or the rival)
        },
        resize(width, height) {}, status: () => "", destroy() {},
      };
    },
  },
});
```

- **The page** (`arena.js`) is the turn-based games' look: Ionic's bar and the notice band under it,
  then the game's view and two clusters of controls (`left`, `right`), under the view or on both
  sides of it, whichever leaves the view larger. It measures its own element and follows every
  resize, in a conversation's room (the view takes the width, up to 480 px) and full screen
  (`html[data-fill]`: it fills what it measures) alike, in the middle of a race too: `resize` is
  called, never `reset`. It shows what to do in each phase (start, waiting, the other is ready, the
  countdown, the result with both times, the other left) and keeps the best time and the tally of
  the conversation at `best/<chat>` in `records`. Arabic is right to left; the view and the controls
  never are.
- **The session** (`session.js`) moves through `idle`, `waiting` (this phone said hello), `lobby`
  (both phones are here, `ready.me` / `ready.them`), `countdown`, `running`, `finished` (this phone
  crossed the line, the other has not said yet), `over` (`result`: `won`, `mine`, `theirs`) and
  `left` (`notice`: `left`, `unreachable` or `silent`). `start()` is the user's start, again or
  retry; `tick(now)`, `run(t, state, now)` and `finish(t)` are the game's, every frame; `stop()` says
  bye. Whoever finishes in less time on their own clock wins, the same on both phones; an exact tie
  goes to the smaller participant id. The phone still going stops as soon as it cannot win.
- **Against the phone** (`solo` in `onOpen`): the session never touches `ft.live`, and the game
  drives the rival itself and reports it with `rival(t, finish)`.
- **Talking**: nothing is sent when the game opens. The user's start sends `hello`; a phone with the
  game open answers it (`re`), which is how the first one learns the other is there. Both start →
  the phone with the smaller id sends `go` and both count down 3 s. While running, a phone sends its
  state at most every 83 ms (about 12 a second) and only once the core took the last one. The first
  message the core refuses ends it: `left` with `unreachable`, and nothing more is sent until the
  user starts again (a send without a connection wakes the other phone by push). No answer to a
  `hello` in 8 s says the other person does not have the game open; nothing from the other phone in
  6 s of a race says it stopped answering. Neither is retried by itself.
- **Drawing the other phone** (`follow.js`): `Follow` keeps the last three states, shows them 100 ms
  behind the other phone's clock (estimated from the fastest arrival), between the two around that
  moment, carries the last movement on for at most 250 ms when nothing new comes, and after a stall
  jumps to the newest state instead of playing back what piled up. Numbers are blended, angles the
  short way round (`angles: ["a"]`), anything else is taken from the newer state.

| `k` | Carries | |
| --- | --- | --- |
| `hello` | `ready`, `re`, `app` | the user started or joined; `re` answers one |
| `ready` | — | the user started, the other is already here |
| `go` | `ms` (0–10,000) | from the phone with the smaller id: count down this long |
| `tick` | `t` (ms of this phone's race), `s` (the game's state) | at most every 83 ms while running |
| `done` | `t` (ms), or `null` | crossed the line in `t`, or stopped without (it cannot win) |
| `bye` | — | the game is closing in the middle of something |

The envelope is the turn-based games' (`p`, `kv`, `g`, `gv`, `doc` — this race — and `who`), with
these kinds of its own: a turn-based game never reads them, and a real-time game never reads the
turn-based ones. Everything received is rebuilt to exactly these fields: a malformed message, another
game, another race, a stranger's id or a value out of range is ignored, and `s` is whatever the game's
`check(s)` returns (`null` or a throw ignores the tick). A tick is at most 1 KB decoded; with a small
state it is about 150 bytes of base64. A phone with a higher `gv` or `kv` is not read: the user is
told to update.

## Protocol

Over `ft.live`, which the core carries only over the direct connection, only to the same plugin open in
the same conversation, never through the mailbox or the server. Every message is JSON, UTF-8, base64:

```json
{ "p": "ftgame", "kv": 1, "g": "tictactoe", "gv": 1, "k": "state", "doc": "<match>", "who": "<sender>",
  "app": "1.0.0", "game": { ... } }
```

| `k` | Carries | Answered with |
| --- | --- | --- |
| `hello` | `game` | `sync`, or the next coin step. Sent when the user starts or enters a match, never just because the game opened (a message without a connection wakes the other phone). Re-sends anything pending. A `hello` whose game has nobody in seat `b` is an invitation. |
| `state` | `game` | `sync` — after the user's own move, resignation or new round. |
| `commit`, `seed`, `reveal` | `game` | The next coin step, or `sync`. |
| `sync` | `game` | Nothing, unless it changed what this phone has, or the two copies just parted ways (then `sync`). This is the acknowledgment; it carries anything pending. |
| `busy` | — | The other phone is in another match: it asked its user to join (“📥 Join”). |
| `deny` | — | A `hello` with a game that is not an invitation, or an invitation for a match this phone already keeps. |
| `bye` | — | The user left the match screen (best effort: closing the plugin sends nothing). |
| `part` | reserved | Not sent by `kv` 1 (see the 40,000-byte cap above). |

- Unknown `p`, another `g`, malformed messages and unknown kinds or fields are ignored. A `kv` or `gv`
  higher than this phone's is not applied: the user is told to update. A newer kit keeps speaking `kv` 1
  to a phone that speaks `kv` 1.
- `doc` and `who` are plain ids (`[A-Za-z0-9_-]{1,64}`); `doc` becomes a record key.
- **Merging** what arrives: if this phone's moves are the beginning of the other's, the new ones are
  taken (each checked: legal, and made by the other participant — never a move for this phone); equal,
  nothing; this phone ahead, it answers with what it has; neither (they parted ways: a resignation and a
  move crossed), both are kept and the user picks which goes on.
- **Honest absence**: `live.send` answering `true` does not mean anyone heard. A `hello`, `state` or coin
  step that gets no answer within 8 s means “👤 the other person does not have the game open in this
  conversation”; `false` from the core means “📵 the other phone cannot be reached”. A move that was not
  acknowledged stays 🕓 pending and goes again with the next `hello`. While the user waits in a match, the
  kit says `hello` again every 15 s (8 times at most), and only after the core took the last message:
  over a channel that is down, that would wake the other phone.
- **Arriving**: a phone with the game open on its list that hears a `hello` opens the match (joining it,
  if it is an invitation); busy in another match, it asks its user. A match kept here, even one this kit
  cannot read, is never joined again.
- **A lost first answer**: if the joiner's first `sync` never arrives, the inviter keeps saying its
  invitation `hello`; the joiner answers it again (it already holds the match), and the inviter learns who
  joined. The joiner's own `hello` does the same.
- **Disagreeing on a move**: a phone that finds a move it cannot accept says so once, answering a
  `hello` or `state` with `sync` marked `"refused": true`; it shows “a move that breaks the rules”, and the
  other phone shows both copies and lets the user pick. Neither answers a `sync` with another `sync`, so
  the exchange ends.

### Who starts: commit and reveal

The coin uses only SHA-256 from WebCrypto (`crypto.subtle.digest`). Strings are UTF-8, `n` is a u32
big-endian, `‖` is concatenation, `g` is the match id, `a` commits and `b` seeds:

```
c = SHA-256("ftgames-coin-v1" ‖ 0x00 ‖ g ‖ 0x00 ‖ n ‖ rA)          a → commit (c),  rA = 32 random bytes
                                                                  b → seed (s),    s  = 32 random bytes, only after c
                                                                  a → reveal (rA)
d = SHA-256("ftgames-coin-v1/out" ‖ 0x00 ‖ g ‖ 0x00 ‖ n ‖ rA ‖ s)  d[0] even: a starts; odd: b starts
```

`n` is 0 for the opening coin. Each value is a 64-character hex string, or it is ignored. `b` checks that
`rA` hashes to `c`; if not, the match ends as invalid. If the reveal does not come within 30 s of the seed,
the match ends as abandoned, and each phone says which one did not reveal. Neither side can choose the
outcome: `a` was bound before seeing `s`, and `b` chose `s` without knowing `rA`. What remains is walking
away: `a`, having seen `s`, can refuse to reveal (the match shows as abandoned by it), and either side can
stop answering or delete the match and start another; neither can be prevented, only seen.

The same layout serves dice and hidden fleets: dice use `"ftgames-dice-v1"`, roll `n`,
and take the bytes of `d` in order, dropping those ≥ 252, each die = byte mod 6 + 1; when they run out,
`SHA-256(d ‖ k)` for `k` = 1, 2, … as u32. The kit's `fleetCommit` commits a fleet as
`SHA-256("ftgames-ships-v1" ‖ 0x00 ‖ g ‖ 0x00 ‖ salt(32) ‖ fleet)`, the fleet written one way only: each
ship's cells by letter then number, joined by commas; ships by their first cell, joined by semicolons
(`A9,A10;E3,E4,E5`). Sea Battle, whose rules check the fleets while they replay the moves, does it
synchronously with its own SHA-256 and without the match id:
`SHA-256("ftgames-ships-v1" ‖ 0x00 ‖ 0x00 ‖ salt(24) ‖ fleet)`, the same fleet text, written in base64url
in its `c` move.

Fixed vectors (in `kit/test/commit.test.js`), computed independently by `kit/test/vectors.py` (Python's
`hashlib`) and checked with `shasum -a 256`, with `g = "match-1"`, `rA = 00 01 … 1f`, `s = ff fe … e0`,
`salt = 5a × 32`:

| | |
| --- | --- |
| coin commitment, n = 0 | `97ef4dc55efe32e6f988b2bcabb461202b9da0cb4be70296142daf2720d2fcd2` |
| coin outcome, n = 0 | `7b3b4e78df4e0fbbed308ebc533e823db88424145e12253fc123612a3d2a3dfb` → odd: `b` starts |
| dice commitment, n = 15 | `84f1ef6babd8bea665ca510bc015d0f407fba092a5a8ef4779b1f0723caecfd6` |
| dice outcome, n = 15 | `fc933aa01aa06f111dd75a897b6d5b0620e0d2c458fe5a16fe159bfa69d0e0bd` (starts with 0xfc: dropped) |
| 40 dice, n = 15 | `4 5 5 3 5 4 6 6 6 1 6 4 2 2 1 3 3 1 5 5 1 5 4 6 5 4 5 3 4 2 1 6 3 1 4 3 2 5 2 6` |
| fleet `A9,A10;E3,E4,E5` | `116b3c477d1eacfaa46b8b9ac2dc4c76b70e2d97f941832904cf80f6534b1e1d` |

## Packages

- One minified ES module per game (esbuild), the kit inside, the CSS minified and inlined as text, the
  licence comments dropped and the game's `THIRD_PARTY_NOTICES.md` copied beside it. A game that needs
  more from its build (a module made at build time, a fix to a dependency's source) exports esbuild
  `plugins` from its own `build.js`; they run before the kit's.
- Each game's tests check its manifest, that `dist/` stays under its size cap (130 to 136 KB for a small
  game: the kit with its 21 languages is about 96 KB),
  and that nothing the frame loads contains an `http://` or `https://` address. XML namespace names
  (`http://www.w3.org/2000/svg`…) are allowed: browsers never fetch them. `THIRD_PARTY_NOTICES.md` is
  not scanned: it may quote a licence's address, and the frame never loads it.
- `kit/test/helpers.js` gives every game's tests the same tools: `fakeCore()` (one phone's `ft`),
  `phones()` (two of them wired as one conversation), `playOut(game, players)`, `anyLegal(game, random)`
  and `seeded(seed)` (whole rounds for a robot's tests), `checkManifest`, `checkLocales`, `checkDist`, `checkTexts`,
  `within(element, selector)` (the game's page, or the alert it is asking with) and `words(node)` (the
  text on the screen: Stencil gives some of Ionic's components a `textContent` of their own).
- The tests register Ionic's components as the app lends them (`kit/test/ionic.js`, Vitest's setup),
  from `@ionic/core`, a development dependency at the version the app pins.

## Publishing

The catalogue packs each `games/<name>/` folder (`module.json` and `dist/`) and signs it. The app
updates an installed game only when the catalogue lists a **newer `version`**: it does not compare the
package's contents. So:

- A game whose `dist/` changed gets a new `version` in its `module.json` before it is published again;
  otherwise phones that already have it keep the old code, silently (a repackaged 1.0.0 is neither
  offered as an update nor refused).
- The kit is compiled into every game, so a kit change after the first publication rebuilds every
  `dist/` and means a new version for every game.
- `module.json` is bundled into `dist/` (the game reads its `version` from it), so any change to the
  manifest, `locales` included, changes `dist/` and needs a new version too.
- The three games were first published at `1.0.0`; `1.0.1` adds their names and summaries in the
  app's other 20 languages (`locales`).
- The kit's in-app notices (`ft.notify`), drag and drop and single first paint shipped as one more
  patch for every game: `1.0.1` for the ten games first published at `1.0.0`, `1.0.2` for the first three.
- The kit in Ionic's page (core 1.6.0) is one more patch for every game: `1.0.3` for the ten, `1.0.4` for
  the first three.
- The notices in their band under the bar, instead of the app's toast over it, are one more patch for
  every game: `1.0.4` for the ten, `1.0.5` for the first three.
- The bar's title centred on the iPhone (Ionic's title keeps its own box sizing) is one more patch for
  every game: `1.0.5` for the ten, `1.0.6` for the first three.
- Matches against the phone are `1.1.0` for the games that have a `robot` (Tic-Tac-Toe, Four in a Row,
  Reversi), and one more patch for the others, whose bundle changes with the kit: `1.0.6` for nine,
  `1.0.7` for Chess.
- A `robot` for Checkers, Five in a Row, Dots and Boxes, Mancala and Chess is their `1.1.0`.
- A `robot` that keeps its secrets in the match's memory is `1.1.0` for Sea Battle, Crazy Eights,
  Backgammon, Word Duel and Letter Grid.
- Full screen (the board sized from the frame the app gives the game, live) is one more patch for every
  game: `1.1.1`.

## Preview

`npm run preview` serves two phones side by side (with `&solo`, one phone in a match against itself, as
in the FlickerTalk conversation); each runs the game in an iframe built like the app's
plugin sheet (`sandbox="allow-scripts"`, the Content-Security-Policy the core gives a plugin without
network, and Ionic lent as the app lends it), and the page between them plays the core: records in memory, the live channel (with a switch
for the connection), “close” and “open” for each phone, and `say` into a mock composer.
`npm run shots` plays each game there in Chromium (Playwright) and saves the screens for review: a phone
(360×740) light and dark, Arabic, and a tablet in landscape (2560×1600).

## License

MIT. Third-party code and artwork keep their own licenses; see `THIRD_PARTY_NOTICES.md` in each game.
