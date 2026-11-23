// /games and /games/:slug. Port of src/app/games/{layout,page,[slug]/page}.js; the components are shared.
import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router';
import '@fontsource/press-start-2p/400.css';
import '@/app/games/games.css';
import GamesMenu from '@/app/components/games/GamesMenu';
import GameShell from '@/app/components/games/GameShell';
import GameLoader from '@/app/components/games/GameLoader';
import { getGame } from '@/app/components/games/registry';
import { NotFound } from '../NotFound';

function useTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}

export function GamesLayout() {
  return (
    <div className="arcade-root" data-arcade-shell style={{ ['--font-arcade' as string]: "'Press Start 2P', 'Courier New', monospace" }}>
      <div className="arcade-inner arcade-screen arc-grid-floor">
        <Outlet />
      </div>
    </div>
  );
}

export function GamesIndex() {
  useTitle(
    'Aiyu Arcade | Insert Coin',
    'Retro time-killers built into the portfolio: Byte Runner 3D, Moto Rush, Tetris, Snake, Breakout, Space Invaders, Pong, Flappy Byte, and Tic-Tac-Toe.',
  );
  return <GamesMenu />;
}

export function GamePage() {
  const { slug = '' } = useParams();
  const game = getGame(slug);
  useTitle(game ? `${game.title} | Aiyu Arcade` : 'Not found', game?.tagline);
  if (!game) return <NotFound />;
  return (
    <GameShell game={game}>
      <GameLoader slug={game.slug} />
    </GameShell>
  );
}
