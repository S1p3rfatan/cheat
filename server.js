import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'flag.json');
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'b6e9942b4a9e45229ba5c5463519314b';

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return { enabled: true }; }
}
function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const app = express();
app.use(express.json());

function checkToken(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token || token !== AUTH_TOKEN) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  next();
}

app.post('/api/check', checkToken, (req, res) => {
  const data = load();
  res.json({ success: true, enabled: data.enabled || false });
});

app.post('/api/set', checkToken, (req, res) => {
  const data = load();
  data.enabled = req.body.enabled === true || req.body.enabled === false ? req.body.enabled : true;
  save(data);
  res.json({ success: true, enabled: data.enabled });
});

app.get('/', (req, res) => {
  const data = load();
  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Xenvora Auth</title>
<style>body{background:#111;color:#ccc;font-family:monospace;padding:40px;text-align:center}
.status{font-size:48px;margin:40px}
.on{color:#0f0}.off{color:#f44}
button{background:#222;border:2px solid #444;color:#fff;font-size:24px;padding:16px 40px;cursor:pointer;margin:10px}
button:hover{border-color:#888}
</style></head><body>
<h1>Xenvora</h1>
<div class="status ${data.enabled ? 'on' : 'off'}">${data.enabled ? 'ENABLED' : 'DISABLED'}</div>
<button onclick="toggle(true)">Enable</button>
<button onclick="toggle(false)">Disable</button>
<script>
async function toggle(v) {
  await fetch('/api/set', {method:'POST', headers:{'Content-Type':'application/json', 'x-auth-token':'${AUTH_TOKEN}'}, body:JSON.stringify({enabled:v})});
  location.reload();
}
</script></body></html>`);
});

app.listen(PORT, () => console.log('Auth server on port ' + PORT));
