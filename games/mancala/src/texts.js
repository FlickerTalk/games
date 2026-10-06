// What mancala adds to the kit's texts, in the 21 languages of the app: its name (the plain family
// name of the game, or the local one), what a screen reader says of each pit and store, and the
// count of seeds. English is the source. Data only (README, "Texts").

export const TEXTS = {
  en: { name: "Mancala", board: "Board", yourPit: "Your pit {n}", theirPit: "Their pit {n}", yourStore: "Your store", theirStore: "Their store", seeds: "{n} seeds", count: "{first} seeds to {second}" },
  es: { name: "Mancala", board: "Tablero", yourPit: "Tu hoyo {n}", theirPit: "Su hoyo {n}", yourStore: "Tu almacén", theirStore: "Su almacén", seeds: "{n} semillas", count: "{first} semillas a {second}" },
  fr: { name: "Mancala", board: "Plateau", yourPit: "Votre trou {n}", theirPit: "Leur trou {n}", yourStore: "Votre grenier", theirStore: "Leur grenier", seeds: "{n} graines", count: "{first} graines à {second}" },
  de: { name: "Mancala", board: "Spielfeld", yourPit: "Deine Mulde {n}", theirPit: "Ihre Mulde {n}", yourStore: "Deine Kalaha", theirStore: "Ihre Kalaha", seeds: "{n} Samen", count: "{first} Samen zu {second}" },
  it: { name: "Mancala", board: "Tavola", yourPit: "La tua buca {n}", theirPit: "La loro buca {n}", yourStore: "Il tuo granaio", theirStore: "Il loro granaio", seeds: "{n} semi", count: "{first} semi a {second}" },
  pt: { name: "Mancala", board: "Tabuleiro", yourPit: "A tua cova {n}", theirPit: "A cova {n} deles", yourStore: "O teu celeiro", theirStore: "O celeiro deles", seeds: "{n} sementes", count: "{first} sementes a {second}" },
  ro: { name: "Mancala", board: "Tabla", yourPit: "Groapa ta {n}", theirPit: "Groapa lor {n}", yourStore: "Hambarul tău", theirStore: "Hambarul lor", seeds: "{n} semințe", count: "{first} semințe la {second}" },
  pl: { name: "Mankala", board: "Plansza", yourPit: "Twój dołek {n}", theirPit: "Ich dołek {n}", yourStore: "Twój spichlerz", theirStore: "Ich spichlerz", seeds: "{n} nasion", count: "{first} nasion do {second}" },
  ru: { name: "Манкала", board: "Поле", yourPit: "Ваша лунка {n}", theirPit: "Их лунка {n}", yourStore: "Ваш амбар", theirStore: "Их амбар", seeds: "{n} зёрен", count: "{first} зёрен против {second}" },
  uk: { name: "Манкала", board: "Поле", yourPit: "Ваша лунка {n}", theirPit: "Їхня лунка {n}", yourStore: "Ваша комора", theirStore: "Їхня комора", seeds: "{n} зерен", count: "{first} зерен проти {second}" },
  tr: { name: "Mangala", board: "Tahta", yourPit: "Senin kuyun {n}", theirPit: "Onların kuyusu {n}", yourStore: "Senin haznen", theirStore: "Onların haznesi", seeds: "{n} taş", count: "{first} taşa {second}" },
  ar: { name: "المنقلة", board: "اللوحة", yourPit: "حفرتك {n}", theirPit: "حفرتهم {n}", yourStore: "مخزنك", theirStore: "مخزنهم", seeds: "{n} بذور", count: "{first} بذرة مقابل {second}" },
  hi: { name: "मंकला", board: "बोर्ड", yourPit: "आपका गड्ढा {n}", theirPit: "उनका गड्ढा {n}", yourStore: "आपका भंडार", theirStore: "उनका भंडार", seeds: "{n} बीज", count: "{first} बीज बनाम {second}" },
  bn: { name: "মানকালা", board: "বোর্ড", yourPit: "আপনার গর্ত {n}", theirPit: "তাদের গর্ত {n}", yourStore: "আপনার ভাণ্ডার", theirStore: "তাদের ভাণ্ডার", seeds: "{n} বীজ", count: "{first} বীজ বনাম {second}" },
  id: { name: "Congklak", board: "Papan", yourPit: "Lubang Anda {n}", theirPit: "Lubang mereka {n}", yourStore: "Lumbung Anda", theirStore: "Lumbung mereka", seeds: "{n} biji", count: "{first} biji lawan {second}" },
  vi: { name: "Ô ăn quan", board: "Bàn chơi", yourPit: "Ô của bạn {n}", theirPit: "Ô của họ {n}", yourStore: "Kho của bạn", theirStore: "Kho của họ", seeds: "{n} hạt", count: "{first} hạt so với {second}" },
  th: { name: "หมากขุม", board: "กระดาน", yourPit: "หลุมของคุณ {n}", theirPit: "หลุมของเขา {n}", yourStore: "ยุ้งของคุณ", theirStore: "ยุ้งของเขา", seeds: "{n} เมล็ด", count: "{first} เมล็ด ต่อ {second}" },
  ja: { name: "マンカラ", board: "盤面", yourPit: "自分の穴 {n}", theirPit: "相手の穴 {n}", yourStore: "自分のストア", theirStore: "相手のストア", seeds: "{n} 個", count: "{first} 対 {second} 個" },
  ko: { name: "만칼라", board: "판", yourPit: "내 구멍 {n}", theirPit: "상대 구멍 {n}", yourStore: "내 창고", theirStore: "상대 창고", seeds: "씨앗 {n}개", count: "{first} 대 {second} 개" },
  "zh-CN": { name: "播棋", board: "棋盘", yourPit: "你的坑 {n}", theirPit: "对方的坑 {n}", yourStore: "你的仓", theirStore: "对方的仓", seeds: "{n} 颗", count: "{first} 颗对 {second} 颗" },
  "zh-TW": { name: "播棋", board: "棋盤", yourPit: "你的坑 {n}", theirPit: "對方的坑 {n}", yourStore: "你的倉", theirStore: "對方的倉", seeds: "{n} 顆", count: "{first} 顆對 {second} 顆" },
};
