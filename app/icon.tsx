import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** Favicon — stejný "S" monogram a přechod jako logo v navigaci. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          background: 'linear-gradient(115deg, rgb(58,102,246), rgb(142,66,240))',
        }}
      >
        <span
          style={{
            fontFamily: 'sans-serif',
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1,
          }}
        >
          S
        </span>
      </div>
    ),
    { ...size },
  );
}
