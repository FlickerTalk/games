# Adrian Kennard's playing cards

Twenty-two cards of the "Plain" deck of Adrian Kennard's SVG playing cards (https://www.me.uk/cards/),
copied unchanged as the site gives them: the twelve court cards and the ace to ten of spades. The
author releases the designs under CC0 1.0 (public domain dedication); the court cards are based on
Goodall & Son designs of the 19th century. Only the cards were taken; the generator's source code,
which is published elsewhere under another licence, is not used.

`node games/eights/build.js` reads them and writes `games/eights/src/deck.js`: each court figure as
its six layers of one half (the other half is the same, turned), the suit marks inside the figures,
the four suit signs, the thirteen rank signs and the places of the pips, every path rounded to a
coarser grid and written in a compact text. `games/eights/THIRD_PARTY_NOTICES.md`, which ships with
the package, credits the author.
