import { useEffect, useRef, useState } from 'react';
import { GameView } from './components/GameView.jsx';
import { prepareEntry } from './game/state/EntryFlow.js';
import menuLayout from '../public/assets/ui/main-menu/layout.json';
import './App.css';

const [referenceWidth, referenceHeight] = menuLayout.referenceResolution;
const logoSize = [761, 468];
const { logo, buttons } = menuLayout.placement;
const placements = [
    { center: logo.center, size: [logo.width, logo.width * logoSize[1] / logoSize[0]] },
    ...Object.values(buttons)
];

// Keep the entire control area in view when a centered cover would crop it.
const safeSpan = (axis, referenceSize) => 2 * Math.max(...placements.map(({ center, size }) =>
    Math.abs(center[axis] - referenceSize / 2) + size[axis] / 2 + 8
));

const stageStyle = {
    '--menu-v7-ratio': referenceWidth / referenceHeight,
    '--menu-v7-safe-width': referenceWidth / safeSpan(0, referenceWidth),
    '--menu-v7-safe-height': referenceWidth / safeSpan(1, referenceHeight)
};

function placementStyle([x, y], width) {
    return {
        left: `${x / referenceWidth * 100}%`,
        top: `${y / referenceHeight * 100}%`,
        width: `${width / referenceWidth * 100}%`
    };
}

const menuAsset = file => `${import.meta.env.BASE_URL}assets/ui/main-menu/${file}`;

const checkpoints = {
    character_creator: {
        title: 'Tạo nhân vật',
        description: 'Bước tiếp theo là tạo và đặt tên cho phù thủy của bạn. Màn tạo nhân vật đang được phát triển.'
    },
    intro_story: {
        title: 'Câu chuyện mở đầu',
        description: 'Bạn đã dừng ở phần mở đầu. Phần này đang được phát triển.'
    },
    shop_name: {
        title: 'Đặt tên tiệm thuốc',
        description: 'Bạn đã dừng ở bước đặt tên tiệm thuốc. Phần này đang được phát triển.'
    }
};

const entryErrors = {
    invalid_metadata: 'Thông tin về phần mở đầu không hợp lệ.',
    invalid_save: 'Bản lưu không đúng định dạng.',
    unsupported_version: 'Phiên bản của bản lưu chưa được hỗ trợ.',
    missing_save: 'Đã tìm thấy hồ sơ nhưng chưa tìm thấy bản lưu tương ứng.',
    storage_error: 'Trình duyệt không cho phép đọc dữ liệu trò chơi.'
};

function MenuButton({ children, ...props }) {
    return <button className="menu-button" type="button" {...props}>{children}</button>;
}

function AssetMenuButton({ asset, action = asset, label, onClick }) {
    const [mouseHover, setMouseHover] = useState(false);
    const [pointerPressed, setPointerPressed] = useState(false);
    const [pressedKey, setPressedKey] = useState(null);
    const placement = buttons[asset];

    function keyDown(event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        // Space activates on release natively. Defer Enter to show its held state too.
        if (event.key === 'Enter') event.preventDefault();
        if (!event.repeat) setPressedKey(event.key);
    }

    function keyUp(event) {
        if (event.key !== pressedKey) return;
        setPressedKey(null);
        if (event.key === 'Enter') event.currentTarget.click();
    }

    function pointerDown(event) {
        if (event.button !== 0) return;
        setMouseHover(event.pointerType === 'mouse');
        setPointerPressed(true);
    }

    function pointerLeave() {
        setMouseHover(false);
        setPointerPressed(false);
    }

    return (
        <button type="button" className="menu-v7-button" aria-label={label} data-menu-action={action}
            data-mouse-hover={mouseHover} data-pressed={pointerPressed || pressedKey !== null}
            style={placementStyle(placement.center, placement.size[0])} onClick={onClick}
            onPointerEnter={event => setMouseHover(event.pointerType === 'mouse')}
            onPointerLeave={pointerLeave} onPointerDown={pointerDown} onPointerUp={() => setPointerPressed(false)}
            onPointerCancel={pointerLeave} onKeyDown={keyDown} onKeyUp={keyUp} onBlur={() => setPressedKey(null)}>
            {Object.entries(menuLayout.buttons[asset].states).map(([state, file]) => (
                <img key={state} className={`menu-v7-button-${state}`} src={menuAsset(file)} alt="" draggable={false} />
            ))}
        </button>
    );
}

