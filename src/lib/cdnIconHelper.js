import { getIcon } from '../../../lib/iconLibrary';

// Helper component to render icons from Simple Icons CDN
const CdnIcon = ({ name, className }) => {
    // If it's a known component from our library, use that
    const LibraryIcon = getIcon(name);
    // If getIcon returns FaCode (fallback), it implies it wasn't found in our explicit map.
    // However, getIcon returns FaCode for *unknown* things. 
    // We want to try CDN for things not in our list, OR we can just use CDN for everything.

    // Strategy: 
    // 1. If it's in our specific 'IconList' keys, use the React Component (better performance/styling control).
    // 2. If NOT, try to use it as a Simple Icon slug.

    return <LibraryIcon className={className} />;
};

export default CdnIcon;
