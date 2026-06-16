"use client";
/**
 * Fires a single `entity_view` event when a detail page mounts. Render it from
 * a server component (e.g. blog/project/app/gallery detail) with the entity's
 * identifiers. Renders nothing.
 */
import { useEffect, useRef } from 'react';
import { trackEntityView } from '@/lib/track';

export default function TrackView({ entityType, entityId, entitySlug }) {
    const fired = useRef(false);

    useEffect(() => {
        if (fired.current || !entityType || !entityId) return;
        fired.current = true;
        trackEntityView({ entityType, entityId, entitySlug });
    }, [entityType, entityId, entitySlug]);

    return null;
}
