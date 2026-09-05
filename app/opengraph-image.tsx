import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#08080a',
          color: '#efeae1',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(115deg, rgb(96,140,255), rgb(176,112,255))',
              fontSize: 30,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            S
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>Audit webu</div>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 56,
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            maxWidth: 980,
          }}
        >
          Zjistěte, jak váš web vidí Google i umělá inteligence.
        </div>

        <div style={{ display: 'flex', marginTop: 36, gap: 14 }}>
          {['Rychlost', 'SEO', 'AEO', 'GEO', 'Tech'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                padding: '10px 20px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.18)',
                fontSize: 22,
                color: '#a5a099',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 24, color: '#7a7870' }}>
          audit.semakod.cz · vytvořil Semakod
        </div>
      </div>
    ),
    { ...size },
  );
}
