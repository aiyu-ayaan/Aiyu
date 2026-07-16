import { notFound } from 'next/navigation';
import { GAMES, getGame } from '@/app/components/games/registry';
import GameShell from '@/app/components/games/GameShell';
import GameLoader from '@/app/components/games/GameLoader';

export function generateStaticParams() {
    return GAMES.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const game = getGame(slug);
    if (!game) return {};
    return {
        title: `${game.title} | Aiyu Arcade`,
        description: game.tagline,
    };
}

export default async function GamePage({ params }) {
    const { slug } = await params;
    const game = getGame(slug);
    if (!game) notFound();

    return (
        <GameShell game={game}>
            <GameLoader slug={game.slug} />
        </GameShell>
    );
}
