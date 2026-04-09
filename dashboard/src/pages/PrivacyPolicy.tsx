import PolicyPage from './PolicyPage';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark-green)', margin: '20px 0 8px', lineHeight: 1.4 }}>
    {children}
  </h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: '0 0 12px', textAlign: 'justify' }}>{children}</p>
);

export default function PrivacyPolicy() {
  return (
    <PolicyPage title="Chính sách bảo mật thông tin cá nhân">
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 16, fontStyle: 'italic' }}>
        Tuân thủ Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, Nghị định 356/2025/NĐ-CP và Luật An toàn thông tin mạng
      </div>

      <SectionTitle>Điều 1. Phân loại và Mục đích xử lý dữ liệu</SectionTitle>
      <P>
        <strong>1.1. Phân loại dữ liệu thu thập:</strong> Để vận hành trợ lý PennyBot, chúng tôi tiến hành thu thập và xử lý hai nhóm dữ liệu:
      </P>
      <P>
        <strong>• Dữ liệu cá nhân cơ bản:</strong> Tên hiển thị trên Zalo, Zalo User ID (ZUID), Telegram, Telegram User ID và ảnh đại diện công khai.
      </P>
      <P>
        <strong>• Dữ liệu cá nhân nhạy cảm:</strong> Các thông tin về tài chính cá nhân (lịch sử chi tiêu, số tiền, hạng mục mua sắm) và dữ liệu sinh trắc học cơ bản (tệp âm thanh/Voice message khi người dùng sử dụng tính năng nhập liệu bằng giọng nói).
      </P>
      <P>
        <strong>1.2. Mục đích xử lý:</strong> Toàn bộ dữ liệu chỉ được sử dụng duy nhất cho mục đích: phân loại chi tiêu tự động, thiết lập báo cáo tài chính cá nhân và cung cấp cảnh báo ngân sách. Chúng tôi tuyệt đối <strong>KHÔNG</strong> sử dụng dữ liệu này để chấm điểm tín dụng, môi giới vay vốn hay quảng cáo chéo.
      </P>

      <SectionTitle>Điều 2. Nguyên tắc Đồng ý của Chủ thể dữ liệu</SectionTitle>
      <P>
        Việc xử lý dữ liệu cá nhân nhạy cảm chỉ được thực hiện khi có sự đồng ý tự nguyện, rõ ràng và đã được thông báo trước của Người Dùng.
      </P>
      <P>
        Khi nhấn nút "Bắt đầu/Quan tâm" và gửi tin nhắn chi tiêu đầu tiên, Người Dùng xác nhận đã đọc, hiểu rõ đây là dữ liệu nhạy cảm và đồng ý cho phép PennyBot xử lý theo các mục đích nêu tại Điều 1.
      </P>

      <SectionTitle>Điều 3. Quyền và Nghĩa vụ của Chủ thể dữ liệu</SectionTitle>
      <P>
        Theo quy định tại Điều 4 Luật Bảo vệ dữ liệu cá nhân 2025, Người Dùng PennyBot có các quyền cốt lõi sau:
      </P>
      <P>
        <strong>• Quyền được biết:</strong> Được thông báo minh bạch về quy trình thu thập và phân tích dữ liệu của Bot.
      </P>
      <P>
        <strong>• Quyền rút lại sự đồng ý:</strong> Yêu cầu chấm dứt việc xử lý dữ liệu bất kỳ lúc nào bằng cách sử dụng cú pháp lệnh <em>"Huỷ đồng ý"</em> hoặc Unfollow Zalo OA, Telegram.
      </P>
      <P>
        <strong>• Quyền chỉnh sửa và Xóa:</strong> Có quyền truy cập, xem lại, yêu cầu chỉnh sửa các khoản chi tiêu bị sai lệch, hoặc yêu cầu hệ thống xóa toàn bộ dữ liệu lịch sử tài chính của mình vĩnh viễn khỏi máy chủ.
      </P>
      <P>
        <strong>• Nghĩa vụ:</strong> Người dùng có trách nhiệm tự bảo vệ thiết bị, tài khoản Zalo, Telegram cá nhân, và cung cấp thông tin trung thực khi tương tác với nền tảng.
      </P>

      <SectionTitle>Điều 4. Cam kết bảo mật và Xử lý sự cố</SectionTitle>
      <P>
        <strong>Cam kết không vi phạm:</strong> Công Ty Cổ Phần Giải Trí Và Truyền Thông Việt Nam - Newzealand cam kết tuân thủ tuyệt đối Điều 7 Luật Bảo vệ dữ liệu cá nhân 2025. Nghiêm cấm mọi hành vi mua bán, trao đổi, chiếm đoạt hoặc cố ý làm lộ dữ liệu chi tiêu của Người Dùng dưới mọi hình thức.
      </P>
      <P>
        <strong>Cơ chế phản ứng:</strong> Hệ thống được áp dụng các tiêu chuẩn an toàn thông tin mạng cao nhất. Trong trường hợp phát hiện sự cố rò rỉ hoặc tấn công mạng, Đội ngũ kỹ thuật sẽ ngay lập tức vô hiệu hóa luồng dữ liệu, thông báo cho Người Dùng trong vòng 72 giờ và báo cáo lên Cổng thông tin quốc gia về bảo vệ dữ liệu cá nhân.
      </P>
      <P>
        <strong>Đầu mối tiếp nhận:</strong><br />
        Email: <a href="mailto:contact@vietnew-entertainment.com.vn" style={{ color: 'var(--green-start)' }}>contact@vietnew-entertainment.com.vn</a><br />
        Trụ sở: 25 đường 17b, Phường An Lạc, Quận Bình Tân, TP.HCM
      </P>
    </PolicyPage>
  );
}
