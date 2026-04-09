# Zalo Bot Platform: Sổ Tay Kỹ Thuật Offline

> Snapshot tổng hợp ngày `2026-04-09` từ menu docs chính thức tại `https://bot.zaloplatforms.com/docs/`.
> Mục tiêu của file này là thay thế nhu cầu phải mở lại từng trang docs khi cần tra cứu nhanh.
> Nội dung bên dưới là bản tổng hợp và diễn giải lại từ docs chính thức, không phải bản sao nguyên văn.

## 1. Phạm vi đã quét

Đã quét toàn bộ `19` trang nằm trong menu docs chính của Zalo Bot Platform:

| Trang | Cập nhật theo docs | URL |
| --- | --- | --- |
| Giới thiệu | 24/7/2025 | `https://bot.zaloplatforms.com/docs/` |
| Tạo Bot | 17/12/2025 | `https://bot.zaloplatforms.com/docs/create-bot/` |
| Xác thực | 10/12/2025 | `https://bot.zaloplatforms.com/docs/authorize/` |
| Sử dụng API | 10/12/2025 | `https://bot.zaloplatforms.com/docs/call-api/` |
| getMe | 10/12/2025 | `https://bot.zaloplatforms.com/docs/apis/getMe/` |
| getUpdates | 10/12/2025 | `https://bot.zaloplatforms.com/docs/apis/getUpdates/` |
| setWebhook | 10/12/2025 | `https://bot.zaloplatforms.com/docs/apis/setWebhook/` |
| deleteWebhook | 10/12/2025 | `https://bot.zaloplatforms.com/docs/apis/deleteWebhook/` |
| getWebhookInfo | 10/12/2025 | `https://bot.zaloplatforms.com/docs/apis/getWebhookInfo/` |
| sendMessage | 10/12/2025 | `https://bot.zaloplatforms.com/docs/apis/sendMessage/` |
| sendPhoto | 10/12/2025 | `https://bot.zaloplatforms.com/docs/apis/sendPhoto/` |
| sendSticker | 10/12/2025 | `https://bot.zaloplatforms.com/docs/apis/sendSticker/` |
| sendChatAction | 10/12/2025 | `https://bot.zaloplatforms.com/docs/apis/sendChatAction/` |
| Webhook | 6/8/2025 | `https://bot.zaloplatforms.com/docs/webhook/` |
| Hướng dẫn Bot với Polling | 26/1/2026 | `https://bot.zaloplatforms.com/docs/build-your-bot/` |
| Hướng dẫn Bot với Webhook | 26/1/2026 | `https://bot.zaloplatforms.com/docs/build-your-bot-with-webhook/` |
| Bot tương tác với Group | 17/12/2025 | `https://bot.zaloplatforms.com/docs/build-bot-interaction-with-group/` |
| Bảng mã lỗi | 6/8/2025 | `https://bot.zaloplatforms.com/docs/error-code/` |
| Điều khoản sử dụng | 10/12/2025 | `https://bot.zaloplatforms.com/docs/terms/` |

Ghi chú phạm vi:

- Bộ docs chính chỉ mô tả API và quy trình tích hợp nền tảng.
- Trong các bài hướng dẫn, docs có nhắc thêm package `python-zalo-bot` và `node-zalo-bot`, nhưng đó là trang package bên ngoài (`PyPI` và `npm`), không nằm trong menu docs chính đã quét ở đây.

## 2. Tóm tắt nhanh cho người tích hợp

- `Zalo Bot` là tài khoản tự động trên Zalo dùng để trò chuyện, tự động hóa vận hành, gửi thông báo và tích hợp với hệ thống nội bộ như `ERP`, `CRM`, `CDP`.
- Sau khi tạo bot, hệ thống cấp `Bot Token`. Token không tự hết hạn; chỉ đổi khi bạn chủ động reset.
- Mọi API dùng chung một URL base:

```text
https://bot-api.zaloplatforms.com/bot<BOT_TOKEN>/<functionName>
```

