/**
 * Neoficiální, ale rychle přijímaný standard (llmstxt.org): stručný
 * markdownový rozcestník pro jazykové modely. Nástroj sám tenhle soubor
 * kontroluje u auditovaných webů (lib/checks/geo.ts) — ať jde příkladem.
 */
export const dynamic = 'force-static';

const BODY = `# Audit webu

> Nástroj od Semakodu, který během pár minut prověří rychlost, SEO, AEO
> (připravenost na přímé odpovědi AI asistentů) a GEO (viditelnost pro
> generativní vyhledávače) libovolné veřejné adresy. Report je pravidly
> řízený — žádný text negeneruje jazykový model.

Vložte URL na https://audit.semakod.cz a nástroj vrátí skóre v pěti
kategoriích: Rychlost (Core Web Vitals přes Google PageSpeed Insights),
SEO, AEO, GEO a Správnost. Zdarma, bez registrace, výsledky se nikam
neukládají.

## Klíčové stránky

- [Audit webu](https://audit.semakod.cz/): zadání URL a spuštění auditu
- [Jak to funguje](https://audit.semakod.cz/#jak-to-funguje): čtyři kroky auditu
- [Co kontrolujeme](https://audit.semakod.cz/#co-kontrolujeme): přes třicet kontrol v pěti kategoriích
- [Doporučení](https://audit.semakod.cz/#doporuceni): obecné rady k výsledku
- [FAQ](https://audit.semakod.cz/#faq): časté dotazy ke skórování a metodice

## O provozovateli

- [Semakod](https://semakod.cz): digitální studio Mykoly Stoyky, které nástroj vytvořilo a provozuje
- [Zdrojový kód na GitHubu](https://github.com/stoyka95/audit): otevřená implementace všech kontrol
`;

export function GET() {
  return new Response(BODY, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
