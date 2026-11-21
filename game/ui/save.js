// Saving: the artifact's server storage first (follows your Claude account across devices),
// with a copy in this browser as a fallback, and file export/import as a backup you hold.

const LOCAL_KEY = 'frontier-save';
const TIMEOUT = 10000;

const withTimeout = (p, ms = TIMEOUT) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export function createSaves() {
  let ref = null;
  let downloads = null;
  let mode = 'starting'; // 'account' | 'browser' | 'none'
  let writing = false;
  let queued = null;
  let lastError = null;
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn(status()));

  function status() {
    return { mode, writing: writing || !!queued, error: lastError, canDownload: !!downloads };
  }

  async function init() {
    const claude = window.claude;
    if (claude?.use) {
      try {
        const [db, user, dl] = await Promise.all([claude.use('db'), claude.use('user'), claude.use('downloads')]);
        downloads = dl;
        const uid = db && user ? await user.id() : null;
        if (uid) ref = db.doc(`saves/${uid}`);
      } catch (e) { lastError = 'Could not reach your account storage.'; }
    }
    mode = ref ? 'account' : localOk() ? 'browser' : 'none';
    notify();
  }

  function localOk() {
    try { localStorage.setItem('frontier-probe', '1'); localStorage.removeItem('frontier-probe'); return true; } catch { return false; }
  }

  function readLocal() {
    try { const raw = localStorage.getItem(LOCAL_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  function writeLocal(state) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }

  // Returns the saved game, or null if there isn't one.
  async function load() {
    if (ref) {
      try {
        const snap = await withTimeout(ref.get());
        if (snap.exists) return snap.data().state;
        return readLocal(); // carry a browser save over to the account on first visit
      } catch (e) {
        lastError = 'Your account save could not be reached, so this browser\'s copy was loaded.';
        notify();
      }
    }
    return readLocal();
  }

  async function flush() {
    if (writing || !queued) return;
    writing = true; notify();
    const state = queued; queued = null;
    try {
      await ref.set({ state, version: state.version, savedAt: new Date().toISOString() });
      lastError = null;
    } catch (e) {
      // One retry for a passing problem, then report it.
      try { await new Promise((r) => setTimeout(r, 800 + Math.random() * 800)); await ref.set({ state, version: state.version, savedAt: new Date().toISOString() }); lastError = null; }
      catch (e2) { lastError = e2?.code === 'quota_exceeded' ? 'Account storage is full.' : 'The last save to your account failed. It will try again after your next action.'; }
    }
    writing = false; notify();
    if (queued) flush();
  }

  // Save after every action. Writes to the account go one at a time; the newest state wins.
  function save(state) {
    const copy = JSON.parse(JSON.stringify(state));
    writeLocal(copy);
    if (!ref) return;
    queued = copy;
    flush();
  }

  async function exportFile(state, filename) {
    const data = JSON.stringify(state, null, 1);
    if (!downloads) return { ok: false, text: data };
    try { await downloads.save({ filename, data }); return { ok: true }; }
    catch (e) { return { ok: false, text: data, declined: e?.code === 'declined' }; }
  }

  return { init, load, save, exportFile, status, onChange: (fn) => listeners.add(fn) };
}
