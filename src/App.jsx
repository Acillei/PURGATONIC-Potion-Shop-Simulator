import { useEffect, useRef } from 'react';
import { createGame } from './game/main';

function App() {
    const gameRef = useRef(null);

    useEffect(() => {
        const game = createGame(gameRef.current);

        return () => {
            game.destroy(true);
        };
    }, []);

    return (
        <main className="app">
            <div className="game-container" ref={gameRef}></div>
        </main>
    );
}

export default App;
