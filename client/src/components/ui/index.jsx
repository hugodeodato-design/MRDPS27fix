// src/components/ui/index.jsx — Composants UI partagés
import { T, ETAT_CONFIG, ROLE_CONFIG } from '../../utils/theme.js';

// ─── Icônes ───────────────────────────────────────────────────────────────────
const ICONS = {
  home:      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10"/>,
  package:   <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  history:   <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 101.85-5.31L1 10"/></>,
  users:     <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
  settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  edit:      <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  trash:     <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
  search:    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  upload:    <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
  download:  <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  logout:    <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  alert:     <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  check:     <polyline points="20 6 9 17 4 12"/>,
  x:         <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  eye:       <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  eyeoff:    <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
  menu:      <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  chevR:     <polyline points="9 18 15 12 9 6"/>,
  chevD:     <polyline points="18 9 12 15 6 9"/>,
  chevL:     <polyline points="15 18 9 12 15 6"/>,
  key:       <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
  filter:    <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  bell:      <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
  refresh:   <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>,
  info:      <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  tag:       <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
  lock:      <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
  save:      <><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
  arrowUp:   <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
  arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
  barChart:  <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  fileText:  <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  building:  <><rect x="2" y="7" width="20" height="15" rx="1"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></>,
  printer:   <><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>,
  shield:    <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  grid:      <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
  list:      <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></>,
  trend:     <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
  minus:     <line x1="5" y1="12" x2="19" y2="12"/>,
  copy:      <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
  server:    <><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></>,
};

export const Ic = ({ n, s = 16, c = 'currentColor', style: sx }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={sx}>
    {ICONS[n]}
  </svg>
);

export const Btn = ({ v = 'primary', onClick, children, sx = {}, disabled, size = 'md', full, type = 'button' }) => {
  const base = { cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 600, transition: 'all .15s', opacity: disabled ? .55 : 1, whiteSpace: 'nowrap' };
  const sizes = { sm: { padding: '5px 12px', fontSize: 12, borderRadius: 7 }, md: { padding: '8px 16px', fontSize: 13, borderRadius: 9 }, lg: { padding: '11px 22px', fontSize: 14, borderRadius: 10 } };
  const variants = {
    primary:   { background: `linear-gradient(135deg,${T.brand},${T.brandHov})`, color: '#fff', boxShadow: `0 2px 8px rgba(0,135,90,.3)` },
    secondary: { background: T.surface2, color: T.txt, border: `1px solid ${T.bdr}` },
    ghost:     { background: 'transparent', color: T.muted, border: `1px solid ${T.bdr}` },
    danger:    { background: T.redBg, color: T.red, border: `1px solid ${T.redBdr}` },
    success:   { background: T.greenBg, color: T.green, border: `1px solid ${T.greenBdr}` },
    blue:      { background: T.blueBg, color: T.blue, border: `1px solid ${T.blueBdr}` },
    orange:    { background: T.orangeBg, color: T.orange, border: `1px solid ${T.orangeBdr}` },
  };
  return <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...(variants[v] || variants.primary), width: full ? '100%' : undefined, ...sx }}>{children}</button>;
};

export const Field = ({ label, children, required, hint, row }) => (
  <div style={{ gridColumn: row ? '1/-1' : undefined }}>
    {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>
      {label}{required && <span style={{ color: T.red, marginLeft: 3 }}>*</span>}
    </label>}
    {children}
    {hint && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{hint}</div>}
  </div>
);

export const Inp = ({ value, onChange, onKeyDown, type = 'text', placeholder, style: sx = {}, as, autoFocus, readOnly, min }) => {
  const base = { width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface2, color: T.txt, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border .12s', lineHeight: 1.5 };
  if (as === 'textarea') return <textarea value={value} onChange={onChange} placeholder={placeholder} style={{ ...base, resize: 'vertical', minHeight: 80, ...sx }} />;
  return <input type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} autoFocus={autoFocus} readOnly={readOnly} min={min} style={{ ...base, ...sx }} />;
};

