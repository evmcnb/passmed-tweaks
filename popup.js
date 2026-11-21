/* global PMT_DEFAULTS, PMT_THEMES */
const themeSel = document.getElementById('theme');
for (const [k, t] of Object.entries(PMT_THEMES)) themeSel.append(new Option(t ? t.label : 'Site default', k));

const inputs = document.querySelectorAll('[name]');
const showCustom = () => document.getElementById('custom').classList.toggle('on', themeSel.value === 'custom');
const showScale = () => { document.getElementById('scaleOut').textContent = document.querySelector('[name=fontScale]').value + '%'; };

chrome.storage.sync.get(PMT_DEFAULTS, (s) => {
  for (const el of inputs) {
    if (el.type === 'checkbox') el.checked = !!s[el.name];
    else el.value = s[el.name];
  }
  showCustom(); showScale();
});

document.querySelector('[name=fontScale]').addEventListener('input', showScale);
// 'change' (not 'input') so dragging sliders/colour pickers doesn't blow the sync write quota
for (const el of inputs) {
  el.addEventListener('change', () => {
    const v = el.type === 'checkbox' ? el.checked : (el.type === 'number' || el.type === 'range') ? Number(el.value) : el.value;
    chrome.storage.sync.set({ [el.name]: v });
    showCustom(); showScale();
  });
}
