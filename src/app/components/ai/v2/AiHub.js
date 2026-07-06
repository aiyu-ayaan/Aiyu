import ViewportLazySection from '@/app/components/shared/ViewportLazySection';
import { AI_SECTION_COMPONENTS } from './registry';

/**
 * Schema-driven renderer for the AI Hub. Walks the enabled sections in order,
 * maps each `type` to a component via the registry, and injects live `stats`
 * into the telemetry section. The hero renders eagerly (above the fold);
 * everything below defers through ViewportLazySection so heavy GSAP scopes and
 * markup only mount as the reader approaches them.
 */
export default function AiHub({ config, stats }) {
    const sections = Array.isArray(config?.sections) ? config.sections : [];
    const enabled = sections.filter((s) => s && s.enabled !== false && AI_SECTION_COMPONENTS[s.type]);

    let chapter = 0;

    return (
        <div className="relative overflow-hidden">
            {enabled.map((section) => {
                const Component = AI_SECTION_COMPONENTS[section.type];
                const isHero = section.type === 'hero';
                const index = isHero ? '00' : String(++chapter).padStart(2, '0');
                const extra = section.type === 'stats' ? { stats } : {};

                const node = <Component key={section.id} index={index} section={section} {...extra} />;

                if (isHero) return node;

                return (
                    <ViewportLazySection key={section.id} id={`ai-${section.id}`} placeholderHeight={520}>
                        {node}
                    </ViewportLazySection>
                );
            })}
        </div>
    );
}
