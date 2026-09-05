import type { CheerioAPI } from 'cheerio';

import { hasType } from '../jsonld';
import { formatPercent, pluralCz } from '../format';
import { translator, type Translate } from '../i18n';
import { ramp, type RampAnchors } from '../scoring';
import type { AuditContext, CheckResult } from '../types';

/** Delší text = lepší; kotvy se proto obracejí (počítá se, o kolik slov chybí do 600). */
const DEPTH_ANCHORS: RampAnchors = { good: 0, poor: 350, zero: 550 };
/** Medián délky odstavce ve slovech: kratší = lépe extrahovatelné. */
const PARAGRAPH_ANCHORS: RampAnchors = { good: 60, poor: 100, zero: 220 };

/**
 * Nadpis se počítá jako „otázkový", když má otazník nebo začíná tázacím slovem.
 * Seznam je záměrně dvojjazyčný — jazyk auditované stránky nemá nic společného
 * s jazykem rozhraní a české weby běžně míchají obojí.
 */
const QUESTION_STARTERS = [
  'jak',
  'co',
  'proč',
  'proc',
  'kdy',
  'kde',
  'kdo',
  'kolik',
  'který',
  'ktery',
  'jaké',
  'jake',
  'jaký',
  'jaky',
  'how',
  'what',
  'why',
  'when',
  'where',
  'who',
  'which',
  'can',
  'is',
  'do',
  'does',
];

function isQuestionHeading(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes('?')) return true;
  const firstWord = normalized.split(/[\s,:.]+/)[0];
  return QUESTION_STARTERS.includes(firstWord);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Viditelný text stránky. `$('body').text()` v cheeriu vrací i obsah `<script>`
 * a `<style>`, takže by pár inline skriptů vyrobilo stovky „slov" a stránka by
 * se tvářila jako obsáhlá.
 */
function visibleText($: CheerioAPI): string {
  const body = $('body').clone();
  body.find('script, style, noscript, template, svg').remove();
  return body.text().replace(/\s+/g, ' ').trim();
}

/** Medián — na délkách odstavců je odolnější než průměr, který rozhodí jeden dlouhý blok. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** Typy JSON-LD, které stránku jednoznačně označují za textový obsah. */
const CONTENT_TYPES = ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle', 'FAQPage', 'QAPage', 'HowTo'] as const;

/**
 * Je stránka textová? Kontroly „otázkové nadpisy" a „přímá odpověď" dávají smysl
 * na článku nebo v nápovědě, ne na homepage e-shopu — tam by trestaly něco,
 * co na takové stránce ani být nemá.
 */
function isContentPage(ctx: AuditContext, bodyWords: number): boolean {
  if (hasType(ctx.jsonLd, ...CONTENT_TYPES)) return true;
  if (ctx.$('article').length > 0) return true;
  return bodyWords >= 400;
}

function notContentDetail(t: Translate): string {
  return t(
    'Stránka nevypadá jako článek ani nápověda — nemá schéma typu Article/FAQPage, žádný prvek `<article>` ' +
      'a méně než 400 slov textu. Formát otázka–odpověď se na takové stránce nevyžaduje, takže se tato kontrola ' +
      'nehodnotí a do skóre nevstupuje. Pokud jde o obsahovou stránku, obalte hlavní text prvkem `<article>`.',
    'This does not look like an article or a help page — there is no Article/FAQPage schema, no `<article>` ' +
      'element and fewer than 400 words of text. A question-and-answer format is not expected here, so this ' +
      'check is skipped and does not affect the score. If it is a content page, wrap the main text in `<article>`.',
  );
}

/** Slova ve tvaru, který sedí do věty v obou jazycích. */
function words(count: number, t: Translate): string {
  return t(
    `${count} ${pluralCz(count, 'slovo', 'slova', 'slov')}`,
    `${count} ${count === 1 ? 'word' : 'words'}`,
  );
}

