// /:legalApp/:legalDoc (port of src/app/[legalApp]/[legalDoc]/page.js).
import type { ComponentType, ReactNode } from 'react';
import LegalShellJs from '@/app/components/legal/LegalShell';
import LegalContentJs from '@/app/components/legal/LegalContent';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

type Doc = { slug: string; title: string; content: string; format: string; effectiveDate?: string; updatedAt?: string };
type App = { slug: string; name: string; packageName?: string; contactEmail?: string; documents: Doc[] };
type Data = { app: App; document: Doc; linkedApp: unknown };
const LegalShell = LegalShellJs as ComponentType<{
  eyebrow: string; title: string; meta: string[]; app: App; documents: Doc[]; activeSlug: string; linkedApp: unknown; children?: ReactNode;
}>;
const LegalContent = LegalContentJs as ComponentType<{ content: string; format: string }>;

function formatDate(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export default function LegalDocPage() {
  const { page, status, loading } = usePageData<Data>();
  if (loading) return <Pending />;
  if (status === 404 || !page?.document) return <NotFound />;
  const { app, document, linkedApp } = page;
  const updated = formatDate(document.updatedAt);
  const meta = [
    document.effectiveDate && `effective: ${document.effectiveDate}`,
    updated && `last updated: ${updated}`,
    app.packageName && `package: ${app.packageName}`,
  ].filter(Boolean) as string[];
  return (
    <LegalShell
      eyebrow={`~/${app.slug} — legal`}
      title={document.title}
      meta={meta}
      app={app}
      documents={app.documents}
      activeSlug={document.slug}
      linkedApp={linkedApp}
    >
      <LegalContent content={document.content} format={document.format} />
      {app.contactEmail && (
        <p className="mt-10 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Questions? Contact{' '}
          <a href={`mailto:${app.contactEmail}`} className="underline underline-offset-4" style={{ color: 'var(--accent-cyan)' }}>
            {app.contactEmail}
          </a>
        </p>
      )}
    </LegalShell>
  );
}