function App() {
    const [page, setPage] = useState({ screen: 'menu' });
    const [reducedMotion, setReducedMotion] = useState(false);
    const nav = useRef(null);
    const panelHeading = useRef(null);
    const lastAction = useRef(null);

    useEffect(() => {
        if (page.screen !== 'menu') panelHeading.current?.focus();
        else if (lastAction.current) nav.current?.querySelector(`[data-menu-action="${lastAction.current}"]`)?.focus();
    }, [page.screen]);

    function back() {
        setPage({ screen: 'menu' });
    }

    function open(screen) {
        lastAction.current = screen;
        setPage({ screen });
    }

    function play() {
        lastAction.current = 'play';
        const entry = prepareEntry();
        const screen = entry.status === 'onboarding_complete' ? 'game' : entry.status;
        setPage({ screen, entry });
    }

    if (page.screen === 'game') return <GameView entry={page.entry} onBack={back} />;

    const { entry, screen } = page;
    if (screen === 'menu') {
        return (
            <main className="app menu-v7" data-reduced-motion={reducedMotion}>
                <div className="menu-v7-stage" style={stageStyle}>
                    <img className="menu-v7-background" src={menuAsset(menuLayout.background)} alt="" />
                    <h1 className="menu-v7-logo" style={placementStyle(logo.center, logo.width)}>
                        <img src={menuAsset(menuLayout.logo)} alt="PURGATONIC" width={logoSize[0]} height={logoSize[1]} />
                    </h1>
                    <nav className="menu-v7-nav" aria-label="Menu chính" ref={nav}>
                        <AssetMenuButton asset="play" label="Chơi game" onClick={play} />
                        <AssetMenuButton asset="settings" label="Cài đặt" onClick={() => open('settings')} />
                        <AssetMenuButton asset="info" action="about" label="Thông tin" onClick={() => open('about')} />
                    </nav>
                </div>
            </main>
        );
    }

    let title;
    let content;

    switch (screen) {
        case 'settings':
            title = 'Cài đặt';
            content = (
                <label className="menu-setting">
                    <input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} />
                    <span>Giảm chuyển động của menu</span>
                </label>
            );
            break;
        case 'about':
            title = 'Thông tin';
            content = <p>PURGATONIC là trò chơi mô phỏng một tiệm thuốc phép thuật.</p>;
            break;
        case 'legacy_save':
            title = 'Bản lưu trước đây';
            content = (
                <>
                    <p>Tiếp tục ở nơi bạn đã dừng lại.</p>
                    <MenuButton onClick={() => setPage({ screen: 'game', entry })}>Tiếp tục bản lưu</MenuButton>
                </>
            );
            break;
        case 'entry_error':
            title = 'Không thể tiếp tục';
            content = <p>{entryErrors[entry.reason]}</p>;
            break;
        case 'new_player':
        case 'onboarding_in_progress': {
            const checkpoint = checkpoints[entry.step];
            title = checkpoint.title;
            content = <p>{checkpoint.description}</p>;
            break;
        }
    }

    return (
        <main className="app menu" data-reduced-motion={reducedMotion}
            onKeyDown={event => { if (event.key === 'Escape' && screen !== 'menu') back(); }}>
            <div className="menu-frame">
                <div className="menu-brand">
                    <div className="menu-emblem" aria-hidden="true">
                        <span className="menu-bottle"></span>
                    </div>
                    <h1>PURGATONIC</h1>
                </div>
                <section className="menu-content" key={screen} aria-labelledby="menu-panel-heading">
                    <h2 id="menu-panel-heading" tabIndex={-1} ref={panelHeading}>{title}</h2>
                    {content}
                    <MenuButton onClick={back}>Quay lại</MenuButton>
                </section>
            </div>
        </main>
    );
}

export default App;
