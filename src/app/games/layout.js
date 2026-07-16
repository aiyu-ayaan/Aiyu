import { Press_Start_2P } from "next/font/google";
import "./games.css";

// The arcade uses its own pixel font, loaded only on /games routes so it never
// weighs on the main site bundle or first paint of the portfolio pages.
const arcadeFont = Press_Start_2P({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-arcade",
    display: "swap",
    preload: false,
    fallback: ["Courier New", "monospace"],
});

export const metadata = {
    title: "Aiyu Arcade | Retro Games",
    description:
        "A retro CRT arcade hidden inside the portfolio — Byte Runner 3D, Tetris, Snake, Breakout, Space Invaders, Pong, Flappy Byte, and Tic-Tac-Toe. Insert coin.",
};

export default function GamesLayout({ children }) {
    return (
        <div className={`${arcadeFont.variable} arcade-root`} data-arcade-shell>
            <div className="arcade-inner arcade-screen arc-grid-floor">{children}</div>
        </div>
    );
}