- Docs nêu rằng API hỗ trợ cả `GET` và `POST`, nhưng từng trang API reference đều minh họa bằng `POST`. Nếu không có lý do đặc biệt, nên ưu tiên `POST`.
- Có 2 cơ chế nhận event:
  - `getUpdates`: long polling, phù hợp `local/dev`.
  - `Webhook`: phù hợp `production`.
- `getUpdates` và `Webhook` là hai cơ chế loại trừ lẫn nhau. Nếu đã set webhook thì `getUpdates` sẽ không hoạt động cho tới khi gọi `deleteWebhook`.
- Các API gửi ra hiện được docs mô tả gồm:
  - `sendMessage`
  - `sendPhoto`
  - `sendSticker`
  - `sendChatAction`
- Webhook gửi `POST` JSON về server của bạn và đính kèm header `X-Bot-Api-Secret-Token`; bạn phải tự validate header này.
- Hỗ trợ group chat đang ở trạng thái thử nghiệm nội bộ hoặc “sắp ra mắt” tùy trang docs; có thể dùng `chat.id` để trả lời vào group khi tính năng khả dụng.

## 3. Tạo Bot

Luồng tạo bot theo docs:

1. Mở ứng dụng Zalo.
2. Tìm `OA Zalo Bot Manager`.
3. Trong cửa sổ chat, chọn `Tạo bot` để mở mini app `Zalo Bot Creator`.
4. Nhập tên bot. Tên bắt buộc bắt đầu bằng tiền tố `Bot`, ví dụ `Bot MyShop`.
5. Xác nhận tạo bot.
6. Sau khi tạo xong, hệ thống gửi:
   - thông tin bot
   - `Bot Token`
   qua tin nhắn cho tài khoản Zalo của bạn.

Ghi chú triển khai:

- Giữ `Bot Token` như secret hạ tầng, tương đương API key.
- Không hardcode token trong source.
- Nếu cần reset token, thao tác trong `Zalo Bot Creator`; token mới sẽ được gửi lại qua Zalo chat.

## 4. Xác thực và quy ước gọi API

### 4.1. Bot Token

- Token là cơ chế xác thực duy nhất được docs mô tả.
- Ví dụ định dạng token trong docs: `12345689:abc-xyz`.
- Mọi API đều đi qua đường dẫn chứa token:

```text
https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/functionName
```

### 4.2. Giao thức và encoding

- Chỉ dùng `HTTPS`.
- Encoding phải là `UTF-8`.
- Tên API có phân biệt hoa thường.

### 4.3. Các kiểu truyền tham số được docs cho phép

Docs “Sử dụng API” ghi rằng tất cả API hỗ trợ cả `GET` và `POST`, với các kiểu truyền dữ liệu sau:

- Query string trên URL.
- `application/x-www-form-urlencoded`
- `application/json`
- `multipart/form-data`

Khuyến nghị thực tế theo docs:

- Dùng `GET` cho API truy vấn dữ liệu.
- Dùng `POST` cho API thay đổi trạng thái hoặc ghi dữ liệu.
- Tuy vậy, từng trang API reference của bot hiện đều ghi `Method: POST`, nên nếu cần bám sát ví dụ chính thức thì dùng `POST`.

### 4.4. Khuôn dạng response

Mọi response là JSON object với các trường chính:

| Trường | Ý nghĩa |
| --- | --- |
| `ok` | `true` nếu thành công, `false` nếu lỗi |
| `result` | payload trả về khi thành công |
| `description` | mô tả lỗi ngắn gọn nếu thất bại |
| `error_code` | mã lỗi hệ thống |

## 5. Hai mô hình nhận event

### 5.1. Long polling với `getUpdates`

Phù hợp khi:

- đang phát triển local
- cần debug nhanh
- chưa có domain `HTTPS`

Đặc điểm:

