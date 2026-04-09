import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatVND, formatDateTime12h, toInputDate } from '../utils';
import CategoryIcon from '../components/CategoryIcon';

// Icons (Lucide for UI controls only)
import {
  ReceiptText,
  MessageSquareMore,
  ClipboardList,
  ArrowDownToLine,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

// Images
import botHappy from '../assets/images/bot_happy.png';
import botAngry from '../assets/images/bot_angry.png';

export default function HomeTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date filter state
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1); // first of month
  const [dateFrom, setDateFrom] = useState(toInputDate(defaultFrom));
  const [dateTo, setDateTo] = useState(toInputDate(today));

  const refresh = () => {
    setLoading(true);
    api.getSummary({ from: dateFrom, to: dateTo }).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, [dateFrom, dateTo]);

  if (loading) return <Loading />;
  if (!data) return null;

  const getCompareText = (current: number, prev: number) => {
    if (!prev || prev === 0) return current > 0 ? '+100%' : '0%';
    const diff = current - prev;
    const percent = Math.round((diff / prev) * 100);
    return percent > 0 ? `+${percent}%` : `${percent}%`;
  };

  const monthBudget = data.budgets?.find((b: any) => b.period === 'month') || { amount: 5000000, spent: 2500000 };
  const currentMonth = new Date().getMonth() + 1;
  const budgetProgress = Math.min(100, Math.round((monthBudget.spent / monthBudget.amount) * 100)) || 0;


  return (
    <div style={{ paddingBottom: 100 }}>

      {/* 1. Stacked Budget Card */}
      <div className="budget-card-stack">
        <div className="budget-card-bg-3" />
        <div className="budget-card-bg-2" />
        <div className="budget-card-bg-1" />

        <div className="budget-card-main" style={{ position: 'relative' }}>
          {/* Card nav arrows */}
          <div className="card-nav-arrows">
            <button className="card-nav-arrow">
              <ChevronLeft size={16} />
            </button>
            <button className="card-nav-arrow">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Header */}
          <div className="budget-card-header">
            <div>
              <div className="budget-label">Hạn mức chi tiêu</div>
              <div className="budget-month">Tháng {currentMonth}</div>
              <div className="budget-amount">
                {formatVND(monthBudget.amount)} VND
                <button className="budget-eye-btn">
                  <Eye size={18} />
                </button>
              </div>
            </div>
            <div className="p-token">
              <span>P</span>
            </div>
          </div>

          {/* Progress bar area */}
          <div className="budget-progress-area">
            {/* Tooltip — only show relevant one */}
            {budgetProgress < 70 && (
              <div
                className="progress-tooltip"
                style={{ left: `max(0%, calc(${budgetProgress}% - 40px))`, top: 0 }}
              >
                Chi tiêu hợp lý lắm!
              </div>
            )}

            {budgetProgress >= 70 && (
              <div
                className="progress-tooltip right"
                style={{ right: '0', top: -20 }}
              >
                Sắp cháy ví rồi!
              </div>
            )}

            {/* Track & Fill */}
            <div className="penny-progress-track">
              <div className="penny-progress-fill" style={{ width: `${budgetProgress}%` }} />
            </div>

            {/* Happy Bot Marker */}
            <div
              className="progress-bot-marker"
              style={{
                left: `${budgetProgress}%`,
                top: 26,
              }}
            >
              <img src={botHappy} alt="Penny" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            </div>

            {/* Angry Bot at the end */}
            <div
              className="progress-bot-marker"
              style={{
                left: '92%',
                top: 26,
              }}
            >
              <img src={botAngry} alt="Warning" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            </div>
          </div>

          <div className="budget-tagline">
            PENNY - GIỮ VÍ KHOẺ, CHI TIỀN VUI
          </div>
        </div>
      </div>

      {/* 2. Quick Actions */}
      <div className="quick-actions">
        <QuickAction icon={<ReceiptText size={22} />} label="Hạn Mức" />
        <QuickAction icon={<MessageSquareMore size={22} />} label="Nhắc" />
        <QuickAction icon={<ClipboardList size={22} />} label="Công Nợ" />
        <QuickAction icon={<ArrowDownToLine size={22} />} label="Báo Cáo" />
        <QuickAction icon={<MoreHorizontal size={22} />} label="Thêm" />
      </div>

      {/* 3. Summary Banner */}
      <div className="summary-banner">
        <div className="summary-col">
          <div className="summary-col-title">Tháng Này</div>
          <div className="summary-amount">{formatVND(data.month)} đ</div>
          <div className="summary-compare">{getCompareText(data.month, data.prevMonth)} so vs tháng trước</div>
        </div>

        <div className="summary-divider" />

        <div className="summary-col">
          <div className="summary-col-title">Tuần Này</div>
          <div className="summary-amount">{formatVND(data.week)} đ</div>
          <div className="summary-compare">{getCompareText(data.week, data.prevWeek)} so vs tuần trước</div>
        </div>
      </div>

      {/* 4. Transactions List */}
      <div className="transactions-section">
        <div className="transactions-header">
          <h3 className="transactions-title">Biến Động Chi Tiêu</h3>
        </div>

        {data.recent?.length > 0 ? (
          <div className="transaction-list">
            {data.recent.map((tx: any) => (
              <div key={tx.id} className="transaction-item">
                <div className="transaction-left">
                  <CategoryIcon category={tx.category} size={42} />
                  <div className="transaction-info">
                    <div className="transaction-desc">{tx.description || tx.category}</div>
                    <div className="transaction-date" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {formatDateTime12h(tx.date)}
                      {tx.mediaPath && (
                        <span
                          title="Có hoá đơn gốc"
                          style={{ cursor: 'pointer', opacity: 0.7 }}
                          onClick={(e) => { e.stopPropagation(); window.open(`/api/media/${tx.mediaPath}`, '_blank'); }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                            <circle cx="9" cy="9" r="2"/>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="transaction-amount">
                  -{formatVND(tx.amount).replace(/đ/g, '').trim()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
              </svg>
            </div>
            <div className="empty-state-text">Chưa có giao dịch nào.</div>
          </div>
        )}
      </div>

    </div>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="quick-action-btn">
      <div className="quick-action-icon">
        {icon}
      </div>
      <span className="quick-action-label">{label}</span>
    </button>
  );
}

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <div>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--green-start)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
        </svg>
      </div>
    </div>
  );
}
