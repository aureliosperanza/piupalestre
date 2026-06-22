// Calcolo del Codice Fiscale italiano (16 caratteri).
// Riferimento: cognome(3) + nome(3) + anno(2) + mese(1) + giorno/sesso(2) + comune(4) + carattere di controllo(1)

const VOWELS = 'AEIOU';
const MONTH_CODES = 'ABCDEHLMPRST'; // Gen..Dic

// Normalizza: maiuscolo, rimuove accenti e tutto ciò che non è A-Z
const normalize = (str) =>
  (str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove i segni diacritici combinanti
    .replace(/[^A-Z]/g, '');

const consonants = (s) => s.split('').filter((c) => !VOWELS.includes(c)).join('');
const vowels = (s) => s.split('').filter((c) => VOWELS.includes(c)).join('');

// Codice cognome: consonanti + vocali, primi 3, padding con X
const surnameCode = (surname) => {
  const s = normalize(surname);
  return (consonants(s) + vowels(s) + 'XXX').substring(0, 3);
};

// Codice nome: se 4+ consonanti -> 1a, 3a, 4a; altrimenti consonanti+vocali, primi 3
const nameCode = (name) => {
  const s = normalize(name);
  const cons = consonants(s);
  let res;
  if (cons.length >= 4) {
    res = cons[0] + cons[2] + cons[3];
  } else {
    res = cons + vowels(s);
  }
  return (res + 'XXX').substring(0, 3);
};

// Tabella caratteri di controllo per posizioni dispari (1-indexed)
const ODD = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23
};

// Valore posizioni pari: cifre = valore numerico, lettere A..Z = 0..25
const evenValue = (ch) => (/[0-9]/.test(ch) ? Number(ch) : ch.charCodeAt(0) - 65);

const checkChar = (code15) => {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const ch = code15[i];
    // i (0-indexed) pari -> posizione dispari (1-indexed)
    sum += i % 2 === 0 ? ODD[ch] : evenValue(ch);
  }
  return String.fromCharCode(65 + (sum % 26));
};

/**
 * Calcola il codice fiscale.
 * @param {Object} data - { first_name, last_name, gender ('M'|'F'|'Other'), birth_date ('YYYY-MM-DD'), catastale }
 * @returns {string} codice fiscale a 16 caratteri
 */
export const computeCodiceFiscale = ({ first_name, last_name, gender, birth_date, catastale }) => {
  const [year, month, day] = birth_date.split('-').map(Number);

  const yy = String(year % 100).padStart(2, '0');
  const monthCode = MONTH_CODES[month - 1];
  const dayNum = gender === 'F' ? day + 40 : day;
  const dd = String(dayNum).padStart(2, '0');

  const code15 = surnameCode(last_name) + nameCode(first_name) + yy + monthCode + dd + catastale.toUpperCase();
  return code15 + checkChar(code15);
};

export { normalize };