- Bot chủ động gọi API để “kéo” event mới.
- Có tham số `timeout` để giữ request trong một khoảng thời gian.
- Docs khuyến nghị chỉ dùng cho `development` hoặc `test`.

Hạn chế:

- Không dùng được nếu webhook đang bật.
- Không phù hợp production vì có nguy cơ bỏ lỡ event hoặc vận hành kém hiệu quả hơn webhook.

### 5.2. Webhook

Phù hợp khi:

- chạy production
- cần nhận event real-time
- có server public với `HTTPS`

Đặc điểm:

- Zalo chủ động `POST` event sang server của bạn.
- Bạn cần đăng ký URL qua `setWebhook`.
- Có thể kiểm tra trạng thái bằng `getWebhookInfo`.
- Muốn quay lại polling thì phải `deleteWebhook`.

### 5.3. Quy tắc chọn mô hình

- Dev local nhanh: bắt đầu với `getUpdates`.
- Production ổn định: chuyển sang `Webhook`.
- Khi có môi trường staging/public `HTTPS`, nên đồng bộ flow với production bằng webhook sớm.

## 6. API Reference

### 6.1. `getMe`

Mục đích:

- Kiểm tra token có hợp lệ không.
- Lấy thông tin cơ bản của bot.

Thông tin chính:

- URL: `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/getMe`
- Method theo trang API: `POST`
- Tham số: không có

Trường trả về mẫu:

| Trường | Ý nghĩa |
| --- | --- |
| `id` | ID bot |
| `account_name` | tên tài khoản bot |
| `account_type` | loại tài khoản, ví dụ mẫu là `BASIC` |
| `can_join_groups` | bot có thể vào group hay không |

Khi nào dùng:

- Sau khi nhận token mới.
- Health check lúc bootstrap app.
- Kiểm tra khả năng `can_join_groups` nếu cần flow group.

### 6.2. `getUpdates`

Mục đích:

- Lấy các event mới theo cơ chế long polling.

Thông tin chính:

- URL: `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/getUpdates`
- Method theo trang API: `POST`

Tham số:

| Trường | Kiểu theo docs | Bắt buộc | Ý nghĩa |
| --- | --- | --- | --- |
| `timeout` | `String` | Không | timeout HTTP request tính bằng giây; docs nói mặc định là `30` giây |

Ghi chú quan trọng:

- Nếu webhook đang được cấu hình, API này không hoạt động.
- Trước khi dùng lại `getUpdates`, cần gọi `deleteWebhook`.
- Docs mô tả dữ liệu trả về có cấu trúc tương tự payload webhook.

### 6.3. `setWebhook`

Mục đích:

- Đăng ký URL để Zalo gửi event sang.

Thông tin chính:

- URL: `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/setWebhook`
- Method theo trang API: `POST`

Tham số:

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
| --- | --- | --- | --- |
| `url` | `String` | Có | Webhook URL, docs yêu cầu dạng `HTTPS` |
| `secret_token` | `String` | Có | khóa bí mật từ `8` tới `256` ký tự; Zalo sẽ gửi lại ở header `X-Bot-Api-Secret-Token` |

Response mẫu:

- `url`
- `updated_at`

Ghi chú:

- Từ sample response, `updated_at` có hình dạng timestamp milliseconds. Đây là suy luận từ giá trị mẫu dạng `1749538250568`.

### 6.4. `deleteWebhook`

Mục đích:

- Gỡ webhook để quay về polling.

Thông tin chính:

- URL: `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/deleteWebhook`
- Method theo trang API: `POST`
- Tham số: không có

Response mẫu:

- `url` rỗng
- `updated_at`

### 6.5. `getWebhookInfo`

Mục đích:

- Kiểm tra trạng thái webhook hiện tại.

Thông tin chính:

- URL: `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/getWebhookInfo`
- Method theo trang API: `POST`
- Tham số: không có

Response mẫu:

- `url`
- `updated_at`

### 6.6. `sendMessage`

Mục đích:

- Gửi tin nhắn văn bản cho user hoặc conversation.

