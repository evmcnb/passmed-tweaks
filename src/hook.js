// Runs in the page's own JS world: captures the question JSON the site already loads
// and reports which question is on screen. Read-only — never sends anything.
(() => {
  const post = (m) => window.postMessage({ pmt: 1, ...m }, location.origin);

  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._pmtUrl = String(url);
    return open.apply(this, arguments);
  };
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this._pmtUrl && this._pmtUrl.includes('multi_ajax_question_data.php')) {
      this.addEventListener('load', () => {
        try {
          const q = new URL(this._pmtUrl, location.href).searchParams.getAll('q[]');
          post({ type: 'qdata', q, data: JSON.parse(this.responseText) });
        } catch (e) { /* not JSON, ignore */ }
      });
    }
    return send.apply(this, arguments);
  };

  // ponytail: polling a page global; hook the site's navigation if this ever matters
  setInterval(() => {
    let idx;
    try { idx = current_question; } catch (e) { return; } // eslint-disable-line no-undef
    post({ type: 'cur', idx });
  }, 400);
})();
