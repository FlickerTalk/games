// What Four in a Row adds to the kit's texts, in the 21 languages of the app: its name, a plain
// description of the game in each language (never a brand name), and what a screen reader says of
// the board. English is the source. Data only (README, "Texts").

export const TEXTS = {
  en: { name: "Four in a Row", board: "Board", column: "Column {n}", empty: "empty", markX: "X", markO: "O" },
  es: { name: "Cuatro en raya", board: "Tablero", column: "Columna {n}", empty: "vacía", markX: "X", markO: "O" },
  fr: { name: "Quatre en ligne", board: "Plateau", column: "Colonne {n}", empty: "vide", markX: "X", markO: "O" },
  de: { name: "Vier in einer Reihe", board: "Spielfeld", column: "Spalte {n}", empty: "leer", markX: "X", markO: "O" },
  it: { name: "Quattro in fila", board: "Griglia", column: "Colonna {n}", empty: "vuota", markX: "X", markO: "O" },
  pt: { name: "Quatro em linha", board: "Tabuleiro", column: "Coluna {n}", empty: "vazia", markX: "X", markO: "O" },
  ro: { name: "Patru în linie", board: "Tabla", column: "Coloana {n}", empty: "goală", markX: "X", markO: "0" },
  pl: { name: "Cztery w rzędzie", board: "Plansza", column: "Kolumna {n}", empty: "pusta", markX: "krzyżyk", markO: "kółko" },
  ru: { name: "Четыре в ряд", board: "Поле", column: "Столбец {n}", empty: "пусто", markX: "крестик", markO: "нолик" },
  uk: { name: "Чотири в ряд", board: "Поле", column: "Стовпець {n}", empty: "порожньо", markX: "хрестик", markO: "нулик" },
  tr: { name: "Dörtlü sıra", board: "Tahta", column: "Sütun {n}", empty: "boş", markX: "X", markO: "O" },
  ar: { name: "أربعة في صف", board: "اللوحة", column: "العمود {n}", empty: "فارغ", markX: "إكس", markO: "أو" },
  hi: { name: "पंक्ति में चार", board: "बोर्ड", column: "स्तंभ {n}", empty: "खाली", markX: "क्रॉस", markO: "गोला" },
  bn: { name: "এক সারিতে চার", board: "বোর্ড", column: "কলাম {n}", empty: "খালি", markX: "ক্রস", markO: "গোল" },
  id: { name: "Empat Sejajar", board: "Papan", column: "Kolom {n}", empty: "kosong", markX: "X", markO: "O" },
  vi: { name: "Bốn quân thẳng hàng", board: "Bàn cờ", column: "Cột {n}", empty: "trống", markX: "X", markO: "O" },
  th: { name: "เรียงสี่", board: "กระดาน", column: "คอลัมน์ {n}", empty: "ว่าง", markX: "X", markO: "O" },
  ja: { name: "四目並べ", board: "盤面", column: "{n}列", empty: "空き", markX: "バツ", markO: "マル" },
  ko: { name: "사목", board: "판", column: "{n}열", empty: "비어 있음", markX: "X", markO: "O" },
  "zh-CN": { name: "四子棋", board: "棋盘", column: "第 {n} 列", empty: "空", markX: "叉", markO: "圈" },
  "zh-TW": { name: "四子棋", board: "棋盤", column: "第 {n} 欄", empty: "空", markX: "叉", markO: "圈" },
};