Thông tin chính:

- URL: `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendMessage`
- Method theo trang API: `POST`

Tham số:

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
| --- | --- | --- | --- |
| `chat_id` | `String` | Có | ID người nhận hoặc conversation |
| `text` | `String` | Có | nội dung text, độ dài `1` tới `2000` ký tự |

Response mẫu:

- `message_id`
- `date`

Ghi chú:

- Từ sample response, `date` có hình dạng timestamp milliseconds. Đây là suy luận từ giá trị mẫu dạng `1749632637199`.

### 6.7. `sendPhoto`

Mục đích:

- Gửi ảnh cho user hoặc conversation.

Thông tin chính:

- URL: `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendPhoto`
- Method theo trang API: `POST`

Tham số:

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
| --- | --- | --- | --- |
| `chat_id` | `String` | Có | ID người nhận hoặc conversation |
| `photo` | `String` | Có | đường dẫn hình ảnh sẽ được gửi |
| `caption` | `String` | Không | text đi kèm, độ dài `1` tới `2000` ký tự |

Ghi chú:

- Trang tổng quan API có nói `multipart/form-data` được hỗ trợ, nhưng riêng trang `sendPhoto` chỉ mô tả `photo` là một `String` “đường dẫn hình ảnh”.
- Docs không nói rõ ở đây là URL public, path nội bộ hay upload binary trực tiếp. Nếu cần triển khai chắc chắn, nên test integration với `POST` JSON trước, sau đó mới mở rộng sang multipart nếu cần.

### 6.8. `sendSticker`

Mục đích:

- Gửi sticker.

Thông tin chính:

- URL: `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendSticker`
- Method theo trang API: `POST`

Tham số:

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
| --- | --- | --- | --- |
| `chat_id` | `String` | Có | ID người nhận hoặc conversation |
| `sticker` | `String` | Có | sticker lấy từ `https://stickers.zaloapp.com/` |

Ghi chú:

- Docs dẫn thêm video hướng dẫn sticker tại `https://vimeo.com/649330161`.

### 6.9. `sendChatAction`

Mục đích:

- Hiển thị trạng thái tạm thời trong cửa sổ chat, ví dụ đang gõ.

Thông tin chính:

- URL: `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendChatAction`
- Method theo trang API: `POST`

Tham số:

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
| --- | --- | --- | --- |
| `chat_id` | `String` | Có | ID người nhận hoặc conversation |
| `action` | `String` | Có | loại hành động muốn phát đi |

Giá trị `action` theo docs:

- `typing`: cho tin nhắn text
- `upload_photo`: cho ảnh, trạng thái “Sắp ra mắt”

## 7. Cấu trúc Webhook Event

Webhook được docs mô tả là `POST` tới URL bạn đăng ký, với:

- Header: `X-Bot-Api-Secret-Token`
- Content-Type: `application/json`

### 7.1. Khuôn dạng top-level

| Trường | Ý nghĩa |
| --- | --- |
| `ok` | luôn là `true` theo docs webhook |
| `result` | payload chi tiết của event |

### 7.2. `result`

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
| --- | --- | --- | --- |
| `event_name` | `String` | Có | tên event |
| `message` | `Object` | Không | chi tiết message nếu là event có tin nhắn |

`event_name` hiện docs liệt kê:

- `message.text.received`
- `message.image.received`
- `message.sticker.received`
- `message.unsupported.received`

### 7.3. `message`

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
| --- | --- | --- | --- |
| `from` | `Object` | Có | thông tin người gửi |
| `chat` | `Object` | Có | thông tin conversation |
| `text` | `String` | Không | nội dung text |
| `photo` | `String` | Không | đường dẫn ảnh |
| `caption` | `String` | Không | caption đi kèm ảnh |
| `sticker` | `String` | Không | định danh sticker |
| `url` | `String` | Không | đường dẫn sticker |

Chi tiết `chat`:

