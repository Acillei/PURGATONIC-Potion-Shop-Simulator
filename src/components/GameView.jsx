import { useEffect, useRef, useState } from 'react';
import { mountGame } from '../game/mountGame.js';

export function GameView({ entry, onBack }) {
    const parent = useRef(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => mountGame(parent.current, entry, () => setFailed(true)), [entry]);

    return (
        <main className="app">
            {failed ? (
                <section className="game-start-error">
                    <h1 role="alert">Không thể khởi động trò chơi</h1>
                    <button className="menu-button" type="button" onClick={onBack}>Quay lại</button>
                </section>
            ) : <div className="game-container" ref={parent}></div>}
        </main>
    );
}
