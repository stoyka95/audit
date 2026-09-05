import { ImageResponse } from 'next/og';
import { brandLogoDataUri } from '@/lib/brandLogo';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgb(8,8,10)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brandLogoDataUri()} width={128} height={128} alt="" />
      </div>
    ),
    { ...size },
  );
}
