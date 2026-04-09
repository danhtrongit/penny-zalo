# Penny Zalo Bot

Penny Zalo Bot là bản port của `~/Documents/penny` sang Zalo Bot Platform, giữ lại:

- ghi chi tiêu bằng ngôn ngữ tự nhiên
- OCR ảnh hóa đơn
- báo cáo, lịch sử, ngân sách, persona
- dashboard quản trị và chỉnh sửa dữ liệu
- MySQL schema hiện có của Penny

## Điểm khác khi sang Zalo

- Bot dùng Zalo HTTP API chính thức: `getMe`, `getUpdates`, `setWebhook`, `sendMessage`, `sendPhoto`, `sendChatAction`
- Các flow từng dùng inline button trên Telegram được chuyển thành text flow trên Zalo
- Zalo Bot API hiện không hỗ trợ nhận PDF trực tiếp trong chat, nên Penny giữ tính năng này qua Dashboard upload
- Dữ liệu cũ của Telegram được giữ nguyên trong MySQL và liên kết sang Zalo bằng mã `/link`

## Khởi động

```bash
npm install
cd dashboard && npm install
cd ..
npm run dev
```

## Biến môi trường chính

```bash
ZALO_BOT_TOKEN=...
DATABASE_URL=mysql://...
AI_BASE_URL=https://...
AI_API_KEY=...
DASHBOARD_URL=https://your-domain.com
WEBHOOK_DOMAIN=your-domain.com
WEBHOOK_SECRET_TOKEN=...
```

## Flow di trú dữ liệu Telegram -> Zalo

1. User mở Dashboard từ Penny cũ bằng `/login`
2. Trong tab `Cài đặt`, tạo mã liên kết Zalo
3. Gửi `/link <mã>` cho Penny trên Zalo
4. Zalo account được gắn vào đúng user MySQL cũ

## Tài liệu Zalo Bot

- Build your bot: https://bot.zaloplatforms.com/docs/build-your-bot/
- Authentication: https://bot.zaloplatforms.com/docs/authorize/
- API usage: https://bot.zaloplatforms.com/docs/call-api/
- sendMessage: https://bot.zaloplatforms.com/docs/apis/sendMessage/
- sendPhoto: https://bot.zaloplatforms.com/docs/apis/sendPhoto/
- sendChatAction: https://bot.zaloplatforms.com/docs/apis/sendChatAction/
- Webhook: https://bot.zaloplatforms.com/docs/webhook/
