import PolicyPage from './PolicyPage';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark-green)', margin: '20px 0 8px', lineHeight: 1.4 }}>
    {children}
  </h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: '0 0 12px', textAlign: 'justify' }}>{children}</p>
);

export default function TermsOfService() {
  return (
    <PolicyPage title="Điều khoản và Điều kiện sử dụng">
      <SectionTitle>Điều 1. Nguyên tắc chung</SectionTitle>
      <P>
        Bằng việc nhấn "Quan tâm" (Follow) Zalo OA PennyBot hoặc /Start trên Telegram và gửi tin nhắn đầu tiên, Người Dùng xác nhận đã đọc, hiểu và đồng ý chịu sự ràng buộc bởi toàn bộ các điều khoản này.
      </P>

      <SectionTitle>Điều 2. Quyền và Trách nhiệm của Người Dùng</SectionTitle>
      <P>
        <strong>Quyền lợi:</strong> Được sử dụng các tính năng ghi chép, truy xuất báo cáo thống kê chi tiêu do PennyBot cung cấp. Có quyền yêu cầu xuất bản sao dữ liệu hoặc xóa toàn bộ dữ liệu bất kỳ lúc nào.
      </P>
      <P>
        <strong>Trách nhiệm:</strong> Người Dùng chịu hoàn toàn trách nhiệm về tính hợp pháp của các nội dung, số liệu chi tiêu nhập vào hệ thống. Nghiêm cấm sử dụng hệ thống PennyBot để lưu trữ dữ liệu liên quan đến các hoạt động vi phạm pháp luật (rửa tiền, tài trợ khủng bố, cá độ...).
      </P>

      <SectionTitle>Điều 3. Quyền và Trách nhiệm của PennyBot</SectionTitle>
      <P>
        <strong>Trách nhiệm:</strong> Đảm bảo hệ thống hoạt động ổn định, bảo mật toàn vẹn dữ liệu. Cung cấp đúng và đủ các tính năng đã công bố.
      </P>
      <P>
        <strong>Quyền hạn:</strong> PennyBot có quyền tạm ngưng hoặc chấm dứt cung cấp dịch vụ, từ chối phục vụ đối với các tài khoản có dấu hiệu spam, phá hoại hệ thống hoặc vi phạm pháp luật mà không cần báo trước. Các nội dung phản hồi, tư vấn tài chính từ Bot chỉ mang tính chất tham khảo, PennyBot không chịu trách nhiệm pháp lý cho các quyết định đầu tư, chi tiêu thực tế của Người Dùng.
      </P>

      <SectionTitle>Điều 4. Sở hữu trí tuệ</SectionTitle>
      <P>
        Mọi mã nguồn, thuật toán xử lý ngôn ngữ tự nhiên, thiết kế giao diện, logo, nhãn hiệu và nhân cách "PennyBot" đều thuộc sở hữu độc quyền của chúng tôi và được bảo hộ bởi Luật Sở hữu trí tuệ Việt Nam.
      </P>
    </PolicyPage>
  );
}
