import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatCurrency, formatDate, formatDateTime, toInputDate, CATEGORY_SVG, CATEGORIES } from '../utils';
import CategoryIcon from '../components/CategoryIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarDays } from 'lucide-react';

const PERIODS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
  { id: 'all', label: 'Tất cả' },
  { id: 'custom', label: 'Tuỳ chọn' },
];

export default function StatsTab() {
  const [period, setPeriod] = useState('month');
  const [category, setCategory] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editTx, setEditTx] = useState<any>(null);

  // Custom date range
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const [customFrom, setCustomFrom] = useState(toInputDate(defaultFrom));
  const [customTo, setCustomTo] = useState(toInputDate(today));

  const fetchData = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (period === 'custom') {
      params.from = customFrom;
      params.to = customTo;
    } else {
      params.period = period;
    }
    if (category) params.category = category;

    api.getStats(params)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [period, category, customFrom, customTo]);

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {PERIODS.map((p) => (
          <Button
            key={p.id}
            variant={period === p.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p.id)}
            className="shrink-0"
          >
            {p.id === 'custom' && <CalendarDays className="w-3.5 h-3.5 mr-1" />}
            {p.label}
          </Button>
        ))}
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="date-filter-panel" style={{ margin: 0 }}>
          <div className="date-range-inputs">
            <div className="date-input-group">
              <CalendarDays size={14} />
              <label>Từ</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div className="date-input-group">
              <CalendarDays size={14} />
              <label>Đến</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Button
          variant={!category ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCategory('')}
          className="shrink-0 text-xs h-7"
        >
          Tất cả
        </Button>
        {CATEGORIES.map((c) => (
          <Button
            key={c}
            variant={category === c ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setCategory(c)}
            className="shrink-0 text-xs h-7"
          >
            <span
              className="inline-flex"
              style={{ width: 14, height: 14, marginRight: 4 }}
              dangerouslySetInnerHTML={{
                __html: (CATEGORY_SVG[c] || CATEGORY_SVG['Khác']).replace(
                  '<svg',
                  '<svg width="14" height="14" style="display:inline-block;vertical-align:middle;"'
                ),
              }}
            />
            {c}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green-start)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v16a2 2 0 0 0 2 2h16"/>
              <path d="m19 9-5 5-4-4-3 3"/>
            </svg>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Total */}
          <div className="glass p-5 text-center">
            <div className="text-xs text-muted-foreground">Tổng chi</div>
            <div className="text-3xl font-bold text-gradient mt-1">{formatCurrency(data.total)}</div>
            <Badge variant="secondary" className="mt-2">{data.count} giao dịch</Badge>
          </div>

          {/* Category breakdown */}
          {data.categories?.length > 0 && !category && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Phân rã danh mục
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.categories.map((cat: any) => {
                  const pct = data.total > 0 ? Math.round((cat.total / data.total) * 100) : 0;
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <CategoryIcon category={cat.category} size={24} showBackground={false} />
                          <span>{cat.category}</span>
                        </span>
                        <span className="font-medium">{formatCurrency(cat.total)}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Transaction list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Giao dịch ({data.count})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {data.transactions?.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 rounded-md px-1 -mx-1"
                  onClick={() => setEditTx(tx)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CategoryIcon category={tx.category} size={28} showBackground={false} />
                    <div className="text-sm truncate">{tx.description}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--penny-red, #ef4444)' }}>
                      -{formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Edit dialog */}
      {editTx && (
        <EditDialog tx={editTx} onClose={() => setEditTx(null)} onRefresh={fetchData} />
      )}
    </div>
  );
}

function EditDialog({ tx, onClose, onRefresh }: { tx: any; onClose: () => void; onRefresh: () => void }) {
  const [desc, setDesc] = useState(tx.description);
  const [amount, setAmount] = useState(String(tx.amount));
  const [cat, setCat] = useState(tx.category);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await api.updateTransaction(tx.id, { description: desc, amount: parseInt(amount), category: cat });
    onRefresh();
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm('Xóa giao dịch này?')) return;
    await api.deleteTransaction(tx.id);
    onRefresh();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa giao dịch</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mô tả</label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Số tiền (VNĐ)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Danh mục</label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon category={c} size={18} showBackground={false} />
                      <span>{c}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ngày giao dịch</label>
            <div className="text-sm font-medium">{formatDateTime(tx.date)}</div>
          </div>
          {/* Receipt preview */}
          {tx.mediaPath && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hoá đơn gốc</label>
              {tx.mediaPath.endsWith('.pdf') ? (
                <a
                  href={`/api/media/${tx.mediaPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg"
                  style={{ background: 'var(--bg-app)', color: 'var(--green-start)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                  </svg>
                  Mở PDF
                </a>
              ) : (
                <img
                  src={`/api/media/${tx.mediaPath}`}
                  alt="Receipt"
                  style={{
                    width: '100%',
                    maxHeight: 200,
                    objectFit: 'contain',
                    borderRadius: 12,
                    border: '1px solid #d9e8df',
                    cursor: 'pointer',
                  }}
                  onClick={() => window.open(`/api/media/${tx.mediaPath}`, '_blank')}
                />
              )}
            </div>
          )}
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="destructive" onClick={handleDelete} className="flex-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            Xóa
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? '...' : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                  <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
                  <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>
                </svg>
                Lưu
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