- `chat.id`: ID conversation để phản hồi.
- `chat.chat_type` theo docs có thể là:
  - `PRIVATE`
  - `GROUP` và được gắn chú thích “Sắp ra mắt”.

### 7.4. Trường hợp đặc biệt: `message.unsupported.received`

Docs nêu rõ:

- Nếu người gửi thuộc nhóm đối tượng đặc biệt như trẻ em, người khuyết tật, người không biết chữ hoặc các nhóm tương tự, hệ thống có thể không gửi nội dung message thật.
- Thay vào đó bạn nhận event `message.unsupported.received`.
- Mục tiêu là để việc xử lý dữ liệu tuân thủ quy định pháp luật.

Ý nghĩa thực tiễn:

- Không giả định mọi inbound event đều chứa `text`, `photo` hoặc `sticker`.
- Logic bot nên có nhánh fallback cho event unsupported.

## 8. Hướng dẫn tích hợp theo từng mô hình

### 8.1. Luồng local/dev với Polling

Flow tối thiểu:

1. Tạo bot và lấy `Bot Token`.
2. Gọi `getMe` để xác thực token.
3. Nếu trước đó đã dùng webhook thì gọi `deleteWebhook`.
4. Chạy vòng lặp gọi `getUpdates`.
5. Parse payload như webhook event.
6. Trả lời lại bằng `sendMessage`, `sendPhoto`, `sendSticker` hoặc `sendChatAction`.

Ví dụ khung request chung bằng Node.js:

```ts
const BOT_TOKEN = process.env.ZALO_BOT_TOKEN!;
const API_BASE = `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}`;

async function callBotApi(method: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

const me = await callBotApi("getMe");
const updates = await callBotApi("getUpdates", { timeout: "30" });
```

Ghi chú:

- Trên `getUpdates`, docs ghi `timeout` là `String`. Nếu code cần strict typing thì nên bám đúng docs ở lớp request, còn business logic có thể coi đây là số giây.

### 8.2. Luồng production với Webhook

Flow tối thiểu:

1. Deploy server public `HTTPS`.
2. Chọn `secret_token` đủ dài, khó đoán.
3. Gọi `setWebhook`.
4. Ở endpoint webhook:
   - validate `X-Bot-Api-Secret-Token`
   - parse JSON body
   - switch theo `event_name`
   - phản hồi lại người dùng bằng API send tương ứng

Ví dụ Express tối thiểu:

```ts
import express from "express";

const app = express();
const WEBHOOK_SECRET_TOKEN = process.env.ZALO_BOT_SECRET!;

app.use(express.json());

app.post("/webhooks/zalo", async (req, res) => {
  const secret = req.header("x-bot-api-secret-token");
  if (secret !== WEBHOOK_SECRET_TOKEN) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const event = req.body;

  if (event?.result?.event_name === "message.text.received") {
    const chatId = event.result.message.chat.id;
    const text = event.result.message.text ?? "";

    await callBotApi("sendMessage", {
      chat_id: chatId,
      text: `Bạn vừa nói: ${text}`,
    });
  }

  return res.json({ message: "Success" });
});
```

### 8.3. Hướng dẫn group chat

Trang docs riêng cho group cho biết:

- Tính năng đang ở giai đoạn thử nghiệm nội bộ.
- Bot phải được mời vào nhóm trước khi tương tác.

Flow mời bot vào nhóm:

1. Mở mini app `Zalo Bot Creator`.
2. Chọn bot muốn thêm.
3. Tại mục `Mời Bot vào nhóm`, lấy link invite.
4. Chia sẻ link đó vào group.
5. Trưởng nhóm mở link và xác nhận `Thêm Bot vào Nhóm`.
6. Bot gửi tin chào mừng hoặc thông báo đã tham gia nhóm.

Bot nhận event trong group khi:

- thành viên `reply` vào tin nhắn trước đó của bot
- thành viên `mention` bot bằng `@`

Điểm kỹ thuật quan trọng:

