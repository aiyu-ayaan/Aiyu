import AiHero from './AiHero';
import AiSkills from './AiSkills';
import AiRecommendations from './AiRecommendations';
import AiFreeCredits from './AiFreeCredits';
import AiLiveStats from './AiLiveStats';
import AiPromptLibrary from './AiPromptLibrary';

/**
 * Section type -> renderer. The public page maps each enabled section's `type`
 * through this registry; unknown types render nothing. To add a section type:
 * add a renderer here, a default block in lib/aiPageDefaults.js, and an editor
 * form in the admin field registry.
 */
export const AI_SECTION_COMPONENTS = {
    hero: AiHero,
    skills: AiSkills,
    recommendations: AiRecommendations,
    credits: AiFreeCredits,
    stats: AiLiveStats,
    prompts: AiPromptLibrary,
};

export default AI_SECTION_COMPONENTS;
