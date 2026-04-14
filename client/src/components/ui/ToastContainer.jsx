// src/components/ui/ToastContainer.jsx
import { Ic } from './index.jsx';
import { T } from '../../utils/theme.js';

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 9999, maxWidth: 360 }}>
      {toasts.map(t => {
        const isErr = t.type === 'error';
        const isWarn = t.type === 'warning';
        const bg = isErr ? T.redBg : isWarn ? T.orangeBg : T.greenBg;
        const bdr = isErr ? T.redBdr : isWarn ? T.orangeBdr : T.greenBdr;
        const col = isErr ? T.red : isWarn ? T.orange : T.green;
        const icon = isErr ? 'alert' : isWarn ? 'alert' : 'check';
        return (
          <div key={t.id} style={{ background: T.surface, border: `1px solid ${bdr}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,.4)', animation: 'slideIn .2s ease' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ic n={icon} s={14} c={col} />
            </div>
            <span style={{ flex: 1, fontSize: 13, color: T.txt, fontWeight: 500 }}>{t.msg}</span>
            <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 2, display: 'flex' }}>
              <Ic n="x" s={12} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}