- `chat.id` trong payload webhook chính là ID group để phản hồi về đúng group đó.

## 9. Best Practices rút ra từ docs

### 9.1. Polling vs Webhook

- Dùng polling cho local hoặc giai đoạn làm quen API.
- Dùng webhook cho staging và production.
- Không để đồng thời cả hai cơ chế.

### 9.2. Bảo mật

- Không để lộ `Bot Token`.
- Không commit token vào repo.
- Khi dùng webhook phải kiểm tra `X-Bot-Api-Secret-Token`.
- Chỉ đăng ký webhook với domain `HTTPS`.

### 9.3. Thiết kế handler

- Luôn branch theo `event_name`.
- Không giả định `message.text` luôn tồn tại.
- Tách parser payload và sender API thành hai lớp riêng.
- Log ít nhất:
  - `event_name`
  - `chat.id`
  - `message_id`
  - thời gian xử lý

### 9.4. Tương thích dữ liệu

- Tất cả payload nên được xử lý ở `UTF-8`.
- Không đổi hoa thường ở tên API.
- Nên chuẩn hóa toàn bộ request của mình về `POST + JSON` trước, rồi chỉ mở rộng khi có nhu cầu đặc biệt.

## 10. Bảng lỗi

Theo docs chính thức:

| Mã lỗi | Ý nghĩa |
| --- | --- |
| `400` | bad request, sai đường dẫn hoặc API name không hợp lệ |
| `401` | unauthorized, token hết hạn hoặc không hợp lệ |
| `403` | internal server error |
| `404` | not found, yêu cầu truy cập không hợp lệ |
| `408` | request timeout |
| `429` | quota exceeded |

Ghi chú:

- Mapping `403 -> Internal server error` là điều docs ghi, dù khác với quy ước HTTP thông thường. Nên log cả `error_code`, `description` và HTTP status thực tế khi debug.

## 11. Các điểm chưa rõ hoặc dễ gây nhầm

### 11.1. `GET`/`POST`

- Trang “Sử dụng API” nói tất cả API hỗ trợ cả `GET` và `POST`.
- Nhưng từng trang endpoint lại chốt `Method: POST`.
- Cách an toàn nhất là dùng `POST` cho toàn bộ integration bot.

### 11.2. Kiểu dữ liệu `timeout`

- Docs ghi `timeout` là `String`.
- Ngữ nghĩa thực tế lại là số giây.
- Nếu build SDK nội bộ, nên để parser chấp nhận cả string và number, nhưng serialize ra string khi gửi request.

### 11.3. `sendPhoto`

- Docs chưa nói rõ ảnh được truyền dưới dạng URL public, path string hay binary upload.
- Vì tài liệu tổng quan có nêu `multipart/form-data`, có thể suy luận nền tảng có ý định hỗ trợ upload/file workflows, nhưng riêng trang endpoint hiện không đủ chi tiết để kết luận.

### 11.4. Group support

- Trang webhook nói `GROUP` là “Sắp ra mắt”.
- Trang hướng dẫn group lại nói tính năng đang thử nghiệm nội bộ.
- Hiểu thực tế hiện tại: tính năng chưa phải GA công khai; chỉ nên bật sau khi xác minh bot của bạn có quyền tương ứng.

### 11.5. Timestamp

- `date` và `updated_at` trong sample response có dạng số rất lớn, nhiều khả năng là epoch milliseconds.
- Đây là suy luận từ sample response, docs không viết ra bằng chữ.

## 12. Điều khoản sử dụng: bản tóm tắt vận hành

Phần này không thay thế văn bản pháp lý, chỉ tóm tắt những ý ảnh hưởng trực tiếp tới triển khai và vận hành bot.

### 12.1. Tư cách sử dụng

- Zalo Bot dành cho cá nhân từ đủ `18` tuổi hoặc tổ chức hợp pháp.
- Người từ `13` đến dưới `18` tuổi chỉ được dùng khi có giám sát hợp pháp.

