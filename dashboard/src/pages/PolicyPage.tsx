import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PolicyPageProps {
  title: string;
  children: React.ReactNode;
}

export default function PolicyPage({ title, children }: PolicyPageProps) {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fdf9' }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'white',
        borderBottom: '1px solid #e8f0eb',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => navigate('/contact')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            color: 'var(--dark-green)',
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{
          fontSize: 15,
          fontWeight: 800,
          color: 'var(--dark-green)',
          margin: 0,
          lineHeight: 1.3,
          flex: 1,
        }}>
          {title}
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px 40px' }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: '20px 18px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          fontSize: 13,
          lineHeight: 1.8,
          color: '#374151',
        }}>
          {children}
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#9ca3af',
          marginTop: 20,
          padding: '0 20px',
        }}>
          © 2026 PennyBot — Công Ty CP Giải Trí Và Truyền Thông Việt Nam - Newzealand
        </div>
      </div>
    </div>
  );
}
