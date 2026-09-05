import { Fragment } from 'react';

/**
 * Texty kontrol i tipů zapisují kód mezi zpětné apostrofy (`<title>`, `alt=""`).
 * Bez tohohle převodu by se apostrofy vykreslily doslova. Žádný markdown se tu
 * neřeší — jen tenhle jeden tvar, který v textech opravdu používáme.
 */
export default function RichText({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/g);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code
            key={index}
            className="rounded-[5px] border border-line bg-inset px-1 py-px font-mono text-[0.85em] text-bone"
          >
            {part}
          </code>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
