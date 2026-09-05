/**
 * Slovo „Google" vysázené barvami, které Google používá pro svůj nápis:
 * G modré, o červené, o žluté, g modré, l zelené, e červené.
 *
 * Písmena jsou samostatné <span>y v běžném textovém toku, ne obrázek — nadpis
 * tak zůstane vybíratelný, přeložitelný i čitelný pro vyhledávače a odečítače
 * obrazovky. Barvy jsou napevno: jsou to firemní barvy Googlu, ne motiv webu,
 * takže se se světlým a tmavým režimem nemění.
 */
const LETTERS: [string, string][] = [
  ['G', '#4285F4'],
  ['o', '#EA4335'],
  ['o', '#FBBC05'],
  ['g', '#4285F4'],
  ['l', '#34A853'],
  ['e', '#EA4335'],
];

export default function GoogleWord() {
  return (
    <span>
      {LETTERS.map(([letter, color], index) => (
        <span key={`${letter}-${index}`} style={{ color }}>
          {letter}
        </span>
      ))}
    </span>
  );
}
