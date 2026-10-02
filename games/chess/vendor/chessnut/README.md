# Chessnut pieces

The twelve SVG pieces of [Chessnut](https://github.com/LexLuengas/chessnut-pieces) by Alexis
Luengas, copied unchanged from commit `2b8eaf14a31edad7e9deb53b1473e1d4857868a9` (2015-06-30)
with their `LICENSE.txt` (Apache License 2.0) and `COPYRIGHT.txt`. The repository has no `NOTICE`
file.

`games/chess/build.js` assembles them into the sprite the board draws from
(`games/chess/src/pieces.js`): one `<g>` per piece, scaled from the 800-unit artboard to a 40-unit
tile, styles turned into attributes, the Illustrator ids and the hidden strokes removed. Those
modifications are stated in `games/chess/THIRD_PARTY_NOTICES.md`, which ships with the package.
