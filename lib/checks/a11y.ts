import { formatPercent, pluralCz } from '../format';
import { translator } from '../i18n';
import { ramp, type RampAnchors } from '../scoring';
import type { AuditContext, CheckResult } from '../types';

/** Podíl needosažitelných formulářových polí v procentech: 0 % ideál, 20 % hranice fail. */
const FORM_LABEL_ANCHORS: RampAnchors = { good: 0, poor: 20, zero: 100 };

const NON_LABELABLE_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'image', 'reset']);

const SKIP_LINK_PATTERN =
  /skip|přeskoč|preskoc|na obsah|do obsahu|na hlavní obsah|to content|to main|to navigation/i;

export function a11yChecks(ctx: AuditContext): CheckResult[] {
  const t = translator(ctx.locale);
  const { $, locale } = ctx;
  const checks: CheckResult[] = [];

  /* --- Sémantické landmarky --- */
  const mainCount = $('main').length;
  const hasNav = $('nav').length > 0;
  const hasHeaderFooter = $('header').length > 0 || $('footer').length > 0;
  const landmarkScore = (mainCount > 0 ? 1 : 0) + (hasNav ? 1 : 0) + (hasHeaderFooter ? 1 : 0);
  const landmarkLabel = t('Sémantické landmarky (main, nav, header/footer)', 'Semantic landmarks (main, nav, header/footer)');

  if (mainCount > 1) {
    checks.push({
      id: 'a11y-landmarks',
      label: landmarkLabel,
      status: 'warn',
      value: t(`${mainCount}× <main>`, `${mainCount}× <main>`),
      weight: 2,
      detail: t(
        `Stránka obsahuje ${mainCount} tagů \`<main>\`, ale povolený je jen jeden na stránku. Asistenční technologie pak nemusí správně určit hlavní obsah, na který se dá skočit. Ponechte jediný \`<main>\` obalující skutečný obsah stránky.`,
        `The page contains ${mainCount} \`<main>\` tags, but only one is allowed per page. Assistive technology may then fail to identify the primary content to jump to. Keep a single \`<main>\` wrapping the actual page content.`,
      ),
    });
  } else {
    checks.push({
      id: 'a11y-landmarks',
      label: landmarkLabel,
      status: landmarkScore === 3 ? 'pass' : landmarkScore >= 2 ? 'warn' : 'fail',
      value: t(`${landmarkScore} ze 3`, `${landmarkScore} of 3`),
      weight: 2,
      detail:
        landmarkScore === 3
          ? t(
              'Stránka používá sémantické HTML5 landmarky — `<main>`, `<nav>` a `<header>` nebo `<footer>`. Čtečky obrazovky díky nim nabídnou navigaci mezi oblastmi stránky a uživatel se v obsahu rychle zorientuje bez čtení všeho popořadě.',
              'The page uses semantic HTML5 landmarks — `<main>`, `<nav>` and `<header>` or `<footer>`. Screen readers offer navigation between page regions because of them, so users can orient themselves without reading everything in order.',
            )
          : t(
              `Stránce chybí část sémantických landmarků: main ${mainCount > 0 ? 'je' : 'chybí'}, nav ${hasNav ? 'je' : 'chybí'}, header/footer ${hasHeaderFooter ? 'je' : 'chybí'}. Bez nich čtečka obrazovky nabídne jen lineární čtení celé stránky. Obalte hlavní obsah do \`<main>\`, navigaci do \`<nav>\` a hlavičku/patičku do \`<header>\`/\`<footer>\`.`,
              `The page is missing some semantic landmarks: main is ${mainCount > 0 ? 'present' : 'missing'}, nav is ${hasNav ? 'present' : 'missing'}, header/footer is ${hasHeaderFooter ? 'present' : 'missing'}. Without them a screen reader only offers linear reading of the whole page. Wrap the primary content in \`<main>\`, navigation in \`<nav>\`, and the header/footer in \`<header>\`/\`<footer>\`.`,
            ),
    });
  }

  /* --- Odkaz „přeskočit na obsah" --- */
  let hasSkipLink = false;
  $('a[href^="#"]').each((_, element) => {
    if (hasSkipLink) return;
    const node = $(element);
    const haystack = `${node.text()} ${node.attr('class') ?? ''} ${node.attr('id') ?? ''} ${node.attr('aria-label') ?? ''}`;
    if (SKIP_LINK_PATTERN.test(haystack)) hasSkipLink = true;
  });
  checks.push({
    id: 'a11y-skip-link',
    label: t('Odkaz „přeskočit na obsah"', '"Skip to content" link'),
    status: hasSkipLink ? 'pass' : 'warn',
    value: hasSkipLink ? t('nalezen', 'found') : t('nenalezen', 'not found'),
    weight: 1,
    detail: hasSkipLink
      ? t(
          'Stránka nabízí odkaz pro přeskočení opakující se navigace rovnou na hlavní obsah. Uživatelé klávesnice a čteček obrazovky tak nemusí při každém načtení stránky procházet celé menu znovu.',
          'The page offers a link that skips repeated navigation straight to the main content, so keyboard and screen-reader users do not have to tab through the whole menu on every page load.',
        )
      : t(
          'Na stránce jsme nenašli odkaz „přeskočit na obsah" na začátku `<body>`. Uživatel klávesnice tak musí projít celou navigaci znovu na každé podstránce. Přidejte na začátek stránky viditelný (alespoň při focusu) odkaz `<a href="#main">Přeskočit na obsah</a>`.',
          'We found no "skip to content" link at the start of `<body>`. A keyboard user must tab through the whole navigation again on every subpage. Add a link visible at least on focus at the top of the page: `<a href="#main">Skip to content</a>`.',
        ),
  });

  /* --- Popisky formulářových polí --- */
  const labelFors = new Set<string>();
  $('label[for]').each((_, element) => {
    const value = $(element).attr('for');
    if (value) labelFors.add(value);
  });

  const fields = $('input, textarea, select').filter((_, element) => {
    const type = ($(element).attr('type') ?? '').toLowerCase();
    return !NON_LABELABLE_INPUT_TYPES.has(type);
  });
  const totalFields = fields.length;
  const formLabel = t('Popisky formulářových polí', 'Form field labels');

  if (totalFields === 0) {
    checks.push({
      id: 'a11y-form-labels',
      label: formLabel,
      status: 'pass',
      value: t('žádná pole', 'no fields'),
      weight: 2,
      detail: t(
        'Stránka neobsahuje žádná formulářová pole, která by potřebovala popisek. Kontrola se do skóre nepromítá restriktivně, jde spíš o informaci, že tu není co zkontrolovat.',
        'The page has no form fields that would need a label. This is more of an informational result than a strict pass, since there is simply nothing to check.',
      ),
    });
  } else {
    let unlabeled = 0;
    fields.each((_, element) => {
      const node = $(element);
      const id = node.attr('id');
      const hasLabelFor = id ? labelFors.has(id) : false;
      const wrappedInLabel = node.parents('label').length > 0;
      const ariaLabel = (node.attr('aria-label') ?? '').trim();
      const ariaLabelledby = node.attr('aria-labelledby');
      if (!hasLabelFor && !wrappedInLabel && !ariaLabel && !ariaLabelledby) unlabeled += 1;
    });
    const ratio = (unlabeled / totalFields) * 100;
    const pct = formatPercent(ratio, locale);
    checks.push({
      id: 'a11y-form-labels',
      label: formLabel,
      status: unlabeled === 0 ? 'pass' : ratio <= 20 ? 'warn' : 'fail',
      score: ramp(ratio, FORM_LABEL_ANCHORS),
      value: t(`${unlabeled} z ${totalFields} bez popisku (${pct})`, `${unlabeled} of ${totalFields} without a label (${pct})`),
      weight: 2,
      detail:
        unlabeled === 0
          ? t(
              `Všech ${totalFields} formulářových polí má popisek přes \`<label for>\`, obalující \`<label>\` nebo atribut aria-label. Uživatel čtečky obrazovky tak u každého pole slyší, co má vyplnit, ne jen typ prvku.`,
              `All ${totalFields} form fields have a label via \`<label for>\`, a wrapping \`<label>\`, or an aria-label attribute. A screen-reader user hears what to fill in at every field, not just the element type.`,
            )
          : t(
              `${unlabeled} z ${totalFields} formulářových polí (${pct}) nemá žádný popisek — ani \`<label>\`, ani aria-label. Čtečka obrazovky u nich přečte jen „textové pole" bez kontextu, což u přihlašovacích a objednávkových formulářů vede k chybám. Placeholder popisek nenahrazuje, mizí po začátku psaní.`,
              `${unlabeled} of ${totalFields} form fields (${pct}) has no label at all — neither a \`<label>\` nor an aria-label. A screen reader announces just "text field" with no context, which causes errors on login and checkout forms. A placeholder does not substitute for a label; it disappears once typing starts.`,
            ),
    });
  }

  /* --- Přístupný název odkazů a tlačítek --- */
  const interactive = $('a[href], button');
  const totalInteractive = interactive.length;
  const nameLabel = t('Přístupný název odkazů a tlačítek', 'Accessible name of links and buttons');

  if (totalInteractive === 0) {
    checks.push({
      id: 'a11y-accessible-names',
      label: nameLabel,
      status: 'pass',
      value: t('žádné prvky', 'no elements'),
      weight: 2,
      detail: t(
        'Stránka neobsahuje žádné odkazy ani tlačítka, takže není co kontrolovat.',
        'The page contains no links or buttons, so there is nothing to check.',
      ),
    });
  } else {
    const unnamed: string[] = [];
    interactive.each((_, element) => {
      const node = $(element);
      const text = node.text().replace(/\s+/g, ' ').trim();
      const ariaLabel = (node.attr('aria-label') ?? '').trim();
      const ariaLabelledby = node.attr('aria-labelledby');
      const title = (node.attr('title') ?? '').trim();
      const hasAltImage = node.find('img[alt]').toArray().some((img) => ($(img).attr('alt') ?? '').trim().length > 0);
      const hasSvgTitle = node.find('title').length > 0;
      const hasName = text.length > 0 || ariaLabel.length > 0 || Boolean(ariaLabelledby) || title.length > 0 || hasAltImage || hasSvgTitle;
      if (!hasName) {
        const tag = (element as { tagName?: string }).tagName ?? 'a';
        const href = node.attr('href');
        unnamed.push(href ? `<${tag} href="${href}">` : `<${tag}>`);
      }
    });

    checks.push({
      id: 'a11y-accessible-names',
      label: nameLabel,
      status: unnamed.length === 0 ? 'pass' : 'fail',
      value: unnamed.length === 0 ? t('všechny pojmenované', 'all named') : t(`${unnamed.length} bez názvu`, `${unnamed.length} without a name`),
      weight: 2,
      detail:
        unnamed.length === 0
          ? t(
              `Všech ${totalInteractive} odkazů a tlačítek má přístupný název — text, aria-label nebo popsaný obrázek uvnitř. Čtečka obrazovky tak u každého prvku ohlásí, k čemu slouží, místo aby přečetla jen „odkaz" nebo „tlačítko".`,
              `All ${totalInteractive} links and buttons have an accessible name — text, an aria-label, or a described image inside. A screen reader announces what each element does instead of just reading "link" or "button".`,
            )
          : t(
              `${unnamed.length} ${pluralCz(unnamed.length, 'odkaz nebo tlačítko nemá', 'odkazy nebo tlačítka nemají', 'odkazů nebo tlačítek nemá')} přístupný název — typicky ikonové tlačítko bez textu a bez aria-label. Čtečka obrazovky takový prvek ohlásí holě jako „odkaz" nebo „tlačítko" bez informace, co udělá. Doplňte viditelný text nebo \`aria-label="…"\`.`,
              `${unnamed.length} ${unnamed.length === 1 ? 'link or button has' : 'links or buttons have'} no accessible name — typically an icon-only button with no text and no aria-label. A screen reader announces it bluntly as "link" or "button" with no clue what it does. Add visible text or \`aria-label="…"\`.`,
            ),
      meta: unnamed.length > 0 ? { kind: 'list', items: unnamed.slice(0, 8) } : undefined,
    });
  }

  /* --- Skryté prvky s fokusovatelným obsahem --- */
  const trapped: string[] = [];
  $('[aria-hidden="true"]').each((_, element) => {
    const node = $(element);
    const focusable = node.find('a[href], button, input, select, textarea, [tabindex]').filter((_, descendant) => {
      return $(descendant).attr('tabindex') !== '-1';
    });
    if (focusable.length > 0) {
      const tag = (element as { tagName?: string }).tagName ?? 'div';
      trapped.push(`<${tag} aria-hidden="true">`);
    }
  });
  checks.push({
    id: 'a11y-aria-hidden-focusable',
    label: t('aria-hidden bez skrytí z tabulátoru', 'aria-hidden without removing tab focus'),
    status: trapped.length === 0 ? 'pass' : 'fail',
    value: trapped.length === 0 ? t('v pořádku', 'clean') : t(`${trapped.length} výskytů`, `${trapped.length} occurrences`),
    weight: 1,
    detail:
      trapped.length === 0
        ? t(
            'Žádný prvek s `aria-hidden="true"` neobsahuje fokusovatelný obsah, který by se do tabulátoru dostal, ale čtečka obrazovky by o něm nevěděla. To je běžná past u skrytých menu a modálních oken.',
            'No element with `aria-hidden="true"` contains focusable content that would remain reachable by keyboard while invisible to a screen reader — a common trap in hidden menus and modals.',
          )
        : t(
            `${trapped.length} ${pluralCz(trapped.length, 'prvek s aria-hidden obsahuje', 'prvky s aria-hidden obsahují', 'prvků s aria-hidden obsahuje')} odkaz, tlačítko nebo pole, které zůstává dosažitelné klávesnicí (tabulátorem), i když je pro čtečku obrazovky skryté. Uživatel klávesnice se pak dostane na prvek, o kterém neví, protože ho čtečka nepřečte. Doplňte na fokusovatelné potomky \`tabindex="-1"\`, dokud jsou skrytí.`,
            `${trapped.length} ${trapped.length === 1 ? 'element with aria-hidden contains' : 'elements with aria-hidden contain'} a link, button, or field that remains reachable by keyboard (tab) even though it is hidden from screen readers. A keyboard user can land on an element they never hear announced. Add \`tabindex="-1"\` to focusable descendants while they stay hidden.`,
        ),
    meta: trapped.length > 0 ? { kind: 'list', items: trapped.slice(0, 8) } : undefined,
  });

  /* --- Kladné hodnoty tabindex --- */
  let positiveTabindex = 0;
  $('[tabindex]').each((_, element) => {
    const raw = Number($(element).attr('tabindex'));
    if (Number.isFinite(raw) && raw > 0) positiveTabindex += 1;
  });
  checks.push({
    id: 'a11y-positive-tabindex',
    label: t('Kladné hodnoty tabindex', 'Positive tabindex values'),
    status: positiveTabindex === 0 ? 'pass' : 'warn',
    value: positiveTabindex === 0 ? t('žádné', 'none') : String(positiveTabindex),
    weight: 1,
    detail:
      positiveTabindex === 0
        ? t(
            'Stránka nepoužívá kladné hodnoty `tabindex`, takže pořadí procházení klávesnicí odpovídá pořadí prvků v HTML — přirozené a předvídatelné.',
            'The page uses no positive `tabindex` values, so the keyboard tab order follows the order of elements in the HTML — natural and predictable.',
          )
        : t(
            `Na stránce je ${positiveTabindex} ${pluralCz(positiveTabindex, 'prvek s kladnou hodnotou', 'prvky s kladnou hodnotou', 'prvků s kladnou hodnotou')} tabindex. Přebíjí to přirozené pořadí procházení a u složitějších stránek snadno vytvoří matoucí skoky mezi vzdálenými prvky. Použijte \`tabindex="0"\`, nebo pořadí raději upravte přeskládáním v HTML.`,
            `The page has ${positiveTabindex} ${positiveTabindex === 1 ? 'element with a positive' : 'elements with a positive'} tabindex value. This overrides the natural tab order and easily creates confusing jumps between distant elements on more complex pages. Use \`tabindex="0"\`, or fix the order by rearranging the HTML instead.`,
          ),
  });

  return checks;
}
