// What Reversi adds to the kit's texts, in the 21 languages of the app: its name (the plain name
// of the old game, never the trademark of the boxed one), what a screen reader says of the board,
// and the count of discs. English is the source. Data only (README, "Texts").

export const TEXTS = {
  en: { name: "Reversi", board: "Board", cell: "Row {row}, column {col}", empty: "empty", dark: "dark", light: "light", count: "{dark} dark, {light} light" },
  es: { name: "Reversi", board: "Tablero", cell: "Fila {row}, columna {col}", empty: "vacía", dark: "oscura", light: "clara", count: "{dark} oscuras, {light} claras" },
  fr: { name: "Reversi", board: "Plateau", cell: "Ligne {row}, colonne {col}", empty: "vide", dark: "foncé", light: "clair", count: "{dark} foncés, {light} clairs" },
  de: { name: "Reversi", board: "Spielfeld", cell: "Zeile {row}, Spalte {col}", empty: "leer", dark: "dunkel", light: "hell", count: "{dark} dunkle, {light} helle" },
  it: { name: "Reversi", board: "Scacchiera", cell: "Riga {row}, colonna {col}", empty: "vuota", dark: "scuro", light: "chiaro", count: "{dark} scuri, {light} chiari" },
  pt: { name: "Reversi", board: "Tabuleiro", cell: "Linha {row}, coluna {col}", empty: "vazia", dark: "escura", light: "clara", count: "{dark} escuras, {light} claras" },
  ro: { name: "Reversi", board: "Tabla", cell: "Rândul {row}, coloana {col}", empty: "goală", dark: "închis", light: "deschis", count: "{dark} închise, {light} deschise" },
  pl: { name: "Reversi", board: "Plansza", cell: "Wiersz {row}, kolumna {col}", empty: "puste", dark: "ciemny", light: "jasny", count: "{dark} ciemnych, {light} jasnych" },
  ru: { name: "Реверси", board: "Поле", cell: "Ряд {row}, столбец {col}", empty: "пусто", dark: "тёмная", light: "светлая", count: "{dark} тёмных, {light} светлых" },
  uk: { name: "Реверсі", board: "Поле", cell: "Ряд {row}, стовпець {col}", empty: "порожньо", dark: "темна", light: "світла", count: "{dark} темних, {light} світлих" },
  tr: { name: "Reversi", board: "Tahta", cell: "Satır {row}, sütun {col}", empty: "boş", dark: "koyu", light: "açık", count: "{dark} koyu, {light} açık" },
  ar: { name: "ريفيرسي", board: "اللوحة", cell: "الصف {row}، العمود {col}", empty: "فارغة", dark: "داكن", light: "فاتح", count: "{dark} داكنة، {light} فاتحة" },
  hi: { name: "रिवर्सी", board: "बोर्ड", cell: "पंक्ति {row}, स्तंभ {col}", empty: "खाली", dark: "गहरा", light: "हल्का", count: "{dark} गहरे, {light} हल्के" },
  bn: { name: "রিভার্সি", board: "বোর্ড", cell: "সারি {row}, কলাম {col}", empty: "খালি", dark: "গাঢ়", light: "হালকা", count: "{dark} গাঢ়, {light} হালকা" },
  id: { name: "Reversi", board: "Papan", cell: "Baris {row}, kolom {col}", empty: "kosong", dark: "gelap", light: "terang", count: "{dark} gelap, {light} terang" },
  vi: { name: "Cờ lật", board: "Bàn cờ", cell: "Hàng {row}, cột {col}", empty: "trống", dark: "đen", light: "trắng", count: "{dark} đen, {light} trắng" },
  th: { name: "หมากล้อมพลิก", board: "กระดาน", cell: "แถว {row} คอลัมน์ {col}", empty: "ว่าง", dark: "ดำ", light: "ขาว", count: "ดำ {dark} ขาว {light}" },
  ja: { name: "リバーシ", board: "盤面", cell: "{row}行{col}列", empty: "空き", dark: "黒", light: "白", count: "黒 {dark}、白 {light}" },
  ko: { name: "리버시", board: "판", cell: "{row}행 {col}열", empty: "비어 있음", dark: "검은색", light: "흰색", count: "검은색 {dark}, 흰색 {light}" },
  "zh-CN": { name: "黑白棋", board: "棋盘", cell: "第 {row} 行第 {col} 列", empty: "空", dark: "黑", light: "白", count: "黑 {dark}，白 {light}" },
  "zh-TW": { name: "黑白棋", board: "棋盤", cell: "第 {row} 列第 {col} 欄", empty: "空", dark: "黑", light: "白", count: "黑 {dark}，白 {light}" },
};
