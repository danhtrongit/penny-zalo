import { useState, useEffect } from 'react';
import { api } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SLIDERS = [
  { key: 'sarcasmLevel', label: '😏 Cà khịa', low: 'Lịch sự', high: 'Roast nặng' },
  { key: 'seriousnessLevel', label: '🧐 Nghiêm túc', low: 'Chill', high: 'Nghiêm' },
  { key: 'frugalityLevel', label: '💰 Tiết kiệm', low: 'Thoải mái', high: 'Ki bo' },
  { key: 'emojiLevel', label: '😀 Emoji', low: 'Ít dùng', high: 'Max emoji' },
];

export default function SettingsTab() {
  const [persona, setPersona] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkCode, setLinkCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');

  useEffect(() => {
    api.getPersona().then(setPersona);
  }, []);

  const handleChange = (key: string, value: number) => {
    setPersona((p: any) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await api.updatePersona({
      sarcasmLevel: persona.sarcasmLevel,
      seriousnessLevel: persona.seriousnessLevel,
      frugalityLevel: persona.frugalityLevel,
      emojiLevel: persona.emojiLevel,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenerateLinkCode = async () => {
    setLinking(true);
    try {
      const result = await api.createZaloLinkCode();
      setLinkCode({
        code: result.code,
        expiresAt: result.expiresAt,
      });
    } finally {
      setLinking(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!pdfFile) return;
    setUploadingPdf(true);
    setPdfStatus('');

    try {
      const result = await api.uploadPdfImport(pdfFile);
      setPdfStatus(result.message || 'Đã nhập PDF thành công.');
      setPdfFile(null);
    } catch (error) {
      setPdfStatus((error as Error).message);
    } finally {
      setUploadingPdf(false);
    }
  };

  if (!persona) {
    return <div className="flex justify-center py-12"><div className="text-2xl">⚙️</div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass p-5 text-center">
        <div className="text-4xl mb-2">🎭</div>
        <h2 className="text-lg font-bold">Tính cách Penny</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Điều chỉnh cách Penny nói chuyện với bạn
        </p>
      </div>

      {/* Current role */}
      <Card>
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground mb-1">Vai trò hiện tại</div>
          <div className="text-lg font-bold text-gradient capitalize">
            {persona.preset || 'bạn thân'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Dùng /tone trong Zalo để đổi vai trò nhanh bằng text command
          </p>
        </CardContent>
      </Card>

      {/* Sliders */}
      <Card>
        <CardContent className="pt-4 space-y-6">
          {SLIDERS.map(({ key, label, low, high }) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">{label}</span>
                <Badge variant="secondary">{persona[key]}/10</Badge>
              </div>
              <Slider
                value={[persona[key] || 5]}
                onValueChange={([v]) => handleChange(key, v)}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">{low}</span>
                <span className="text-xs text-muted-foreground">{high}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? '⏳ Đang lưu...' : saved ? '✅ Đã lưu!' : '💾 Lưu thay đổi'}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>🔗 Liên kết Zalo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Nếu bạn từng dùng Penny trên Telegram, hãy tạo mã liên kết rồi gửi vào Zalo Bot theo cú pháp <strong>/link MÃ</strong>.
          </p>

          <Button onClick={handleGenerateLinkCode} disabled={linking} className="w-full" variant="outline">
            {linking ? '⏳ Đang tạo mã...' : 'Tạo mã liên kết Zalo'}
          </Button>

          {linkCode && (
            <div className="rounded-xl border border-dashed p-4 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">Mã hiện tại</div>
              <div className="text-2xl font-bold tracking-[0.25em]">{linkCode.code}</div>
              <div className="text-xs text-muted-foreground mt-2">
                Hết hạn lúc {new Date(linkCode.expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📄 Nhập PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Zalo Bot hiện không nhận file PDF trực tiếp qua chat. Bạn có thể tải PDF lên tại đây để Penny đọc và lưu chi tiêu như bot cũ.
          </p>

          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
            className="block w-full text-sm"
          />

          <Button onClick={handleUploadPdf} disabled={!pdfFile || uploadingPdf} className="w-full" variant="outline">
            {uploadingPdf ? '⏳ Đang xử lý PDF...' : 'Tải lên và phân tích PDF'}
          </Button>

          {pdfStatus && (
            <div className="rounded-xl border p-3 text-sm whitespace-pre-line bg-muted/30">
              {pdfStatus}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
