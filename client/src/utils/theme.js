// src/utils/theme.js — Thème clair (original)
export const T = {
  // Brand
  brand:    '#00875A',
  brandHov: '#006644',
  brandL:   '#E3FCEF',
  brandM:   '#57D9A3',
  // Sidebar (reste sombre)
  side:       '#0F1C2E',
  sideB:      '#162032',
  sideAct:    'rgba(0,135,90,0.15)',
  sideActBdr: '#00875A',
  sideTxt:    'rgba(255,255,255,0.45)',
  sideTxtH:   'rgba(255,255,255,0.75)',
  sideTxtA:   '#FFFFFF',
  sideBdr:    'rgba(255,255,255,0.06)',
  // Content (clair)
  bg:       '#F0F2F5',
  surface:  '#FFFFFF',
  surface2: '#F8FAFC',
  bdr:      '#E8ECF1',
  bdrD:     '#D0D8E4',
  txt:      '#0D1B2A',
  sub:      '#4A5568',
  muted:    '#8B9BB4',
  // Status
  green:     '#00875A',
  greenBg:   '#E3FCEF',
  greenBdr:  '#ABF5D1',
  greenTxt:  '#006644',
  red:       '#DE350B',
  redBg:     '#FFEBE6',
  redBdr:    '#FFBDAD',
  redTxt:    '#BF2600',
  orange:    '#FF8B00',
  orangeBg:  '#FFFAE6',
  orangeBdr: '#FFE380',
  orangeTxt: '#974F0C',
  blue:      '#0065FF',
  blueBg:    '#DEEBFF',
  blueBdr:   '#4C9AFF',
  blueTxt:   '#0747A6',
  purple:    '#6554C0',
  purpleBg:  '#EAE6FF',
  purpleBdr: '#B3A9FF',
  cyan:      '#00B8D9',
  cyanBg:    '#E6FCFF',
  cyanBdr:   '#79E2F2',
  yellow:    '#FFAB00',
  yellowBg:  '#FFFAE6',
  yellowBdr: '#FFE380',
  gray:      'rgba(0,0,0,.2)',
  grayBg:    '#F4F5F7',
  grayBdr:   '#DFE1E6',
  white:     '#FFFFFF',
  // Shadows
  sm: '0 1px 2px rgba(0,0,0,.05)',
  md: '0 4px 12px rgba(0,0,0,.08),0 1px 3px rgba(0,0,0,.04)',
  lg: '0 20px 60px rgba(0,0,0,.12),0 8px 24px rgba(0,0,0,.06)',
  xl: '0 32px 80px rgba(0,0,0,.18),0 8px 24px rgba(0,0,0,.08)',
};

export const ETAT_CONFIG = {
  en_stock:    { label: 'En stock',    color: T.green,  bg: T.greenBg,  bdr: T.greenBdr  },
  sorti:       { label: 'Sorti',       color: T.orange, bg: T.orangeBg, bdr: T.orangeBdr },
  maintenance: { label: 'Maintenance', color: T.blue,   bg: T.blueBg,   bdr: T.blueBdr   },
  rebut:       { label: 'Rebut',       color: T.red,    bg: T.redBg,    bdr: T.redBdr    },
};

export const ROLE_CONFIG = {
  admin:  { label: 'Administrateur', color: T.orange, bg: T.orangeBg, bdr: T.orangeBdr },
  user:   { label: 'Utilisateur',    color: T.blue,   bg: T.blueBg,   bdr: T.blueBdr   },
  viewer: { label: 'Lecture seule',  color: T.gray,   bg: T.grayBg,   bdr: T.grayBdr   },
  client: { label: 'Client',         color: T.cyan,   bg: T.cyanBg,   bdr: T.cyanBdr   },
};

export const DEFAULT_COLS = [
  { k: 'reference',    l: 'Référence',    fixed: true,  visible: true  },
  { k: 'designation',  l: 'Désignation',  fixed: true,  visible: true  },
  { k: 'categorie',    l: 'Catégorie',    fixed: false, visible: true  },
  { k: 'emplacement',  l: 'Emplacement',  fixed: false, visible: true  },
  { k: 'quantite',     l: 'Quantité',     fixed: false, visible: true  },
  { k: 'etat',         l: 'État',         fixed: false, visible: true  },
  { k: 'date_entree',  l: 'Date entrée',  fixed: false, visible: true  },
  { k: 'date_sortie',  l: 'Date sortie',  fixed: false, visible: false },
  { k: 'autres_infos', l: 'Infos',        fixed: false, visible: false },
];

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('fr-FR');
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
