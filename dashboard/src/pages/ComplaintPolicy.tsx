import PolicyPage from './PolicyPage';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark-green)', margin: '20px 0 8px', lineHeight: 1.4 }}>
    {children}
  </h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: '0 0 12px', textAlign: 'justify' }}>{children}</p>
);

export default function ComplaintPolicy() {
  return (
    <PolicyPage title="Chính sách xử lý khiếu nại và CSKH">
      <SectionTitle>Điều 1. Phạm vi tiếp nhận khiếu nại</SectionTitle>
      <P>
        Chúng tôi tiếp nhận mọi khiếu nại liên quan đến:
      </P>
      <P>
        • Lỗi kỹ thuật của hệ thống (Bot không phản hồi, thống kê sai số liệu).
      </P>
      <P>
        • Các vấn đề liên quan đến thanh toán, nâng cấp gói dịch vụ.
      </P>
      <P>
        • Chất lượng dịch vụ chăm sóc khách hàng.
      </P>

      <SectionTitle>Điều 2. Quy trình giải quyết khiếu nại</SectionTitle>
      <P>
        <strong>Bước 1 — Tiếp nhận:</strong> Người Dùng gửi khiếu nại qua tính năng Chat trên Zalo OA, Telegram với cú pháp "Khiếu nại" hoặc gửi thư về email <a href="mailto:contact@vietnew-entertainment.com.vn" style={{ color: 'var(--green-start)' }}>contact@vietnew-entertainment.com.vn</a>
      </P>
      <P>
        <strong>Bước 2 — Phân tích và Phản hồi sơ bộ:</strong> Trong vòng tối đa <strong>24 giờ làm việc</strong> kể từ khi nhận được khiếu nại, Bộ phận CSKH sẽ xác nhận việc tiếp nhận.
      </P>
      <P>
        <strong>Bước 3 — Giải quyết:</strong> Tùy theo mức độ phức tạp, PennyBot sẽ đưa ra phương án xử lý (hoàn tiền, khắc phục lỗi, khôi phục dữ liệu) trong thời gian từ <strong>03 đến tối đa 07 ngày làm việc</strong>.
      </P>
      <P>
        <strong>Bước 4 — Đóng khiếu nại:</strong> Trong trường hợp hai bên không thể tự thỏa thuận, sự việc sẽ được đưa ra Tòa án nhân dân có thẩm quyền để giải quyết theo quy định của pháp luật.
      </P>

      <SectionTitle>Điều 3. Thông tin liên hệ hỗ trợ</SectionTitle>
      <P>
        <strong>Đơn vị chủ quản:</strong> Công Ty Cổ Phần Giải Trí Và Truyền Thông Việt Nam - Newzealand
      </P>
      <P>
        <strong>Trụ sở chính:</strong> 25 đường 17b, Phường An Lạc, Quận Bình Tân, TP.HCM
      </P>
      <P>
        <strong>Văn phòng đại diện:</strong> 262/43 Nguyễn Tiểu La, Phường 8, Quận 10, TP.HCM
      </P>
      <P>
        <strong>Thời gian làm việc:</strong><br />
        Thứ 2 - Thứ 6: 8:00 - 17:00<br />
        Thứ 7: 8:00 - 12:00
      </P>
    </PolicyPage>
  );
}
