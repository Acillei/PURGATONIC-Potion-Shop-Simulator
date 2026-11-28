export function mountGame(parent, entry, onError, loadGame = () => import('./main.js')) {
    let disposed = false;
    let game;

    // Let React finish its effect cleanup before requesting the gameplay module.
    Promise.resolve().then(async () => {
        if (disposed) return;
        const { createGame } = await loadGame();
        if (!disposed) game = createGame(parent, entry);
    }).catch(error => {
        if (!disposed) onError(error);
    });

    return () => {
        if (disposed) return;
        disposed = true;
        game?.destroy(true);
    };
}