export function aeoChecks(ctx: AuditContext): CheckResult[] {
  const t = translator(ctx.locale);
  const { $, jsonLd, locale } = ctx;
  const checks: CheckResult[] = [];

  const bodyWords = wordCount(visibleText($));
  const contentPage = isContentPage(ctx, bodyWords);

  /* --- FAQPage / HowTo schema --- */
  const hasFaq = hasType(jsonLd, 'FAQPage', 'Question');
  const hasHowTo = hasType(jsonLd, 'HowTo');
  const found: string[] = [];
  if (hasFaq) found.push('FAQPage');
  if (hasHowTo) found.push('HowTo');

  checks.push({
    id: 'aeo-schema',
    label: t('Schéma FAQPage nebo HowTo', 'FAQPage or HowTo schema'),
    status: found.length > 0 ? 'pass' : 'fail',
    value: found.length > 0 ? found.join(' + ') : t('chybí', 'missing'),
    weight: 2,
    detail:
      found.length > 0
        ? t(
            `Stránka obsahuje strukturovaná data typu ${found.join(' a ')}, což je nejpřímější způsob, jak nabídnout odpovědi vyhledávačům i AI asistentům. Otázky a odpovědi tak jdou přečíst strojově, bez hádání ze surového textu. Hlídejte, aby se obsah schématu shodoval s tím, co je vidět na stránce.`,
            `The page carries ${found.join(' and ')} structured data, the most direct way to offer answers to search engines and AI assistants. Questions and answers can be read machine-side without guessing from raw text. Keep the schema content in sync with what is visible on the page.`,
          )
        : t(
            'Stránka nemá schéma FAQPage ani HowTo. AI asistenti a vyhledávače pak musí odpovědi odhadovat z běžného textu, což snižuje šanci, že vaši stránku odcitují. Pokud stránka obsahuje otázky a odpovědi nebo návod, doplňte odpovídající JSON-LD.',
            'The page has neither FAQPage nor HowTo schema. AI assistants and search engines then have to infer answers from plain text, which lowers the chance of your page being cited. If the page contains questions and answers or a how-to, add the matching JSON-LD.',
          ),
  });

  /* --- Otázkové nadpisy --- */
  const headings = $('h2, h3')
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);
  const questionHeadings = headings.filter(isQuestionHeading);
  const questionLabel = t('Otázkové nadpisy (H2/H3)', 'Question-style headings (H2/H3)');

  if (!contentPage) {
    checks.push({
      id: 'question-headings',
      label: questionLabel,
      status: 'unknown',
      value: t('netextová stránka', 'not a content page'),
      weight: 1,
      detail: notContentDetail(t),
    });
  } else if (headings.length === 0) {
    checks.push({
      id: 'question-headings',
      label: questionLabel,
      status: 'fail',
      value: t('žádné H2/H3', 'no H2/H3'),
      weight: 1,
      detail: t(
        'Stránka nemá žádné nadpisy H2 ani H3, takže obsah nenabízí žádné dílčí sekce, které by šlo citovat jako odpověď. Rozdělte text na tematické sekce s výstižnými nadpisy. Nadpisy formulované jako otázky mají v AI odpovědích výrazně vyšší šanci na citaci.',
        'The page has no H2 or H3 headings, so the content offers no sub-sections that could be quoted as an answer. Split the text into topical sections with descriptive headings. Headings phrased as questions are far more likely to be cited in AI answers.',
      ),
    });
  } else {
    const ratio = (questionHeadings.length / headings.length) * 100;
    const pct = formatPercent(ratio, locale);
    checks.push({
      id: 'question-headings',
      label: questionLabel,
      status: questionHeadings.length >= 3 || ratio >= 30 ? 'pass' : questionHeadings.length >= 1 ? 'warn' : 'fail',
      value: t(
        `${questionHeadings.length} z ${headings.length} (${pct})`,
        `${questionHeadings.length} of ${headings.length} (${pct})`,
      ),
      weight: 1,
      detail:
        questionHeadings.length >= 3 || ratio >= 30
          ? t(
              `Podstatná část nadpisů je formulovaná jako otázka (${questionHeadings.length} z ${headings.length}). To je přesně formát, který vyhledávače i AI asistenti rádi přebírají do odpovědí. Držte pod každou otázkou krátkou a přímou odpověď hned v prvním odstavci.`,
              `A meaningful share of the headings is phrased as a question (${questionHeadings.length} of ${headings.length}). That is exactly the format search engines and AI assistants like to lift into answers. Keep a short, direct answer in the first paragraph under each question.`,
            )
          : questionHeadings.length >= 1
            ? t(
                `Otázkové nadpisy se na stránce objevují, ale jen výjimečně (${questionHeadings.length} z ${headings.length}). Přeformulujte část sekcí do podoby otázek, které lidé reálně zadávají do vyhledávače. Zvýšíte tím šanci, že se váš text objeví jako přímá odpověď.`,
                `Question-style headings appear, but only rarely (${questionHeadings.length} of ${headings.length}). Rephrase some sections as questions people actually type into a search box. That raises the chance your text shows up as a direct answer.`,
              )
            : t(
                `Žádný z ${headings.length} nadpisů H2/H3 není formulovaný jako otázka. AI asistenti hledají v obsahu dvojice otázka–odpověď, a tady je nenajdou. Doplňte sekce s nadpisy typu „Jak…", „Co je…" nebo „Proč…" a hned pod ně stručnou odpověď.`,
                `None of the ${headings.length} H2/H3 headings is phrased as a question. AI assistants look for question-and-answer pairs and will not find any here. Add sections with headings like “How to…”, “What is…” or “Why…” followed immediately by a short answer.`,
              ),
      meta: questionHeadings.length > 0 ? { kind: 'list', items: questionHeadings.slice(0, 6) } : undefined,
    });
  }

  /* --- Přímá odpověď v prvním odstavci pod nadpisem --- */
  const firstSectionHeading = $('h2, h3').first();
  const answerLabel = t('Přímá odpověď pod prvním nadpisem', 'Direct answer under the first heading');

  if (!contentPage) {
    checks.push({
      id: 'direct-answer',
      label: answerLabel,
      status: 'unknown',
      value: t('netextová stránka', 'not a content page'),
      weight: 1,
      detail: notContentDetail(t),
    });
  } else if (firstSectionHeading.length === 0) {
    checks.push({
      id: 'direct-answer',
      label: answerLabel,
      status: 'unknown',
      value: t('nelze vyhodnotit', 'cannot evaluate'),
      weight: 1,
      detail: t(
        'Na stránce není žádný nadpis H2 ani H3, pod kterým by šlo první odstavec vyhodnotit. Bez sekcí nelze extrahovatelnost odpovědí posoudit. Do skóre se tato kontrola nezapočítává.',
        'There is no H2 or H3 heading whose first paragraph could be evaluated. Without sections, answer extractability cannot be judged. This check does not count towards the score.',
      ),
    });
  } else {
    const paragraph = firstSectionHeading.nextAll('p').first();
    const paragraphText = paragraph.text().trim();

    if (!paragraphText) {
      checks.push({
        id: 'direct-answer',
        label: answerLabel,
        status: 'warn',
        value: t('žádný odstavec', 'no paragraph'),
        weight: 1,
        detail: t(
          'Hned pod prvním nadpisem H2/H3 není odstavec textu — následuje jiný prvek (obrázek, seznam, další nadpis). AI asistenti hledají souvislou odpověď hned pod nadpisem. Doplňte za nadpis krátký shrnující odstavec do zhruba 50 slov.',
          'There is no paragraph of text directly under the first H2/H3 — another element follows (an image, a list, another heading). AI assistants look for a continuous answer right below the heading. Add a short summarising paragraph of about 50 words.',
        ),
      });
    } else {
      const count = wordCount(paragraphText);
      checks.push({
        id: 'direct-answer',
        label: answerLabel,
        status: count <= 50 ? 'pass' : count <= 90 ? 'warn' : 'fail',
        value: words(count, t),
        weight: 1,
        detail:
          count <= 50
            ? t(
                `První odstavec pod nadpisem má ${count} slov, takže funguje jako stručná, dobře extrahovatelná odpověď. Právě takové úseky přebírají AI asistenti do svých odpovědí. Stejný vzorec zopakujte i u dalších sekcí.`,
                `The first paragraph under the heading is ${count} words, which works as a concise, easily extracted answer. These are exactly the passages AI assistants lift into their answers. Repeat the same pattern in the other sections.`,
              )
            : count <= 90
              ? t(
                  `První odstavec pod nadpisem má ${count} slov, což je na přímou odpověď trochu moc. Zkraťte úvodní odstavec pod 50 slov a detaily přesuňte do dalších odstavců. Krátká odpověď na začátku výrazně zvyšuje šanci na citaci v AI výsledcích.`,
                  `The first paragraph under the heading is ${count} words, a bit long for a direct answer. Cut the opening paragraph below 50 words and move the details into later paragraphs. A short answer up front sharply increases the chance of being cited.`,
                )
              : t(
                  `První odstavec pod nadpisem má ${count} slov — pro extrakci odpovědi je příliš dlouhý. Rozdělte ho tak, aby první odstavec obsahoval jednovětou až dvouvětou odpověď a zbytek následoval samostatně. Tento vzorec (odpověď napřed, kontext potom) je základ AEO.`,
                  `The first paragraph under the heading is ${count} words — too long for answer extraction. Split it so the first paragraph holds a one- or two-sentence answer and the rest follows separately. This pattern (answer first, context second) is the foundation of AEO.`,
                ),
      });
    }
  }

  /* --- Hloubka obsahu --- */
  checks.push({
    id: 'content-depth',
    label: t('Hloubka obsahu', 'Content depth'),
    status: bodyWords >= 600 ? 'pass' : bodyWords >= 250 ? 'warn' : 'fail',
    score: ramp(Math.max(0, 600 - bodyWords), DEPTH_ANCHORS),
    value: words(bodyWords, t),
    weight: 1,
    detail:
      bodyWords >= 600
        ? t(
            `Stránka nabízí ${bodyWords} slov textu, což je dost na to, aby z ní šla vytáhnout smysluplná odpověď. AI asistenti potřebují kontext, ne jen heslo. Hlídejte, ať je text věcný — délka sama o sobě nestačí.`,
            `The page offers ${bodyWords} words of text, enough to extract a meaningful answer from. AI assistants need context, not just a slogan. Keep the text substantive — length alone is not enough.`,
          )
        : bodyWords >= 250
          ? t(
              `Stránka má ${bodyWords} slov viditelného textu. Na citaci v AI odpovědi je to hraniční — asistent nemá z čeho čerpat kontext. Doplňte konkrétní informace, které návštěvník opravdu hledá, ideálně v členěných sekcích.`,
              `The page has ${bodyWords} words of visible text. That is borderline for being cited in an AI answer — the assistant has little context to draw on. Add the specific information visitors actually look for, ideally in structured sections.`,
            )
          : t(
              `Ve staženém HTML je jen ${bodyWords} slov textu. Z takto tenké stránky nemá AI asistent co citovat a vyhledávače ji považují za obsahově slabou. Pokud se text dogenerovává JavaScriptem, zvažte serverové vykreslování — jinak obsah doplňte.`,
              `The downloaded HTML holds only ${bodyWords} words of text. There is nothing for an AI assistant to cite on a page this thin, and search engines treat it as thin content. If the text is generated by JavaScript, consider server-side rendering — otherwise add content.`,
            ),
  });

  /* --- Strukturované formáty odpovědi --- */
  const structuredBlocks = $('ul, ol, table').filter(
    (_, element) => $(element).closest('nav, header, footer').length === 0,
  ).length;
  checks.push({
    id: 'answer-format',
    label: t('Seznamy a tabulky v obsahu', 'Lists and tables in the content'),
    status: structuredBlocks >= 2 ? 'pass' : structuredBlocks === 1 ? 'warn' : 'fail',
    value: t(
      `${structuredBlocks} ${pluralCz(structuredBlocks, 'blok', 'bloky', 'bloků')}`,
      `${structuredBlocks} ${structuredBlocks === 1 ? 'block' : 'blocks'}`,
    ),
    weight: 1,
    detail:
      structuredBlocks >= 2
        ? t(
            `Obsah používá ${structuredBlocks} seznamů nebo tabulek mimo navigaci. Právě tyhle bloky se do AI odpovědí i do výpisů ve vyhledávání přebírají nejsnáz, protože mají jasnou strukturu. Držte položky krátké a srovnatelné.`,
            `The content uses ${structuredBlocks} lists or tables outside the navigation. These blocks are the easiest to lift into AI answers and search snippets because their structure is explicit. Keep the items short and comparable.`,
          )
        : structuredBlocks === 1
          ? t(
              'V obsahu je jediný seznam nebo tabulka. Kroky, parametry a výčty převeďte z běžných vět do `<ul>`, `<ol>` nebo `<table>` — strukturovaný blok se cituje mnohem snáz než odstavec. Navigační menu se do této kontroly nepočítá.',
              'The content has a single list or table. Move steps, parameters and enumerations out of prose into `<ul>`, `<ol>` or `<table>` — a structured block is far easier to cite than a paragraph. Navigation menus are excluded from this check.',
            )
          : t(
              'V obsahu mimo navigaci není žádný seznam ani tabulka. Souvislý text se do odpovědí přebírá hůř než výčet nebo srovnávací tabulka. Převeďte kroky návodu do `<ol>`, parametry do `<table>` a výhody do `<ul>`.',
              'There is no list or table in the content outside the navigation. Continuous prose is harder to lift into an answer than a bulleted list or a comparison table. Turn how-to steps into `<ol>`, parameters into `<table>` and benefits into `<ul>`.',
            ),
  });

  /* --- Délka odstavců --- */
  const paragraphWords = $('p')
    .map((_, element) => wordCount($(element).text()))
    .get()
    .filter((count) => count >= 3);
  const paragraphLabel = t('Délka odstavců', 'Paragraph length');

  if (paragraphWords.length === 0) {
    checks.push({
      id: 'paragraph-length',
      label: paragraphLabel,
      status: 'unknown',
      value: t('žádné odstavce', 'no paragraphs'),
      weight: 1,
      detail: t(
        'Ve staženém HTML nejsou žádné odstavce `<p>` s textem, takže délku odstavců nelze vyhodnotit. Pokud se text dogenerovává JavaScriptem, audit ho nevidí. Do skóre se tato kontrola nezapočítává.',
        'The downloaded HTML contains no `<p>` paragraphs with text, so paragraph length cannot be evaluated. If the text is generated by JavaScript, the audit does not see it. This check does not count towards the score.',
      ),
    });
  } else {
    const medianWords = median(paragraphWords);
    checks.push({
      id: 'paragraph-length',
      label: paragraphLabel,
      status: medianWords <= 60 ? 'pass' : medianWords <= 100 ? 'warn' : 'fail',
      score: ramp(medianWords, PARAGRAPH_ANCHORS),
      value: t(
        `medián ${medianWords} ${pluralCz(Math.round(medianWords), 'slovo', 'slova', 'slov')}`,
        `median ${medianWords} ${Math.round(medianWords) === 1 ? 'word' : 'words'}`,
      ),
      weight: 1,
      detail:
        medianWords <= 60
          ? t(
              `Odstavce mají medián ${medianWords} slov, takže tvoří samostatně srozumitelné úseky. Přesně takové bloky se dají vytrhnout jako odpověď bez ztráty smyslu. Zachovejte jednu myšlenku na odstavec.`,
              `Paragraphs have a median of ${medianWords} words, so each forms a self-contained, understandable chunk. Blocks like these can be pulled out as an answer without losing their meaning. Keep one idea per paragraph.`,
            )
          : medianWords <= 100
            ? t(
                `Odstavce jsou spíš delší (medián ${medianWords} slov). AI asistent pak musí odpověď skládat z části bloku, což snižuje šanci na přesnou citaci. Rozdělte delší pasáže tak, aby každý odstavec nesl jednu myšlenku.`,
                `Paragraphs are on the long side (median ${medianWords} words). An AI assistant then has to assemble an answer from part of a block, which lowers the chance of an accurate citation. Break longer passages so each paragraph carries one idea.`,
              )
            : t(
                `Odstavce jsou dlouhé (medián ${medianWords} slov) a mísí víc myšlenek dohromady. Z takového bloku se nedá vytáhnout krátká odpověď. Rozsekejte text na kratší odstavce a klíčové výčty převeďte do seznamů.`,
                `Paragraphs are long (median ${medianWords} words) and mix several ideas together. No short answer can be extracted from a block like that. Cut the text into shorter paragraphs and turn the key enumerations into lists.`,
              ),
    });
  }

  return checks;
}
