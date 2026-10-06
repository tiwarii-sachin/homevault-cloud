const express = require('express'), multer = require('multer'), bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'change-this-secret';
const DATA = path.join(__dirname, 'data'), UP = path.join(__dirname, 'uploads');
fs.mkdirSync(DATA, { recursive: true }); fs.mkdirSync(UP, { recursive: true });

// ---- tiny JSON "database" (swap with MongoDB/SQLite later) ----
const DBF = path.join(DATA, 'db.json');
let db = fs.existsSync(DBF) ? JSON.parse(fs.readFileSync(DBF)) : { users: [], files: [] };
const save = () => fs.writeFileSync(DBF, JSON.stringify(db, null, 2));

// ---- file storage (disk now; replace with S3/Firebase in the multer storage) ----
const upload = multer({
  storage: multer.diskStorage({ destination: UP, filename: (req, f, cb) => cb(null, crypto.randomUUID()) }),
  limits: { fileSize: 500 * 1024 * 1024 }
});

const kind = (name, type = '') => {
  if (type.startsWith('image/')) return 'photos';
  if (type.startsWith('video/')) return 'videos';
  if (type.includes('pdf') || type.startsWith('text/') || /\.(docx?|xlsx?|pptx?|txt|md|csv)$/i.test(name)) return 'documents';
  return 'others';
};

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function auth(req, res, next) {
  try {
    const p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
    req.user = db.users.find(u => u.id === p.id);
    if (!req.user) throw new Error();
    next();
  } catch { res.status(401).json({ error: 'Please log in again' }); }
}
const sign = u => ({ token: jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' }), user: { username: u.username, role: u.role } });

// ---- auth ----
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) return res.status(400).json({ error: 'Username and a 6+ character password are required' });
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) return res.status(409).json({ error: 'Username already taken' });
  const u = { id: crypto.randomUUID(), username, hash: await bcrypt.hash(password, 10), role: db.users.length ? 'User' : 'Admin' };
  db.users.push(u); save(); res.json(sign(u));
});
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const u = db.users.find(x => x.username.toLowerCase() === String(username).toLowerCase());
  if (!u || !(await bcrypt.compare(String(password), u.hash))) return res.status(401).json({ error: 'Wrong username or password' });
  res.json(sign(u));
});

// ---- files ----
const canSee = (u, f) => f.owner === u.id || f.shared || u.role === 'Admin';
const out = f => ({ id: f.id, name: f.name, size: f.size, cat: f.cat, at: f.at, shared: f.shared, trash: f.trash, owner: (db.users.find(u => u.id === f.owner) || {}).username || '?' });

app.get('/api/files', auth, (req, res) => {
  const v = req.query.view || 'mine', u = req.user;
  const mine = db.files.filter(f => f.owner === u.id && !f.trash);
  const list = db.files.filter(f => v === 'trash' ? f.owner === u.id && f.trash
    : !f.trash && (v === 'mine' ? f.owner === u.id : v === 'shared' ? f.shared : canSee(u, f)));
  const by = {}; mine.forEach(f => { (by[f.cat] ??= { n: 0, size: 0 }); by[f.cat].n++; by[f.cat].size += f.size; });
  res.json({ files: list.map(out), stats: { count: mine.length, size: mine.reduce((a, f) => a + f.size, 0), by } });
});

app.post('/api/upload', auth, upload.array('files', 20), (req, res) => {
  const shared = req.body.shared === 'true';
  (req.files || []).forEach(f => {
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8');
    db.files.push({ id: crypto.randomUUID(), disk: f.filename, name, size: f.size, cat: kind(name, f.mimetype), at: Date.now(), owner: req.user.id, shared, trash: false });
  });
  save(); res.json({ ok: true, count: (req.files || []).length });
});

app.get('/api/files/:id/download', auth, (req, res) => {
  const f = db.files.find(x => x.id === req.params.id);
  if (!f || !canSee(req.user, f)) return res.status(404).json({ error: 'File not found' });
  res.download(path.join(UP, f.disk), f.name);
});

app.patch('/api/files/:id', auth, (req, res) => {
  const f = db.files.find(x => x.id === req.params.id && x.owner === req.user.id);
  if (!f) return res.status(404).json({ error: 'File not found' });
  if (typeof req.body.trash === 'boolean') f.trash = req.body.trash;
  if (typeof req.body.shared === 'boolean') f.shared = req.body.shared;
  save(); res.json(out(f));
});

app.delete('/api/files/:id', auth, (req, res) => {
  const f = db.files.find(x => x.id === req.params.id && (x.owner === req.user.id || req.user.role === 'Admin'));
  if (!f) return res.status(404).json({ error: 'File not found' });
  fs.rm(path.join(UP, f.disk), { force: true }, () => {});
  db.files = db.files.filter(x => x !== f); save(); res.json({ ok: true });
});

app.use((err, req, res, next) => res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 500).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is over 500 MB' : 'Server error' }));
app.listen(PORT, () => console.log(`HomeVault running on http://localhost:${PORT}`));
