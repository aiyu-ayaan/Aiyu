import StoryChapter from './StoryChapter';
import { LIFE_STORY, BORN_YEAR } from '../../../data/lifeStory';

/**
 * The life story, told after the hero film: one pinned HyperFrames chapter
 * per phase of life (see src/app/data/lifeStory.js). Each chapter offers a
 * way out to the first section after the story.
 */
export default function V2LifeStory({ name, skipTo = 'v2-snapshot' }) {
    const params = { name, born: BORN_YEAR };
    return (
        <div id="v2-story" className="relative z-10">
            {LIFE_STORY.map((chapter, index) => (
                <StoryChapter
                    key={chapter.id}
                    chapter={chapter}
                    index={index}
                    total={LIFE_STORY.length}
                    params={params}
                    skipTo={skipTo}
                />
            ))}
        </div>
    );
}
