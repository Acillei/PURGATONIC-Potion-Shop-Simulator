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

## Báo cáo kỹ thuật TASK-CORE-001

Hòm thư và phù thủy trên World Map được xếp lớp theo tọa độ Y của điểm chạm đất.
Collider của hòm thư chỉ bao quanh chân cọc.

- Nhà thuốc và cây trang trí trên World Map vẫn nằm ở lớp vẽ cố định. Có thể
  xếp lớp thân nhà và thân cây theo chân đế. Để che nhân vật khi đi bên dưới,
  mái hiên và tán cây cần lớp tiền cảnh riêng.
- Cầu gỗ và giàn hoa hiện chỉ được nạp tài nguyên. Khi đặt lên bản đồ, mặt cầu
  nên nằm dưới chân nhân vật, lan can gần nằm ở tiền cảnh, và tán giàn hoa nằm
  trên lớp nhân vật. Collider của giàn hoa nên bám theo chân cột.
- Ảnh nội thất là một lớp. Nhân vật đứng phía sau quầy lễ tân có thể vẽ đè lên
  lọ hoa. Phần cần tách làm lớp tiền cảnh là lọ và cụm hoa ở khoảng
  `x = 375–461`, `y = 520–625` trong `potion_shop_interior.png`.

## Kiểm tra

```sh
npm run lint
npm test
npm run build
```