### 12.2. Bản chất dịch vụ

- Dịch vụ được cung cấp theo kiểu `as is` và `as available`.
- Zalo Platforms có quyền thay đổi kiến trúc, tính năng, phạm vi dịch vụ, tạm dừng hoặc ngừng cung cấp.

### 12.3. Free/Premium và thanh toán

- Có phiên bản miễn phí và trả phí.
- Gói định kỳ có thể tự gia hạn nếu không hủy.
- Mặc định không hoàn tiền cho phần thời gian còn lại, trừ khi chính sách hoặc pháp luật quy định khác.

### 12.4. Trách nhiệm của nhà phát triển

- Tự chịu trách nhiệm đối với nội dung, dữ liệu, kịch bản, phản hồi tự động và mọi tích hợp bên thứ ba.
- Nếu dùng hệ thống AI hoặc dịch vụ ngoài, vẫn phải tự bảo đảm tuân thủ.
- Phải thông báo cho người dùng cuối rằng họ đang tương tác với hệ thống tự động.
- Phải gắn nhãn hoặc định danh rõ nội dung tạo sinh ở mức có thể đọc bằng máy khi cần.

### 12.5. Dữ liệu cá nhân và quyền riêng tư

- Zalo Platforms nói họ có thể xử lý dữ liệu liên quan tới nhà phát triển để vận hành, hỗ trợ và tuân thủ pháp luật.
- Dữ liệu có thể được lưu trữ trên server tại Việt Nam.
- Với dữ liệu cá nhân của người dùng cuối, docs nêu rõ nhà phát triển mới là bên chịu trách nhiệm chính về thông báo, xin đồng ý, xử lý và tuân thủ pháp luật.
- Docs viện dẫn thêm:
  - `Nghị định 13/2023/NĐ-CP`
  - `Luật Dữ liệu 2024`
  - `Luật Bảo vệ dữ liệu cá nhân 2025`
  - các luật an toàn thông tin, an ninh mạng, sở hữu trí tuệ, bảo vệ người tiêu dùng, trẻ em

### 12.6. Những hành vi bị cấm

Nhà phát triển không được dùng Zalo Bot để:

- truy cập trái phép, reverse engineer hoặc phá hoại hệ thống
- phát tán mã độc, spam hoặc nội dung lừa đảo
- xử lý dữ liệu cá nhân không có căn cứ hợp pháp
- tạo hoặc phát tán nội dung vi phạm pháp luật, kích động thù địch, bạo lực, khiêu dâm, xâm hại trẻ em
- ra quyết định tự động trong các lĩnh vực nhạy cảm như tài chính, y tế, pháp lý, giáo dục mà không có xác minh của chuyên gia có thẩm quyền hoặc cảnh báo người dùng cuối
- dùng nội dung tạo sinh từ nền tảng để huấn luyện mô hình AI cạnh tranh với Zalo Bot hoặc sản phẩm khác của Zalo Platforms

### 12.7. Sở hữu trí tuệ

- Zalo Platforms giữ quyền với phần mềm, tài liệu, API, giao diện và tài sản trí tuệ của Zalo Bot.
- Nhà phát triển giữ bản quyền với nội dung do mình tạo, nhưng có thể phải cấp phép không độc quyền cho Zalo Platforms để vận hành và cải thiện dịch vụ.

### 12.8. Giới hạn trách nhiệm

- Zalo Platforms từ chối nhiều bảo đảm ngụ ý.
- Tổng trách nhiệm tối đa, nếu có, không vượt quá số tiền nhà phát triển đã trả trong `3` tháng gần nhất.
- Nếu dùng bản miễn phí, về cơ bản không có nghĩa vụ tài chính đối với nhà phát triển trừ trường hợp pháp luật bắt buộc.

### 12.9. Chấm dứt dịch vụ

