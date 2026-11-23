# PURGATONIC-Potion-Shop-Simulator

## Trạng thái trò chơi

Mỗi instance Phaser có một `GameState` trong registry. Trong scene, dùng
`this.registry.get('gameState')` để lấy state hoặc `gameState.inventory` để
lấy Inventory dùng chung. `getState()` và `getPlayer()` trả về bản sao.
`updatePlayerPose(scene, { x, y }, facing)` cập nhật vị trí và hướng của scene
hiện tại. `replaceState(snapshot)` kiểm tra toàn bộ snapshot trước khi áp dụng.

Inventory có các hàm `addItem(id, quantity)`, `removeItem(id, quantity)`,
`hasItem(id, quantity)`, `getQuantity(id)`, `getAllItems()` và `clear()`.
Ba hàm đầu trả về boolean và yêu cầu số nguyên dương an toàn. Vật phẩm chưa có
trả về số lượng 0. `getAllItems()` trả về bản sao.

## Lưu và tải

Game tự thử tải bản lưu khi khởi động. Để gọi API từ code game, lấy
`game.registry.get('saveSystem')` hoặc `this.registry.get('saveSystem')`
trong scene.

- `saveGame()` ghi trạng thái hiện tại vào slot `purgatonic:save` trong localStorage.
- `loadGame()` khôi phục trạng thái và mở lại scene đã lưu ở frame kế tiếp.
- `newGame()` đặt lại trạng thái đang chơi và trở về World Map. Bản lưu hiện
  có được giữ đến khi một lệnh `saveGame()` thành công.

Cả ba hàm trả về `{ ok: true }` khi thành công. Khi thất bại, kết quả là
`{ ok: false, reason }`. `storage_error` là lỗi truy cập hoặc ghi localStorage,
`missing_save` là slot rỗng, `invalid_save` là JSON hoặc dữ liệu sai cấu trúc,
và `unsupported_version` là phiên bản schema chưa hỗ trợ. Tải thất bại giữ
nguyên cả trạng thái trò chơi lẫn dữ liệu trong slot.

Schema hiện tại là phiên bản 1. `player.worldReturn` ghi vị trí và hướng trên
World Map khi nhân vật đang ở tiệm hoặc trạm. `player.station` ghi trạm đang mở.
Nếu bản lưu v1 thiếu các trường tùy chọn này, game dùng điểm xuất phát World Map
và trạm `brewing` khi cần.

## Kiểm tra

```sh
npm run lint
npm test
npm run build
```
