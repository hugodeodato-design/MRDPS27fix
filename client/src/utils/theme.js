// src/utils/theme.js — Thème et constantes UI
export const T = {
  bg:       '#060D18',
  surface:  '#0D1B2E',
  surface2: '#112240',
  bdr:      'rgba(255,255,255,.08)',
  txt:      '#E8F0FE',
  muted:    'rgba(255,255,255,.45)',
  brand:    '#00875A',
  brandHov: '#006644',
  blue:     '#0065FF',
  blueBg:   'rgba(0,101,255,.12)',
  blueBdr:  'rgba(0,101,255,.3)',
  orange:   '#FF8B00',
  orangeBg: 'rgba(255,139,0,.12)',
  orangeBdr:'rgba(255,139,0,.3)',
  red:      '#DE350B',
  redBg:    'rgba(222,53,11,.12)',
  redBdr:   'rgba(222,53,11,.3)',
  green:    '#00875A',
  greenBg:  'rgba(0,135,90,.12)',
  greenBdr: 'rgba(0,135,90,.3)',
  purple:   '#6554C0',
  purpleBg: 'rgba(101,84,192,.15)',
  purpleBdr:'rgba(101,84,192,.3)',
  yellow:   '#FFAB00',
  yellowBg: 'rgba(255,171,0,.12)',
  yellowBdr:'rgba(255,171,0,.3)',
  gray:     'rgba(255,255,255,.2)',
  grayBg:   'rgba(255,255,255,.06)',
  grayBdr:  'rgba(255,255,255,.15)',
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
};

export const DEFAULT_COLS = [
  { k: 'reference',   l: 'Référence',   fixed: true,  visible: true  },
  { k: 'designation', l: 'Désignation', fixed: true,  visible: true  },
  { k: 'categorie',   l: 'Catégorie',   fixed: false, visible: true  },
  { k: 'emplacement', l: 'Emplacement', fixed: false, visible: true  },
  { k: 'quantite',    l: 'Quantité',    fixed: false, visible: true  },
  { k: 'etat',        l: 'État',        fixed: false, visible: true  },
  { k: 'date_entree', l: 'Date entrée', fixed: false, visible: true  },
  { k: 'date_sortie', l: 'Date sortie', fixed: false, visible: false },
  { k: 'autres_infos',l: 'Infos',       fixed: false, visible: false },
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
