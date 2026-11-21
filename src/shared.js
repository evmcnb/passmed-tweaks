// Shared by content script and popup.
var PMT_DEFAULTS = {
  theme: 'site',
  customBg: '#1b1d23', customSurface: '#252830', customText: '#e6e6e6', customAccent: '#4f9cf9',
  font: 'site', fontScale: 100,
  polish: true, wide: false, focus: false, hideAi: false, hideBanner: true,
  hideScores: false, hidePeer: false,
  insights: true, insightsPreAnswer: false, conceptExplanation: true,
  comments: true, commentSort: 'top', minCommentScore: 0, hideReplyBoxes: true, collapseReplies: false,
  timer: true,
  blindBlock: false, blindBlockSize: 10,
  coverTest: false, coverType: true,
  logStats: true, peerCompare: true,
  labTables: true, labFlags: false,
  reviewDifficulty: true, paceSeconds: 90,
};

// Passmedicine category ids (UKMLA resource); unknown ids show as "Category N".
var PMT_CATEGORIES = {
  1: 'Dermatology', 2: 'Ear, nose and throat', 3: 'Ethics and law', 4: 'Medicine', 5: 'Musculoskeletal',
  6: 'Obstetrics and gynaecology', 7: 'Ophthalmology', 8: 'Paediatrics', 9: 'Pharmacology',
  10: 'Psychiatry', 11: 'Statistics', 12: 'Surgery',
};
var pmtCategory = (id) => PMT_CATEGORIES[id] || `Category ${id}`;

var PMT_THEMES = {
  site:      null,
  midnight:  { label: 'Midnight',        dark: true,  bg: '#0f172a', surface: '#1e293b', text: '#e2e8f0', accent: '#38bdf8' },
  oled:      { label: 'OLED black',      dark: true,  bg: '#000000', surface: '#0d0d0d', text: '#e5e5e5', accent: '#a78bfa' },
  nord:      { label: 'Nord',            dark: true,  bg: '#2e3440', surface: '#3b4252', text: '#eceff4', accent: '#88c0d0' },
  dracula:   { label: 'Dracula',         dark: true,  bg: '#282a36', surface: '#343746', text: '#f8f8f2', accent: '#bd93f9' },
  forest:    { label: 'Forest',          dark: true,  bg: '#16201b', surface: '#1f2d26', text: '#dfeee5', accent: '#5ad19a' },
  sepia:     { label: 'Sepia',           dark: false, bg: '#f4ecd8', surface: '#fbf6e9', text: '#3b2f22', accent: '#a0522d' },
  solarized: { label: 'Solarized light', dark: false, bg: '#fdf6e3', surface: '#fffbef', text: '#4a5b63', accent: '#268bd2' },
  mint:      { label: 'Mint',            dark: false, bg: '#eef6f2', surface: '#ffffff', text: '#1f2d27', accent: '#0f9d76' },
  custom:    { label: 'Custom…' },
};

var PMT_FONTS = {
  site: '',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  readable: 'Verdana, Tahoma, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, Consolas, monospace',
};