export const Sel = ({ value, onChange, children, style: sx = {} }) => (
  <select value={value} onChange={onChange} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: T.surface2, color: T.txt, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', cursor: 'pointer', ...sx }}>
    {children}
  </select>
);

export const Badge = ({ v = 'gray', children, dot, sm }) => {
  const styles = {
    green:  { background: T.greenBg,  color: T.green,  border: `1px solid ${T.greenBdr}`  },
    red:    { background: T.redBg,    color: T.red,    border: `1px solid ${T.redBdr}`    },
    orange: { background: T.orangeBg, color: T.orange, border: `1px solid ${T.orangeBdr}` },
    blue:   { background: T.blueBg,   color: T.blue,   border: `1px solid ${T.blueBdr}`   },
    purple: { background: T.purpleBg, color: T.purple, border: `1px solid ${T.purpleBdr}` },
    gray:   { background: T.grayBg,   color: T.muted,  border: `1px solid ${T.grayBdr}`   },
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: sm ? '2px 8px' : '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', ...(styles[v] || styles.gray) }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />}
      {children}
    </span>
  );
};

export const Card = ({ children, sx = {}, p = 20 }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 14, padding: p, ...sx }}>
    {children}
  </div>
);

export const Avatar = ({ name, color, size = 36, style: sx = {} }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: color || T.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0, ...sx }}>
    {(name || '?')[0].toUpperCase()}
  </div>
);

export const Modal = ({ title, subtitle, icon, children, onClose, footer, wide, xl }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,13,24,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 24, backdropFilter: 'blur(6px)' }}>
    <div style={{ background: T.surface, borderRadius: 20, width: xl ? 900 : wide ? 660 : 500, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: `1px solid ${T.bdr}` }}>
      <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${T.bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {icon && <div style={{ width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>}
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.txt }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>{subtitle}</div>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: T.surface2, border: `1px solid ${T.bdr}`, cursor: 'pointer', color: T.muted, width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 16 }}>
          <Ic n="x" s={15} />
        </button>
      </div>
      <div style={{ padding: 28, overflowY: 'auto', flex: 1 }}>{children}</div>
      {footer && <div style={{ padding: '18px 28px', borderTop: `1px solid ${T.bdr}`, display: 'flex', gap: 9, justifyContent: 'flex-end', flexShrink: 0, background: T.surface2, borderRadius: '0 0 20px 20px' }}>{footer}</div>}
    </div>
  </div>
);

export const StatCard = ({ icon, label, value, sub, color, bg, bdr, onClick }) => (
  <div onClick={onClick} style={{ background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 16, padding: '20px 22px', cursor: onClick ? 'pointer' : 'default', transition: 'all .15s' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: bg, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ic n={icon} s={20} c={color} />
      </div>
    </div>
    <div style={{ fontSize: 30, fontWeight: 800, color: T.txt, lineHeight: 1, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{sub}</div>}
  </div>
);

export const Divider = ({ sx = {} }) => <div style={{ height: 1, background: T.bdr, ...sx }} />;

export const Spinner = ({ size = 32 }) => (
  <div style={{ width: size, height: size, border: `3px solid rgba(0,135,90,.2)`, borderTopColor: T.brand, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
);

export const EtatBadge = ({ etat }) => {
  const cfg = ETAT_CONFIG[etat] || ETAT_CONFIG.en_stock;
  return <Badge v={etat === 'en_stock' ? 'green' : etat === 'sorti' ? 'orange' : etat === 'maintenance' ? 'blue' : 'red'} dot sm>{cfg.label}</Badge>;
};

export const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.user;
  return <Badge v={role === 'admin' ? 'orange' : role === 'viewer' ? 'gray' : 'blue'} sm>{cfg.label}</Badge>;
};

// Toast notification
let _toastCb = null;
export function registerToast(cb) { _toastCb = cb; }
export function toast(msg, type = 'success') { if (_toastCb) _toastCb(msg, type); }
