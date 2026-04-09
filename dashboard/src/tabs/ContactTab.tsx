import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock, ShieldCheck, FileText, HelpCircle, ArrowRight, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContactTab() {
  const navigate = useNavigate();

  const policies = [
    { path: '/policy/privacy', icon: <ShieldCheck size={14} className="opacity-70" />, label: 'Chính sách bảo mật' },
    { path: '/policy/terms', icon: <FileText size={14} className="opacity-70" />, label: 'Điều khoản sử dụng' },
    { path: '/policy/payment', icon: <CreditCard size={14} className="opacity-70" />, label: 'Chính sách thanh toán' },
    { path: '/policy/complaint', icon: <HelpCircle size={14} className="opacity-70" />, label: 'Chính sách giải quyết khiếu nại' },
  ];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="glass p-6 text-center">
        <h2 className="text-xl font-black text-gradient uppercase tracking-tight" style={{ lineHeight: 1.2, margin: '10px 0 6px', fontSize: 22, color: 'var(--dark-green)' }}>Vietnew<br/>Entertainment</h2>
        <p className="text-sm font-semibold mt-1" style={{ color: '#374151', letterSpacing: '0.02em' }}>
          CÔNG TY CỔ PHẦN GIẢI TRÍ VÀ TRUYỀN THÔNG VIỆT NAM - NEWZEALAND
        </p>
      </div>

      {/* Contact */}
      <Card style={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--dark-green)'}}>
            <Phone size={16} /> Liên hệ với chúng tôi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <a
            href="tel:0965106690"
            className="flex items-center gap-3 p-3 rounded-xl bg-green-50/50 hover:bg-green-50 no-underline text-foreground transition-all border border-green-100/50"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
              <Phone size={18} />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground font-medium">Điện thoại</div>
              <div className="text-sm font-bold text-gray-800">0965 106 690</div>
            </div>
            <ArrowRight size={16} className="text-gray-300" />
          </a>

          <a
            href="mailto:contact@vietnew-entertainment.com.vn"
            className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 hover:bg-blue-50 no-underline text-foreground transition-all border border-blue-100/50"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
              <Mail size={18} />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground font-medium">Email</div>
              <div className="text-sm font-bold text-gray-800" style={{ wordBreak: 'break-all' }}>contact@vietnew-entertainment.com.vn</div>
            </div>
            <ArrowRight size={16} className="text-gray-300" />
          </a>
        </CardContent>
      </Card>

      {/* Locations */}
      <Card style={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--dark-green)'}}>
            <MapPin size={16} /> Văn phòng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-red-500">
              <MapPin size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">Trụ sở chính</div>
              <div className="text-xs text-gray-500 mt-1 leading-relaxed">25 đường 17b, Phường An Lạc, Quận Bình Tân, TP.HCM</div>
            </div>
          </div>
          
          <div className="h-px w-full bg-gray-100"></div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-orange-500">
              <MapPin size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">Văn phòng đại diện</div>
              <div className="text-xs text-gray-500 mt-1 leading-relaxed">262/43 Nguyễn Tiểu La, Phường 8, Quận 10, TP.HCM</div>
            </div>
          </div>
          
          <div className="h-px w-full bg-gray-100"></div>

          <div className="flex items-start gap-3 text-sm text-muted-foreground">
             <div className="mt-0.5 text-blue-500">
              <Clock size={16} />
             </div>
             <div>
               <div className="font-bold text-gray-800 text-xs mb-1">Giờ làm việc:</div>
               <div className="text-xs">Thứ 2 - Thứ 6: 8:00 - 17:00<br/>Thứ 7: 8:00 - 12:00</div>
             </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Policies */}
      <Card style={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--dark-green)'}}>
            <ShieldCheck size={16} /> Chính sách & Điều khoản
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 gap-2">
          {policies.map((p) => (
            <button
              key={p.path}
              onClick={() => navigate(p.path)}
              className="flex items-center gap-2 text-xs text-gray-600 hover:text-green-600 p-2 rounded-lg hover:bg-green-50 transition-colors text-left w-full"
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {p.icon}
              <span className="flex-1">{p.label}</span>
              <ArrowRight size={12} className="text-gray-300" />
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground py-4">
        © 2026 Vietnew Entertainment<br/>
        All Rights Reserved.
      </div>
    </div>
  );
}
