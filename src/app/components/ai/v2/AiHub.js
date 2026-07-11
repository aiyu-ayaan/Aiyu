import ViewportLazySection from '@/app/components/shared/ViewportLazySection';
import { AI_SECTION_COMPONENTS } from './registry';
import { countSectionItems, getSubPageByType, resolveSubPageThreshold } from '@/lib/aiSubPages';

const SECTION_LABEL_MAP = {
    skills: 'skills',
    recommendations: 'stack',
    credits: 'credits',
    stats: 'telemetry',
    prompts: 'prompts',
};

/**
 * Schema-driven renderer for the AI Hub. Walks the enabled sections in order,
 * maps each `type` to a component via the registry, and injects live `stats`
 * into the telemetry section. The hero renders eagerly (above the fold);
 * everything below defers through ViewportLazySection so heavy GSAP scopes and
 * markup only mount as the reader approaches them.
 *
 * `basePath` is the public path of the hub itself (`/ai` or `/v2/ai`), used to
 * build sub-page links for any section that spills past AI_SUBPAGE_THRESHOLD.
 */
export default function AiHub({ config, stats, basePath = '/ai' }) {
    const sections = Array.isArray(config?.sections) ? config.sections : [];
    const enabled = sections.filter((s) => s && s.enabled !== false && AI_SECTION_COMPONENTS[s.type]);
    const hubBase = String(basePath || '/ai').replace(/\/+$/, '');
    const threshold = resolveSubPageThreshold(config);

    const jumpLinks = enabled
        .filter((s) => s.type !== 'hero')
        .map((s) => ({
            href: `#ai-${s.id}`,
            label: SECTION_LABEL_MAP[s.type] || String(s.eyebrow || s.title || s.id).toLowerCase().replace(/\s+/g, '-'),
        }));

    let chapter = 0;

    return (
        <div className="relative overflow-hidden">
            {enabled.map((section) => {
                const Component = AI_SECTION_COMPONENTS[section.type];
                const isHero = section.type === 'hero';
                const index = isHero ? '00' : String(++chapter).padStart(2, '0');
                const extra = section.type === 'stats' ? { stats } : {};

                // Cap sections that overflow the hub and link the remainder to
                // their own crawlable sub-page.
                const sub = getSubPageByType(section.type);
                if (sub) {
                    const count = countSectionItems(section);
                    if (count > threshold) {
                        extra.limit = threshold;
                        extra.totalCount = count;
                        extra.detailHref = `${hubBase}/${sub.slug}`;
                    }
                }

                if (isHero) {
                    return <Component key={section.id} index={index} section={section} jumpLinks={jumpLinks} {...extra} />;
                }

                const node = <Component key={section.id} index={index} section={section} {...extra} />;

                return (
                    <ViewportLazySection key={section.id} id={`ai-${section.id}`} placeholderHeight={520}>
                        {node}
                    </ViewportLazySection>
                );
            })}
        </div>
    );
}
