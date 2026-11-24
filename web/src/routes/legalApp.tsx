// /:legalApp (port of src/app/[legalApp]/page.js). Only reached for real legal apps: Rust sends every other
// single-segment path to Next.
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import LegalShellJs from '@/app/components/legal/LegalShell';
import LegalShowcaseCardsJs from '@/app/components/legal/LegalShowcaseCards';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

type Doc = { slug: string; title: string };
type App = { slug: string; name: string; packageName?: string; documents: Doc[] };
type Card = { status?: string; type?: string; externalUrl?: string } | null;
type Data = { app: App; showcase: { app: Card; project: unknown }; lede: string };
const LegalShell = LegalShellJs as ComponentType<{ eyebrow: string; title: string; meta: string[]; app: App; children?: ReactNode }>;
const LegalShowcaseCards = LegalShowcaseCardsJs as ComponentType<{ app: Card; project: unknown }>;

const productLabel = (type?: string) => (!type ? 'App' : /\bapp\b/i.test(type) ? type : `${type} App`);

export default function LegalAppPage() {
  const { page, status, loading } = usePageData<Data>();
  if (loading) return <Pending />;
  if (status === 404 || !page?.app) return <NotFound />;
  const { app, showcase, lede: text } = page;
  const product = showcase.app;
  const externalUrl = /^https?:\/\//i.test(product?.externalUrl || '') ? product!.externalUrl! : '';
  const meta = [product?.status, product?.type, app.packageName && `package: ${app.packageName}`].filter(Boolean) as string[];
  const docPath = (doc: Doc) => `/${app.slug}/${doc.slug}`;

  return (
    <LegalShell eyebrow={product ? `~/${app.slug} — ${productLabel(product.type).toLowerCase()}` : '~/legal'} title={app.name} meta={meta} app={app}>
      {text && (
        <p className="mb-8 text-lg leading-relaxed sm:text-xl" style={{ color: 'var(--text-tertiary)' }}>{text}</p>
      )}
      {Boolean(externalUrl || product || showcase.project) && (
        <div className="mb-14 flex flex-wrap gap-3 font-mono text-sm">
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-semibold transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-primary, #05070d)' }}
            >
              open --app ↗
            </a>
          )}
          {app.documents.length > 0 && (
            <a
              href="#legal"
              className="inline-flex items-center gap-2 rounded-full border px-5 py-2 transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              legal --pages ↓
            </a>
          )}
        </div>
      )}
      <LegalShowcaseCards app={showcase.app} project={showcase.project} />
      {app.documents.length > 0 && (
        <section id="legal" aria-labelledby="legal-heading" className="scroll-mt-28">
          <h2 id="legal-heading" className="mb-2 font-mono text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-tertiary)' }}>
            {`// ${app.name} legal`}
          </h2>
          <ul>
            {app.documents.map((doc, index) => (
              <li key={doc.slug} className="border-t first:border-t-0" style={{ borderColor: 'var(--border-primary)' }}>
                <Link href={docPath(doc)} className="group flex items-baseline gap-4 py-5">
                  <span className="font-mono text-xs" style={{ color: 'var(--accent-cyan)' }}>{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xl font-semibold group-hover:underline underline-offset-4" style={{ color: 'var(--text-bright)' }}>
                      {app.name} {doc.title}
                    </span>
                    <span className="mt-1 block truncate font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{docPath(doc)}</span>
                  </span>
                  <span aria-hidden="true" style={{ color: 'var(--accent-cyan)' }}>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </LegalShell>
  );
}
