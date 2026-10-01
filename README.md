# FlickerTalk games

Board games for [FlickerTalk](https://flickertalk.com), played between the two phones of a
conversation. Each game is its own package of the signed plugin catalogue: a web component that runs
in an isolated frame, without network access, and talks to the same game on the other phone over the
conversation's direct, end-to-end encrypted connection.

- `kit/` — the code every game shares (match screen, live protocol, saved matches, texts). It is
  compiled into each game; it is not a package on its own.
- `games/<game>/` — one package per game, with its `module.json` and its built `dist/`.

## License

MIT. Third-party code and artwork keep their own licenses; see `THIRD_PARTY_NOTICES.md` in each game.
