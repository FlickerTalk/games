// What Five in a Row adds to the kit's texts, in the 21 languages of the app: its name (the plain
// name of the old game), what a screen reader says of the board, the two taps that place a stone,
// and how a round ends. English is the source. Data only (README, "Texts").

export const TEXTS = {
  en: { name: "Five in a Row", board: "Board", cell: "Row {row}, column {col}", empty: "empty", black: "black", white: "white", place: "Place the stone at row {row}, column {col}", five: "Five in a row" },
  es: { name: "Cinco en línea", board: "Tablero", cell: "Fila {row}, columna {col}", empty: "vacía", black: "negra", white: "blanca", place: "Poner la piedra en la fila {row}, columna {col}", five: "Cinco en línea" },
  fr: { name: "Cinq en ligne", board: "Plateau", cell: "Ligne {row}, colonne {col}", empty: "vide", black: "noire", white: "blanche", place: "Poser la pierre à la ligne {row}, colonne {col}", five: "Cinq en ligne" },
  de: { name: "Fünf in einer Reihe", board: "Spielfeld", cell: "Zeile {row}, Spalte {col}", empty: "leer", black: "schwarz", white: "weiß", place: "Stein auf Zeile {row}, Spalte {col} setzen", five: "Fünf in einer Reihe" },
  it: { name: "Cinque in fila", board: "Scacchiera", cell: "Riga {row}, colonna {col}", empty: "vuota", black: "nera", white: "bianca", place: "Posa la pietra in riga {row}, colonna {col}", five: "Cinque in fila" },
  pt: { name: "Cinco em linha", board: "Tabuleiro", cell: "Linha {row}, coluna {col}", empty: "vazia", black: "preta", white: "branca", place: "Pôr a pedra na linha {row}, coluna {col}", five: "Cinco em linha" },
  ro: { name: "Cinci în linie", board: "Tabla", cell: "Rândul {row}, coloana {col}", empty: "goală", black: "neagră", white: "albă", place: "Pune piatra pe rândul {row}, coloana {col}", five: "Cinci în linie" },
  pl: { name: "Pięć w rzędzie", board: "Plansza", cell: "Wiersz {row}, kolumna {col}", empty: "puste", black: "czarny", white: "biały", place: "Postaw kamień w wierszu {row}, kolumnie {col}", five: "Pięć w rzędzie" },
  ru: { name: "Пять в ряд", board: "Доска", cell: "Ряд {row}, столбец {col}", empty: "пусто", black: "чёрный", white: "белый", place: "Поставить камень: ряд {row}, столбец {col}", five: "Пять в ряд" },
  uk: { name: "П’ять у ряд", board: "Дошка", cell: "Ряд {row}, стовпець {col}", empty: "порожньо", black: "чорний", white: "білий", place: "Поставити камінь: ряд {row}, стовпець {col}", five: "П’ять у ряд" },
  tr: { name: "Beş Taş", board: "Tahta", cell: "Satır {row}, sütun {col}", empty: "boş", black: "siyah", white: "beyaz", place: "Taşı {row}. satır, {col}. sütuna koy", five: "Beş taş yan yana" },
  ar: { name: "خمسة في صف", board: "اللوحة", cell: "الصف {row}، العمود {col}", empty: "فارغة", black: "أسود", white: "أبيض", place: "ضع الحجر في الصف {row}، العمود {col}", five: "خمسة في صف" },
  hi: { name: "पाँच एक पंक्ति में", board: "बोर्ड", cell: "पंक्ति {row}, स्तंभ {col}", empty: "खाली", black: "काला", white: "सफ़ेद", place: "पत्थर पंक्ति {row}, स्तंभ {col} पर रखें", five: "पाँच एक पंक्ति में" },
  bn: { name: "পাঁচে সারি", board: "বোর্ড", cell: "সারি {row}, কলাম {col}", empty: "খালি", black: "কালো", white: "সাদা", place: "সারি {row}, কলাম {col}-এ পাথর রাখুন", five: "এক সারিতে পাঁচ" },
  id: { name: "Lima Sebaris", board: "Papan", cell: "Baris {row}, kolom {col}", empty: "kosong", black: "hitam", white: "putih", place: "Letakkan batu di baris {row}, kolom {col}", five: "Lima sebaris" },
  vi: { name: "Cờ ca-rô", board: "Bàn cờ", cell: "Hàng {row}, cột {col}", empty: "trống", black: "đen", white: "trắng", place: "Đặt quân ở hàng {row}, cột {col}", five: "Năm quân thẳng hàng" },
  th: { name: "โกะห้าเรียง", board: "กระดาน", cell: "แถว {row} คอลัมน์ {col}", empty: "ว่าง", black: "ดำ", white: "ขาว", place: "วางหมากที่แถว {row} คอลัมน์ {col}", five: "ห้าตัวเรียงกัน" },
  ja: { name: "五目並べ", board: "盤面", cell: "{row}行{col}列", empty: "空き", black: "黒", white: "白", place: "{row}行{col}列に石を置く", five: "五目" },
  ko: { name: "오목", board: "판", cell: "{row}행 {col}열", empty: "비어 있음", black: "흑", white: "백", place: "{row}행 {col}열에 돌 놓기", five: "오목 완성" },
  "zh-CN": { name: "五子棋", board: "棋盘", cell: "第 {row} 行第 {col} 列", empty: "空", black: "黑", white: "白", place: "在第 {row} 行第 {col} 列落子", five: "五子连珠" },
  "zh-TW": { name: "五子棋", board: "棋盤", cell: "第 {row} 列第 {col} 欄", empty: "空", black: "黑", white: "白", place: "在第 {row} 列第 {col} 欄落子", five: "五子連珠" },
};
