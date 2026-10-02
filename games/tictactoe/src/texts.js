// What Tic-Tac-Toe adds to the kit's texts, in the 21 languages of the app: its name as each
// language calls the game, and what a screen reader says of the board. English is the source.
// Data only (README, "Texts").

export const TEXTS = {
  en: { name: "Tic-Tac-Toe", board: "Board", cell: "Row {row}, column {col}", empty: "empty", markX: "X", markO: "O" },
  es: { name: "Tres en raya", board: "Tablero", cell: "Fila {row}, columna {col}", empty: "vacía", markX: "X", markO: "O" },
  fr: { name: "Morpion", board: "Plateau", cell: "Ligne {row}, colonne {col}", empty: "vide", markX: "X", markO: "O" },
  de: { name: "Tic-Tac-Toe", board: "Spielfeld", cell: "Zeile {row}, Spalte {col}", empty: "leer", markX: "X", markO: "O" },
  it: { name: "Tris", board: "Griglia", cell: "Riga {row}, colonna {col}", empty: "vuota", markX: "X", markO: "O" },
  pt: { name: "Jogo da velha", board: "Tabuleiro", cell: "Linha {row}, coluna {col}", empty: "vazia", markX: "X", markO: "O" },
  ro: { name: "X și 0", board: "Tabla", cell: "Rândul {row}, coloana {col}", empty: "liberă", markX: "X", markO: "0" },
  pl: { name: "Kółko i krzyżyk", board: "Plansza", cell: "Wiersz {row}, kolumna {col}", empty: "puste", markX: "krzyżyk", markO: "kółko" },
  ru: { name: "Крестики-нолики", board: "Поле", cell: "Ряд {row}, столбец {col}", empty: "пусто", markX: "крестик", markO: "нолик" },
  uk: { name: "Хрестики-нулики", board: "Поле", cell: "Ряд {row}, стовпець {col}", empty: "порожньо", markX: "хрестик", markO: "нулик" },
  tr: { name: "XOX", board: "Tahta", cell: "Satır {row}, sütun {col}", empty: "boş", markX: "X", markO: "O" },
  ar: { name: "إكس-أو", board: "اللوحة", cell: "الصف {row}، العمود {col}", empty: "فارغة", markX: "إكس", markO: "أو" },
  hi: { name: "टिक-टैक-टो", board: "बोर्ड", cell: "पंक्ति {row}, स्तंभ {col}", empty: "खाली", markX: "क्रॉस", markO: "गोला" },
  bn: { name: "টিক-ট্যাক-টো", board: "বোর্ড", cell: "সারি {row}, কলাম {col}", empty: "খালি", markX: "ক্রস", markO: "গোল" },
  id: { name: "Tic-Tac-Toe", board: "Papan", cell: "Baris {row}, kolom {col}", empty: "kosong", markX: "X", markO: "O" },
  vi: { name: "Cờ ca-rô 3×3", board: "Bàn cờ", cell: "Hàng {row}, cột {col}", empty: "trống", markX: "X", markO: "O" },
  th: { name: "โอเอกซ์", board: "กระดาน", cell: "แถว {row} คอลัมน์ {col}", empty: "ว่าง", markX: "X", markO: "O" },
  ja: { name: "三目並べ", board: "盤面", cell: "{row}行{col}列", empty: "空き", markX: "バツ", markO: "マル" },
  ko: { name: "틱택토", board: "판", cell: "{row}행 {col}열", empty: "빈 칸", markX: "X", markO: "O" },
  "zh-CN": { name: "井字棋", board: "棋盘", cell: "第 {row} 行，第 {col} 列", empty: "空", markX: "叉", markO: "圈" },
  "zh-TW": { name: "井字遊戲", board: "棋盤", cell: "第 {row} 列，第 {col} 欄", empty: "空", markX: "叉", markO: "圈" },
};
