# Third-party notices — Word Duel

The game, its board and the FlickerTalk games kit compiled into `index.js` are FlickerTalk's own,
under the MIT licence of the repository; its third-party works are Ionicons and the two word lists, below, under their own
licences, reproduced here in full.

## Ionicons 8.1.0

The interface's icons (the kit's `icons.js`): the outline drawings of the ones the kit uses, copied
unchanged from `dist/svg/` of the package.
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

## an-array-of-english-words 2.0.0

The English words (`src/words-en.js`, `ACCEPTED`): the five-letter words of the list, as they are.
Source: the `an-array-of-english-words` package on npm, version 2.0.0 (repository `words/an-array-of-english-words` on GitHub), derived from the Letterpress word list.
Licence: MIT.

```
(The MIT License)

Copyright (c) 2014 Zeke Sikelianos <zeke@sikelianos.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## FrequencyWords (2018)

The order of the common English words (`ANSWERS` of `src/words-en.js`) and the Spanish words (`src/words-es.js`): the five-letter words of the `en_50k` and `es_50k` lists, the Spanish ones with their accents dropped and names and English words left out.
Source: the `FrequencyWords` repository (`hermitdave/FrequencyWords` on GitHub), word frequency lists from the OpenSubtitles 2018 corpus.
Author: Hermit Dave.
Licence: CC BY-SA 4.0 (Creative Commons Attribution-ShareAlike 4.0 International), https://creativecommons.org/licenses/by-sa/4.0/legalcode. The repository gives the MIT licence for its code and this one for its content; only content is used here.
Changes: only the five-letter words were kept; the English list is used only for the order of the answers, and the Spanish words had their accents dropped and names and English words left out.
What this means: the order of `ANSWERS` in `src/words-en.js` and the list in `src/words-es.js` are adapted from that content, so they are under CC BY-SA 4.0 too, not under the MIT licence of the rest of the game. Anyone may copy, change and share them, also commercially, by naming the source as above, saying what was changed and keeping the same licence.
