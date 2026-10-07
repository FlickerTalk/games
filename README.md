# FlickerTalk games

Board games for [FlickerTalk](https://flickertalk.com), played between the two phones of a
conversation. Each game is its own package of the signed plugin catalogue: a web component that runs
in an isolated frame, without network access, and talks to the same game on the other phone over the
conversation's direct, end-to-end encrypted connection.

**Privacy.** Matches are played over the direct connection between the two phones, encrypted, and are
stored only on them. A game sees its own matches and nothing else: not the conversation, not who the
contact is, not the network. Starting or entering a match may wake the other phone with a push that
carries no content, and the result only reaches the chat if the user sends it.

## Layout

```
kit/                      shared code, compiled INTO each game's dist/index.js (not a package)
  src/                    envelope, commit–reveal, match, storage, table (live session), shell, texts
  build.js                buildGame(): one game folder → its dist/
  test/                   the kit's tests, and helpers.js for every game's tests
games/<name>/             one catalogue package per game
  module.json             what the catalogue reads (kind "game", live + send only)
  THIRD_PARTY_NOTICES.md  copied into dist/ by the build
  build.js                optional: `export const plugins = [...]`, esbuild plugins for this game's build
  src/                    rules.js, board.js (+ board.css), texts.js, index.js
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
npm run preview       # http://127.0.0.1:5178/?game=tictactoe  (&lang=ar, &dark, &layout=tablet)
npm run shots         # screenshots of every game to /private/tmp/ftgames-shots/<game>/
npm run frame         # chess in Chromium inside the preview's frame: pieces drawn, tap, drag, promotion, no network
```

`dist/` is committed: after changing `src/` or the kit, run `npm run build` and commit what changed.
The build is deterministic, so a game whose sources and kit did not change gives the same bytes and
`git diff` says exactly which packages change. CI runs the licences, the tests and the build, and fails
if the build does not give back the committed `dist/`.

## Adding a game

1. `games/<name>/module.json`, copied from Tic-Tac-Toe: `id` `com.flickertalk.game.<name>`, `name`
   (English), `components: ["ft-<name>"]`, `version` `1.0.0`. Keep `kind: "game"`,
   `minCoreVersion: "1.3.0"` and `permissions: { "live": true, "send": "propose" }` — the app refuses a
   game that asks for anything else. Add `locales` (plugin-sdk's `module.schema.json`): the `name` and
   `summary` in the app's other 20 languages, the name being the game's own `TEXTS.<lang>.name`, so
   the app shows them in the phone's language (`checkLocales` checks them).
2. `games/<name>/THIRD_PARTY_NOTICES.md`: the full licence text (and Apache `NOTICE`) of everything
   bundled from elsewhere. Every game carries at least the kit's icons (Ionicons, MIT: copy the
   section from Tic-Tac-Toe's). Runtime dependencies go in the root `package.json` `dependencies`,
   where `npm run licenses` checks them.
3. `src/rules.js`, `src/board.js`, `src/texts.js` and `src/index.js` (below).
4. Tests in `games/<name>/test/`: the rules, the board and texts, the package (copy Tic-Tac-Toe's
   `package.test.js` and set your size cap), and two phones playing (copy `play.test.js`).
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
| `minBoard` | Optional: the smallest board, in CSS pixels, on which the game is playable (Chess 320: squares of 40 px; Four in a Row 308: columns of 44 px). In a game the kit makes room for it before anything else; while waiting or on the result the board may be smaller. Default 200. |
| `how(result, t)` | Optional: why a round ended by the rules, in the game's words (“checkmate”, “stalemate”), shown with the result; `result` is what `result(state)` returned. |
| `summary(view, { t, lang, name, icon, record })` | Optional: the text sent to the chat. Without it: `⭕ Tic-Tac-Toe: I won, 3–2 · draws: 1`, in the sender's language. |

A **move** is a JSON number or a short string (≤ 64 characters): a cell index, a column, `e7e8q`.
Rules are run on both phones from the first move every time something arrives, so they must be pure
and deterministic.

### The board

On a phone the game lives in the conversation's room, between the app's game bar and its composer,
and the whole page fits it without scrolling: everything else of a state (bar, chips, the result's
actions) is laid out above the board, and the board, square, takes what is left of the room. What
the user is told (whose turn it is, how a round ended, a notice) is never laid out: it is one toast
at the top, floating, so nothing above the board ever moves (see "Notices"). The room is the screen's height less the app's chrome, `ROOM_CHROME` in
`kit/src/shell.js` (297 px, measured on a Samsung S20+): the one number to change when the app's
room changes. When even the game's `minBoard` does not fit, the players' chips go first. A board
must draw inside the square it is given, whatever its size. `npm run room` checks every game in
every state on a 384×853 and a 360×740 phone, in German and Spanish.

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
| `notify(text)` | Tell the user something that passes (a word refused, a seed lost): the kit's toast at the top, gone after a few seconds. Never draw such a line inside the board, where it would move the rest. |

**Notices.** One toast at a time, at the top: a new one takes the last one's place. The standing line
(whose turn it is, why nothing can be played, how a round ended) stays for as long as it holds; a
notice or a board's `notify` passes after four seconds, then the standing line comes back; the end
of a round cuts a passing one short. In an app with the Plugin API's `ft.notify(text, { sticky })`
(app 1.4.1) the app draws it, an `ion-toast`, and the kit sends an empty text to take a standing one
away; in an older app the kit draws it in the frame (`role="status"`, `aria-live="polite"`), in a
band at the top kept from the first paint and always as tall (`--ftg-band`). "Try again" is a button
in the bar; a choice that has to be made (two phones that parted ways, a match the other person
started) is a card over the board.

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

The same layout serves dice and hidden fleets (for later games): dice use `"ftgames-dice-v1"`, roll `n`,
and take the bytes of `d` in order, dropping those ≥ 252, each die = byte mod 6 + 1; when they run out,
`SHA-256(d ‖ k)` for `k` = 1, 2, … as u32. A fleet is committed as
`SHA-256("ftgames-ships-v1" ‖ 0x00 ‖ g ‖ 0x00 ‖ salt(32) ‖ fleet)`, the fleet written one way only: each
ship's cells by letter then number, joined by commas; ships by their first cell, joined by semicolons
(`A9,A10;E3,E4,E5`).

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
- Each game's tests check its manifest, that `dist/` stays under its size cap (128 KB for a small game:
  the plan's 100 KB assumed a 25 KB kit, and the real kit with its 21 languages is about 90 KB),
  and that nothing the frame loads contains an `http://` or `https://` address. XML namespace names
  (`http://www.w3.org/2000/svg`…) are allowed: browsers never fetch them. `THIRD_PARTY_NOTICES.md` is
  not scanned: it may quote a licence's address, and the frame never loads it.
- `kit/test/helpers.js` gives every game's tests the same tools: `fakeCore()` (one phone's `ft`),
  `phones()` (two of them wired as one conversation), `checkManifest`, `checkLocales`, `checkDist`, `checkTexts`.

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

## Preview

`npm run preview` serves two phones side by side; each runs the game in an iframe built like the app's
plugin sheet (`sandbox="allow-scripts"`, the Content-Security-Policy the core gives a plugin without
network), and the page between them plays the core: records in memory, the live channel (with a switch
for the connection), “close” and “open” for each phone, and `say` into a mock composer.
`npm run shots` plays each game there in Chromium (Playwright) and saves the screens for review: a phone
(360×740) light and dark, Arabic, and a tablet in landscape (2560×1600).

## License

MIT. Third-party code and artwork keep their own licenses; see `THIRD_PARTY_NOTICES.md` in each game.
