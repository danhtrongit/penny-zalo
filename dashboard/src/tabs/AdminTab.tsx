import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Button } from '@/components/ui/button';
import { Send, Image, Users, CheckCircle, XCircle, Loader2, Sparkles, Upload, Copy } from 'lucide-react';

interface User {
  id: number;
  telegramId: number;
  firstName: string;
  lastName: string;
  username: string;
  createdAt: string;
}

interface BroadcastResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ userId: number; telegramId: number; error: string }>;
}

const VARIABLES = [
  { key: '{name}', label: 'Họ tên', example: 'Nguyễn Văn A' },
  { key: '{first_name}', label: 'Tên', example: 'A' },
  { key: '{last_name}', label: 'Họ', example: 'Nguyễn Văn' },
  { key: '{username}', label: 'Username', example: 'nguyenvana' },
];

export default function AdminTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [broadcastType, setBroadcastType] = useState<'text' | 'ai' | 'image'>('text');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [selectAll, setSelectAll] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.getAdminUsers().then(data => setUsers(data.users)).catch(() => {});
  }, []);

  const toggleUser = (userId: number) => {
    setSelectAll(false);
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectAll(true);
    setSelectedUserIds([]);
  };

  const insertVariable = (variable: string) => {
    const textarea = textRef.current;
    if (!textarea) {
      if (broadcastType === 'image') {
        setCaption(prev => prev + variable);
      } else {
        setMessage(prev => prev + variable);
      }
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = broadcastType === 'image' ? caption : message;
    const newValue = currentValue.slice(0, start) + variable + currentValue.slice(end);
    if (broadcastType === 'image') {
      setCaption(newValue);
    } else {
      setMessage(newValue);
    }
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleBroadcast = async () => {
    setSending(true);
    setResult(null);

    try {
      const targetIds = selectAll ? undefined : selectedUserIds;

      if (broadcastType === 'text') {
        if (!message.trim()) return;
        const res = await api.broadcastText(message, targetIds);
        setResult(res);
      } else if (broadcastType === 'ai') {
        if (!message.trim()) return;
        const res = await api.broadcastAI(message, targetIds);
        setResult(res);
      } else {
        if (!imageFile) return;
        const res = await api.broadcastImageUpload(imageFile, caption || undefined, targetIds);
        setResult(res);
      }
    } catch (error) {
      setResult({ total: 0, success: 0, failed: 1, errors: [{ userId: 0, telegramId: 0, error: (error as Error).message }] });
    } finally {
      setSending(false);
    }
  };

  const activeCount = selectAll ? users.length : selectedUserIds.length;
  const canSend = broadcastType === 'image' ? !!imageFile : !!message.trim();

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        borderRadius: 20,
        padding: '20px 20px',
        color: 'white',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>👑</span>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Admin Panel</h2>
        </div>
        <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>
          Broadcast tin nhắn & hình ảnh tới users
        </p>
        <div style={{
          display: 'flex',
          gap: 16,
          marginTop: 14,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '10px 14px',
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{users.length}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Tổng users</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#6ec046' }}>{activeCount}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Đang chọn</div>
          </div>
        </div>
      </div>

      {/* Broadcast Type Toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {([
          { key: 'text', icon: <Send size={13} />, label: 'Tin nhắn' },
          { key: 'ai', icon: <Sparkles size={13} />, label: 'AI Cá nhân' },
          { key: 'image', icon: <Image size={13} />, label: 'Hình ảnh' },
        ] as const).map(item => (
          <button
            key={item.key}
            onClick={() => setBroadcastType(item.key)}
            style={{
              flex: 1,
              padding: '10px 6px',
              borderRadius: 12,
              border: 'none',
              background: broadcastType === item.key
                ? item.key === 'ai'
                  ? 'linear-gradient(135deg, #8b5cf6, #a855f7)'
                  : 'linear-gradient(135deg, var(--green-start), var(--green-end))'
                : '#f0f5f2',
              color: broadcastType === item.key ? 'white' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.2s',
            }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {/* AI Mode Banner */}
      {broadcastType === 'ai' && (
        <div style={{
          background: 'linear-gradient(135deg, #f3e8ff, #ede9fe)',
          border: '1px solid #ddd6fe',
          borderRadius: 14,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: 12,
          color: '#6b21a8',
          lineHeight: 1.5,
        }}>
          <strong>✨ Chế độ AI Cá nhân hoá</strong><br />
          Bạn soạn 1 nội dung, AI sẽ tự viết lại theo giọng Penny riêng của từng user
          (bạn thân, trợ lý, nội trợ, huấn luyện viên, hề).
        </div>
      )}

      {/* Variables bar */}
      {broadcastType !== 'image' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
            Biến có sẵn (nhấn để chèn):
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {VARIABLES.map(v => (
              <button
                key={v.key}
                onClick={() => insertVariable(v.key)}
                title={`${v.label}: ${v.example}`}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  border: '1px solid #d9e8df',
                  background: '#f8fdf9',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--green-start)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--green-start)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = 'var(--green-start)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f8fdf9';
                  e.currentTarget.style.color = 'var(--green-start)';
                  e.currentTarget.style.borderColor = '#d9e8df';
                }}
              >
                <Copy size={10} /> {v.key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input — for text & AI modes */}
      {broadcastType !== 'image' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
            {broadcastType === 'ai' ? 'Nội dung gốc (AI sẽ viết lại)' : 'Nội dung tin nhắn (Markdown)'}
          </label>
          <textarea
            ref={textRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={broadcastType === 'ai'
              ? 'Ví dụ: Chào bạn! Tuần này Penny có tính năng mới, hãy thử lệnh /report nhé!'
              : 'Xin chào {name}, hôm nay bạn khoẻ không? 😊'}
            rows={5}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 14,
              border: '2px solid #d9e8df',
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = broadcastType === 'ai' ? '#8b5cf6' : 'var(--green-start)'}
            onBlur={(e) => e.target.style.borderColor = '#d9e8df'}
          />
        </div>
      )}

      {/* Image Upload — for image mode */}
      {broadcastType === 'image' && (
        <div style={{ marginBottom: 16 }}>
          {/* Upload Zone */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed #d9e8df',
              borderRadius: 16,
              padding: imagePreview ? 0 : '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: '#fafdf9',
              transition: 'all 0.2s',
              overflow: 'hidden',
              position: 'relative',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green-start)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#d9e8df'}
          >
            {imagePreview ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '100%', maxHeight: 250, objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  color: 'white',
                  padding: '20px 14px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  📸 {imageFile?.name} · Nhấn để đổi ảnh
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Nhấn để chọn ảnh
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  JPG, PNG, GIF · Tối đa 10MB
                </div>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {/* Caption with Variables */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              Biến có sẵn:
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {VARIABLES.map(v => (
                <button
                  key={v.key}
                  onClick={() => setCaption(prev => prev + v.key)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid #d9e8df',
                    background: '#f8fdf9',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--green-start)',
                    cursor: 'pointer',
                  }}
                >
                  {v.key}
                </button>
              ))}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption cho hình... (tuỳ chọn, hỗ trợ Markdown & biến)"
              rows={2}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 12,
                border: '2px solid #d9e8df',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* User Selection */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            <Users size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Người nhận
          </label>
          <button
            onClick={handleSelectAll}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: selectAll ? 'var(--green-start)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {selectAll ? '✅ Tất cả' : 'Chọn tất cả'}
          </button>
        </div>

        <div style={{
          maxHeight: 200,
          overflowY: 'auto',
          borderRadius: 14,
          border: '1px solid #e1e8e4',
        }}>
          {users.map(user => {
            const isSelected = selectAll || selectedUserIds.includes(user.id);
            return (
              <div
                key={user.id}
                onClick={() => toggleUser(user.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: '1px solid #f0f5f2',
                  cursor: 'pointer',
                  background: isSelected && !selectAll ? '#f0faf3' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark-green)' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    @{user.username || '?'} · ID: {user.telegramId}
                  </div>
                </div>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: isSelected ? 'none' : '2px solid #ccc',
                  background: isSelected ? 'linear-gradient(135deg, var(--green-start), var(--green-end))' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 12,
                  flexShrink: 0,
                }}>
                  {isSelected && '✓'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Send Button */}
      <Button
        onClick={handleBroadcast}
        disabled={sending || !canSend || activeCount === 0}
        style={{
          width: '100%',
          height: 48,
          borderRadius: 14,
          background: sending ? '#ccc' : broadcastType === 'ai'
            ? 'linear-gradient(135deg, #8b5cf6, #a855f7)'
            : 'linear-gradient(135deg, var(--green-start), var(--green-end))',
          color: 'white',
          border: 'none',
          fontSize: 15,
          fontWeight: 700,
          cursor: sending ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {sending ? (
          <><Loader2 size={18} className="animate-spin" /> {broadcastType === 'ai' ? 'AI đang soạn & gửi...' : 'Đang gửi...'}</>
        ) : (
          <>
            {broadcastType === 'ai' ? <Sparkles size={18} /> : <Send size={18} />}
            {broadcastType === 'ai' ? 'AI Gửi cá nhân hoá' : `Gửi tới ${activeCount} user${activeCount > 1 ? 's' : ''}`}
          </>
        )}
      </Button>

      {/* Result */}
      {result && (
        <div style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 14,
          background: result.failed === 0 ? '#f0faf3' : '#fff5f5',
          border: `1px solid ${result.failed === 0 ? '#c3e6cb' : '#f5c6cb'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {result.failed === 0 ? (
              <CheckCircle size={18} color="#28a745" />
            ) : (
              <XCircle size={18} color="#dc3545" />
            )}
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {result.failed === 0 ? 'Gửi thành công!' : 'Có lỗi xảy ra'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            ✅ Thành công: {result.success} / {result.total}
            {result.failed > 0 && ` · ❌ Lỗi: ${result.failed}`}
          </div>
          {result.errors.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#dc3545' }}>
              {result.errors.map((e, i) => (
                <div key={i}>• User {e.telegramId}: {e.error}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
