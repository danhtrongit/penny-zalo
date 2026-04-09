import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { api, setToken, getToken, clearToken } from './api';
import HomeTab from './tabs/HomeTab';
import StatsTab from './tabs/StatsTab';
import SettingsTab from './tabs/SettingsTab';
import ContactTab from './tabs/ContactTab';
import AdminTab from './tabs/AdminTab';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import PaymentPolicy from './pages/PaymentPolicy';
import ComplaintPolicy from './pages/ComplaintPolicy';
import { Button } from '@/components/ui/button';
import logoUrl from './assets/images/bot_logo.png';
import {
  Home,
  BarChart3,
  PhoneCall,
  Settings,
  Crown,
} from 'lucide-react';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  let tab = 'home';
  if (location.pathname.startsWith('/report')) tab = 'report';
  else if (location.pathname.startsWith('/contact')) tab = 'contact';
  else if (location.pathname.startsWith('/settings')) tab = 'settings';
  else if (location.pathname.startsWith('/admin')) tab = 'admin';

  // Policy pages are full-screen, no header/nav
  const isPolicyPage = location.pathname.startsWith('/policy');

  useEffect(() => {
    // 1. Check for token in URL (new login link)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (urlToken) {
      // New token from URL → save it
      setToken(urlToken);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 2. Check if we have a token (from URL or localStorage)
    const token = getToken();
    if (!token) {
      setError('Vui lòng dùng lệnh /login trong Penny BOT để lấy link truy cập Dashboard.');
      setLoading(false);
      return;
    }

    // 3. Verify the token
    api.verifyAuth()
      .then((data) => {
        setUser(data);
        setLoading(false);
        // Check admin status
        api.checkAdmin().then((res) => setIsAdmin(res.isAdmin));
      })
      .catch(() => {
        // Token expired or invalid → clear it
        clearToken();
        setError('Phiên đăng nhập đã hết hạn. Vui lòng dùng lệnh /login lại trong bot.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <img src={logoUrl} alt="Penny" style={{ width: 80, height: 80, margin: '0 auto', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
        <div style={{
          background: 'white',
          borderRadius: 20,
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          textAlign: 'center',
          padding: 24,
          width: '100%',
          maxWidth: 360,
        }}>
          <img src={logoUrl} alt="Penny" style={{ width: 64, height: 64, margin: '0 auto 16px', filter: 'grayscale(1)', opacity: 0.5 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Không thể truy cập</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</p>
          <Button style={{ width: '100%', background: 'linear-gradient(135deg, var(--green-start), var(--green-end))', borderRadius: 12, color: 'white', border: 'none' }}>
            Mở lại từ link /login
          </Button>
        </div>
      </div>
    );
  }

  const displayName = user?.persona?.displayName || user?.user?.firstName || 'bạn';

  if (isPolicyPage) {
    return (
      <Routes>
        <Route path="/policy/privacy" element={<PrivacyPolicy />} />
        <Route path="/policy/terms" element={<TermsOfService />} />
        <Route path="/policy/payment" element={<PaymentPolicy />} />
        <Route path="/policy/complaint" element={<ComplaintPolicy />} />
      </Routes>
    );
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Header */}
      <div className="app-header">
        <div className="header-row">
          <div>
            <div className="header-greeting">Penny Xin Chào,</div>
            <h1 className="header-name">{displayName}</h1>
          </div>
          <div className="header-avatar">
            <img src={logoUrl} alt="Penny Avatar" />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <Routes>
        <Route path="/" element={<HomeTab />} />
        <Route path="/report" element={<div style={{ padding: '0 20px' }}><StatsTab /></div>} />
        <Route path="/contact" element={<div style={{ padding: '20px 20px 100px' }}><ContactTab /></div>} />
        <Route path="/settings" element={<div style={{ padding: '0 20px' }}><SettingsTab /></div>} />
        {isAdmin && <Route path="/admin" element={<div style={{ padding: '0 20px' }}><AdminTab /></div>} />}
      </Routes>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${tab === 'home' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <Home size={22} fill={tab === 'home' ? 'var(--nav-active)' : 'none'} />
          <span>Trang Chủ</span>
        </button>

        <button
          className={`nav-item ${tab === 'report' ? 'active' : ''}`}
          onClick={() => navigate('/report')}
        >
          <BarChart3 size={22} fill={tab === 'report' ? 'var(--nav-active)' : 'none'} />
          <span>Báo Cáo</span>
        </button>



        <button
          className={`nav-item ${tab === 'contact' ? 'active' : ''}`}
          onClick={() => navigate('/contact')}
        >
          <PhoneCall size={22} fill={tab === 'contact' ? 'var(--nav-active)' : 'none'} />
          <span>Liên Hệ</span>
        </button>

        <button
          className={`nav-item ${tab === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('/settings')}
        >
          <Settings size={22} fill={tab === 'settings' ? 'var(--nav-active)' : 'none'} />
          <span>Cài Đặt</span>
        </button>

        {isAdmin && (
          <button
            className={`nav-item ${tab === 'admin' ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
          >
            <Crown size={22} fill={tab === 'admin' ? 'var(--nav-active)' : 'none'} />
            <span>Admin</span>
          </button>
        )}
      </nav>
    </div>
  );
}