- Nhà phát triển có thể ngừng dùng hoặc yêu cầu hỗ trợ chấm dứt.
- Zalo Platforms có thể tạm ngưng/chấm dứt nếu vi phạm điều khoản, có rủi ro hệ thống, có yêu cầu của cơ quan có thẩm quyền hoặc dừng dịch vụ vì lý do kỹ thuật/thương mại.

### 12.10. Giải quyết tranh chấp

- Luật áp dụng là pháp luật Việt Nam.
- Khiếu nại hợp lệ được phản hồi tối đa trong `30` ngày làm việc.
- Tranh chấp đi theo hướng:
  - thương lượng/hòa giải tối đa `60` ngày
  - nếu không xong thì đưa ra `VIAC`
- Ngôn ngữ trọng tài: `Tiếng Việt`.
- Địa điểm trọng tài: `TP. Hồ Chí Minh`.

### 12.11. Kênh hỗ trợ chính thức

- Email: `cskh@zaloplatforms.com`
- Zalo chính thức: `https://zalo.me/3899658094114941620`
- Địa chỉ thư tín: Tầng 2, Tòa nhà Saigon Paragon, số 3 Nguyễn Lương Bằng, Phường Tân Mỹ, TP. Hồ Chí Minh, Việt Nam

## 13. Checklist triển khai thực chiến

### 13.1. Trước khi coding

- Tạo bot và lưu token vào secret manager hoặc `.env`.
- Gọi `getMe` để xác nhận token.
- Xác định ngay từ đầu sẽ dùng `Polling` hay `Webhook`.

### 13.2. Nếu dùng Polling

- Đảm bảo webhook đang tắt.
- Đặt `timeout` hợp lý.
- Viết vòng lặp có retry/backoff.

### 13.3. Nếu dùng Webhook

- Chỉ dùng `HTTPS`.
- Tạo `secret_token` dài và không trùng token khác.
- Validate header secret trước khi xử lý body.
- Trả response nhanh để tránh timeout.

### 13.4. Khi xử lý event

- Branch theo `event_name`.
- Luôn kiểm tra tồn tại của `result`, `message`, `chat`, `chat.id`.
- Có nhánh cho `message.unsupported.received`.
- Với group, dùng `chat.id` để trả lời.

### 13.5. Khi gửi tin nhắn ra

- Text tối đa `2000` ký tự theo docs.
- `sendChatAction("typing")` có thể dùng trước khi gửi câu trả lời dài.
- Sticker cần lấy ID từ kho sticker chính thức.

## 14. Khuyến nghị nội bộ cho project này

Nếu áp dụng vào codebase hiện tại, nên tiêu chuẩn hóa adapter Zalo theo interface như sau:

- `verifyToken()` gọi `getMe`
- `pollUpdates()` gọi `getUpdates`
- `setWebhook(url, secret)`
- `deleteWebhook()`
- `getWebhookInfo()`
- `sendText(chatId, text)`
- `sendPhoto(chatId, photo, caption?)`
- `sendSticker(chatId, sticker)`
- `sendChatAction(chatId, action)`

Lợi ích:

- Tách biệt nghiệp vụ bot khỏi chi tiết giao thức API.
- Sau này nếu docs Zalo Bot đổi tham số hoặc mở thêm event type thì chỉ phải sửa một lớp adapter.

## 15. Kết luận ngắn

Nếu chỉ cần một mental model ngắn nhất để nhớ:

1. Tạo bot trong Zalo app để lấy `Bot Token`.
2. Dùng `getMe` để xác thực token.
3. Dev local thì dùng `getUpdates`.
4. Production thì dùng `Webhook + setWebhook + validate X-Bot-Api-Secret-Token`.
5. Xử lý event theo `event_name`.
6. Trả lời bằng `sendMessage`, `sendPhoto`, `sendSticker` hoặc `sendChatAction`.
7. Với group, phản hồi qua `chat.id` khi bot có quyền tương ứng.
8. Luôn xem nhà phát triển là bên chịu trách nhiệm chính về nội dung, dữ liệu cá nhân và tuân thủ pháp lý.
