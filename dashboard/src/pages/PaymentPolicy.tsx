import PolicyPage from './PolicyPage';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark-green)', margin: '20px 0 8px', lineHeight: 1.4 }}>
    {children}
  </h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: '0 0 12px', textAlign: 'justify' }}>{children}</p>
);

export default function PaymentPolicy() {
  return (
    <PolicyPage title="Chính sách thanh toán">
      <SectionTitle>Điều 1. Hình thức thanh toán</SectionTitle>
      <P>
        Người Dùng có thể thanh toán qua các phương thức hợp pháp được tích hợp:
      </P>
      <P>
        • Thanh toán trực tuyến qua ví điện tử (ZaloPay, MoMo...).
      </P>
      <P>
        • Thanh toán qua thẻ ATM nội địa / Thẻ tín dụng quốc tế thông qua cổng thanh toán đối tác.
      </P>
      <P>
        • Chuyển khoản trực tiếp vào tài khoản ngân hàng của đơn vị chủ quản.
      </P>

      <SectionTitle>Điều 2. Quy trình xử lý giao dịch</SectionTitle>
      <P>
        Ngay sau khi hệ thống ghi nhận thanh toán thành công, tài khoản Zalo OA hoặc Telegram của Người Dùng sẽ được tự động cập nhật lên gói dịch vụ tương ứng trong vòng tối đa <strong>15 phút</strong>.
      </P>
      <P>
        Hóa đơn điện tử (VAT) sẽ được xuất và gửi vào email của Người Dùng (nếu có yêu cầu) trong vòng <strong>03 ngày làm việc</strong>.
      </P>
    </PolicyPage>
  );
}
