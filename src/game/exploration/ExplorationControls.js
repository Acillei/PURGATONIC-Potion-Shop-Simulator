export function createExplorationControls(scene, addUI, interact, { touchOnly = false, fullscreenY = 16 } = {}) {
    const base = addUI(scene.add.circle(0, 0, 54, 0x563A6E, 0.6).setStrokeStyle(3, 0xE7CFAE));
    const thumb = addUI(scene.add.circle(0, 0, 22, 0x926EAA).setStrokeStyle(2, 0xE7CFAE));
    const joystick = addUI(scene.add.zone(0, 0, 145, 145).setInteractive());
    const interactButton = addUI(scene.add.circle(0, 0, 38, 0x74518B)
        .setStrokeStyle(3, 0xE8CDA8).setInteractive({ useHandCursor: true }));
    const interactIcon = addUI(scene.add.text(0, 0, '✋', { fontSize: '30px' }).setOrigin(0.5));
    const fullscreen = addUI(scene.add.text(16, fullscreenY, 'Toàn màn hình', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#FFF0DC',
        backgroundColor: '#513665',
        fixedWidth: 168,
        padding: { x: 10, y: 7 }
    }).setInteractive({ useHandCursor: true }));

    const touchMedia = globalThis.matchMedia('(any-pointer: coarse)');
    const touchUI = [base, thumb, joystick, interactButton, interactIcon];
    let pointerId = null;
    const vector = { x: 0, y: 0 };
    const radius = 42;

    function track(pointer) {
        const dx = pointer.x - joystick.x;
        const dy = pointer.y - joystick.y;
        const length = Math.max(radius, Math.hypot(dx, dy));
        vector.x = dx / length;
        vector.y = dy / length;
        thumb.setPosition(joystick.x + vector.x * radius, joystick.y + vector.y * radius);
    }

    function reset() {
        pointerId = null;
        vector.x = 0;
        vector.y = 0;
        thumb.setPosition(joystick.x, joystick.y);
    }

    function updateVisibility() {
        const visible = !touchOnly || touchMedia.matches;
        for (const element of touchUI) element.setVisible(visible);
        if (!visible) reset();
    }

    joystick.on('pointerdown', pointer => {
        if (pointerId !== null) return;
        pointerId = pointer.id;
        track(pointer);
    });
    const move = pointer => {
        if (pointer.id === pointerId) track(pointer);
    };
    const release = pointer => {
        if (pointer.id === pointerId) reset();
    };
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    if (touchOnly) touchMedia.addEventListener('change', updateVisibility);
    scene.events.once('shutdown', () => {
        scene.input.off('pointermove', move);
        scene.input.off('pointerup', release);
        scene.input.off('pointerupoutside', release);
        if (touchOnly) touchMedia.removeEventListener('change', updateVisibility);
    });
    interactButton.on('pointerdown', interact);
    fullscreen.on('pointerup', async () => {
        const scale = scene.scale;
        try {
            if (scale.fullscreenTarget?.requestFullscreen) {
                // Phaser listens for the browser change and refreshes the game and cameras.
                if (scale.isFullscreen) await document.exitFullscreen();
                else await scale.fullscreenTarget.requestFullscreen({ navigationUI: 'hide' });
            } else {
                scale.toggleFullscreen();
            }
        } catch {
            fullscreen.setText('Toàn màn hình lỗi');
        }
    });

    return {
        vector,
        reset,
        resize(width, height) {
            updateVisibility();
            base.setPosition(86, height - 86);
            joystick.setPosition(86, height - 86);
            interactButton.setPosition(width - 79, height - 84);
            interactIcon.setPosition(width - 79, height - 84);
            fullscreen.setVisible(scene.scale.fullscreen.available);
            fullscreen.setText(scene.scale.isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình');
            reset();
        }
    };
}

export function movementVector(keys, touchVector) {
    let x = Number(keys.D.isDown) - Number(keys.A.isDown);
    let y = Number(keys.S.isDown) - Number(keys.W.isDown);
    if (!x && !y) ({ x, y } = touchVector);
    const length = Math.hypot(x, y);
    return length > 0.15 ? { x: x / length, y: y / length } : null;
}

export function facingFor({ x, y }) {
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left';
    return y > 0 ? 'down' : 'up';
}
