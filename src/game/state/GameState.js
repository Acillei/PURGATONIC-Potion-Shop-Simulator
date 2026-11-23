import { InventorySystem } from './InventorySystem.js';

export const SCHEMA_VERSION = 1;

const WORLD_MAP = 'WorldMapScene';
const SHOP = 'ShopInteriorScene';
const WORKSTATION = 'WorkstationScene';
const SCENES = new Set([WORLD_MAP, SHOP, WORKSTATION, 'GameScene']);
const FACINGS = new Set(['down', 'up', 'left', 'right']);
const STATIONS = new Set(['brewing', 'preparation', 'storage', 'reception']);

// Workstation positions use the shop's coordinates. GameScene is viewport-relative.
const SHOP_BOUNDS = { width: 1448, height: 1086 };
const SCENE_BOUNDS = new Map([
    [WORLD_MAP, { width: 2560, height: 1920 }],
    [SHOP, SHOP_BOUNDS],
    [WORKSTATION, SHOP_BOUNDS]
]);

// Existing spawn in the courtyard: SHOP_PATH_START + (5, 55).
const WORLD_SPAWN = { position: { x: 435, y: 1535 }, facing: 'down' };

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPose(pose, scene) {
    if (!isRecord(pose) || !isRecord(pose.position) || !FACINGS.has(pose.facing)) return false;

    const { x, y } = pose.position;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) return false;

    const bounds = SCENE_BOUNDS.get(scene);
    return !bounds || (x < bounds.width && y < bounds.height);
}

function isInsideShop(scene) {
    return scene === SHOP || scene === WORKSTATION;
}

function isPlayer(player) {
    return isRecord(player) && SCENES.has(player.currentScene) &&
        isPose(player, player.currentScene) &&
        (!Object.hasOwn(player, 'worldReturn') ||
            (isInsideShop(player.currentScene) && isPose(player.worldReturn, WORLD_MAP))) &&
        (!Object.hasOwn(player, 'station') ||
            (player.currentScene === WORKSTATION && STATIONS.has(player.station)));
}

function copyPose({ position, facing }) {
    return { position: { x: position.x, y: position.y }, facing };
}

function copyPlayer(player) {
    const copy = { currentScene: player.currentScene, ...copyPose(player) };
    if (Object.hasOwn(player, 'worldReturn')) copy.worldReturn = copyPose(player.worldReturn);
    if (Object.hasOwn(player, 'station')) copy.station = player.station;
    return copy;
}

export class GameState {
    #player;
    #inventory = new InventorySystem();
    #economy;
    #progress;

    constructor() {
        this.reset();
    }

    get inventory() {
        return this.#inventory;
    }

    getPlayer() {
        return copyPlayer(this.#player);
    }

    getState() {
        return {
            schemaVersion: SCHEMA_VERSION,
            player: this.getPlayer(),
            inventory: this.#inventory.getAllItems(),
            economy: { ...this.#economy },
            progress: { unlockedAreas: [...this.#progress.unlockedAreas] }
        };
    }

    setPlayer(player) {
        if (!isPlayer(player)) return false;
        this.#player = copyPlayer(player);
        return true;
    }

    updatePlayerPose(scene, position, facing) {
        const pose = { position, facing };
        if (scene !== this.#player.currentScene || !isPose(pose, scene)) return false;

        Object.assign(this.#player, copyPose(pose));
        return true;
    }

    enterScene(scene, spawn = WORLD_SPAWN, station) {
        const previous = this.#player;
        const insideShop = isInsideShop(scene);
        const worldReturn = previous.worldReturn ??
            (previous.currentScene === WORLD_MAP ? previous : undefined);

        let pose = spawn;
        if (scene === previous.currentScene || (insideShop && isInsideShop(previous.currentScene))) {
            pose = previous;
        } else if (scene === WORLD_MAP && worldReturn) {
            pose = worldReturn;
        }

        const player = { currentScene: scene, ...copyPose(pose) };
        if (insideShop && worldReturn) player.worldReturn = copyPose(worldReturn);
        if (scene === WORKSTATION) player.station = station ?? previous.station ?? 'brewing';

        if (!this.setPlayer(player)) throw new TypeError('Invalid scene or player spawn');
        return this.getPlayer();
    }

    replaceState(state) {
        if (!isRecord(state) || state.schemaVersion !== SCHEMA_VERSION) return false;

        const { player, inventory, economy, progress } = state;
        if (!isPlayer(player) ||
            !isRecord(economy) || !Number.isSafeInteger(economy.coins) || economy.coins < 0 ||
            !isRecord(progress) || !Array.isArray(progress.unlockedAreas)) return false;

        const unlockedAreas = [...progress.unlockedAreas];
        if (unlockedAreas.some(area => typeof area !== 'string' || area.length === 0)) return false;

        const nextPlayer = copyPlayer(player);
        const coins = economy.coins;
        if (!this.#inventory.replaceItems(inventory)) return false;

        this.#player = nextPlayer;
        this.#economy = { coins };
        this.#progress = { unlockedAreas };
        return true;
    }

    reset() {
        this.#player = { currentScene: WORLD_MAP, ...copyPose(WORLD_SPAWN) };
        this.#inventory.clear();
        this.#economy = { coins: 0 };
        this.#progress = { unlockedAreas: ['potion_shop'] };
    }
}
