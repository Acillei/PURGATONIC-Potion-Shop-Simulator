import { useEffect, useRef, useState } from 'react';
import { GameView } from './components/GameView.jsx';
import { prepareEntry } from './game/state/EntryFlow.js';
import './App.css';

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
                {screen === 'menu' ? (
                    <nav className="menu-content" aria-label="Menu chính" ref={nav}>
                        <MenuButton data-menu-action="play" onClick={play}>Chơi game</MenuButton>
                        <MenuButton data-menu-action="settings" onClick={() => open('settings')}>Cài đặt</MenuButton>
                        <MenuButton data-menu-action="about" onClick={() => open('about')}>Thông tin</MenuButton>
                    </nav>
                ) : (
                    <section className="menu-content" key={screen} aria-labelledby="menu-panel-heading">
                        <h2 id="menu-panel-heading" tabIndex={-1} ref={panelHeading}>{title}</h2>
                        {content}
                        <MenuButton onClick={back}>Quay lại</MenuButton>
                    </section>
                )}
            </div>
        </main>
    );
}

export default App;
