# Zalo PDF/Image Analysis Design

## Goal

Bo sung kha nang phan tich anh va PDF cho Penny Zalo bang cach tan dung OCR/PDF pipeline san co, dong thoi giu pham vi sua doi o muc toi thieu trong runtime Zalo hien tai.

## Constraints

- Docs public cua Zalo Bot Platform tinh den ngay 2026-04-09 chi mo ta event text, image, sticker, unsupported.
- User yeu cau van cho phep gia dinh Zalo co the gui PDF truc tiep cho bot.
- Khong refactor thanh media layer moi; uu tien patch nho, de rollout nhanh.

## Chosen Approach

- Mo rong typing cua Zalo event/message de chap nhan them cac bien the PDF/file event va metadata file thuong gap.
- Them nhanh `handlePdfMessage()` trong Zalo runtime, song song voi `handleImageMessage()`.
- Tai URL PDF theo thu tu uu tien:
  1. `message.document`
  2. `message.url` neu co dau hieu la PDF
  3. link `.pdf` trong `message.text`
  4. link `.pdf` trong `message.caption`
- Sau khi tai file ve:
  - xac minh file co kha nang la PDF
  - luu vao media storage
  - goi `processPDF()`
  - tra lai ket qua cho user

## Behavior

### Image

- Giu luong `message.image.received` hien co.
- Khong doi OCR service; chi cap nhat help/fallback text de phan anh kha nang moi.

### PDF

- Runtime nhan cac event:
  - `message.document.received`
  - `message.file.received`
  - `message.pdf.received`
- Text message co link PDF cung duoc xu ly nhu mot request phan tich PDF thay vi di qua intent parser.
- Neu khong tim duoc URL PDF hop le, bot se tra loi fallback ngan gon va goi y `/login`.

## Validation

- Chap nhan file neu co mot trong cac dau hieu:
  - `content-type` la PDF
  - `mime_type` payload la PDF
  - ten file ket thuc bang `.pdf`
  - URL co duoi `.pdf`
- Neu khong co dau hieu nao o tren, dung xu ly va tra fallback.

## Testing

- Them test cho helper trich URL PDF va nhan dien file PDF.
- Chay lai test webhook co san.
- Chay `tsc --noEmit` de bat loi typing/runtime integration.
