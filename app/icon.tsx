import { ImageResponse } from 'next/og';
import { brandLogoDataUri } from '@/lib/brandLogo';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

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
          background: 'rgb(8,8,10)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brandLogoDataUri()} width={24} height={24} alt="" />
      </div>
    ),
    { ...size },
  );
}
