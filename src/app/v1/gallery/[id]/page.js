import { permanentRedirect } from 'next/navigation';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function LegacyGalleryDetailPage() {
  const headersList = await headers();
  const originalPath = headersList.get('x-original-path') || '';
  const isV1Path = originalPath === '/v1' || originalPath.startsWith('/v1/');
  const redirectPrefix = isV1Path ? '/v1' : '';

  permanentRedirect(`${redirectPrefix}/gallery`);
}
