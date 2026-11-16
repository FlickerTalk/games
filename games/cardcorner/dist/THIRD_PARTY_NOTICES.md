# Third-party notices — Card Corner

The four games, their tables and the FlickerTalk games kit compiled into `index.js` are FlickerTalk's own,
under the MIT licence of the repository; its third-party works are Ionicons and Adrian Kennard's playing cards,
below, under their own licences.

## Ionicons 8.1.0

The interface's icons (the kit's `icons.js`): the outline drawings of the ones the kit uses, copied
unchanged from `dist/svg/` of the package; and the package's icon, `icon.svg`: the `copy-outline`
drawing, placed on a coloured square by the Plugin SDK's `make-icon` tool.
Source: the `ionicons` package on npm, version 8.1.0 (repository `ionic-team/ionicons` on GitHub).
Licence: MIT.

```
The MIT License (MIT)

Copyright (c) 2015-present Ionic (http://ionic.io/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Playing cards by Adrian Kennard (RevK)

The cards' faces (the kit's `cards/deck.js`): the twelve court figures, the four suit signs, the rank
signs of the corners and the places of the pips, from the "Plain" deck of Adrian Kennard's SVG playing
cards, the court cards based on Goodall & Son designs of the 19th century. The files used are in
`games/eights/vendor/revk/` of the repository, as the site gives them; that game's `build.js` turns
them into the paths the cards are drawn from, rounded to a coarser grid and written in a compact form.
The backs of the cards are FlickerTalk's own.
Source: https://www.me.uk/cards/ (the "Plain" option, an ace of spades without a link).
Credit, which the licence does not require: playing cards by Adrian Kennard (RevK), https://www.me.uk/cards/.
Licence: CC0 1.0 Universal, a public domain dedication (https://creativecommons.org/publicdomain/zero/1.0/legalcode),
as the author states on that page: "© Copyright 2018 Adrian Kennard. Released under CC0 Public Domain licence."
