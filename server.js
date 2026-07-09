import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'bans.json');
const PORT = process.env.PORT || 3000;

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const app = express();
app.use(express.json());

// Client check
app.post('/api/check', (req, res) => {
  const { username, hwid } = req.body;
  if (!username) return res.json({ success: false, error: 'Missing' });
  const data = load();
  const banned = data[username.toLowerCase()] || false;
  res.json({ success: true, blocked: banned, crash: false });
});

// Ban
app.post('/api/block', (req, res) => {
  const name = (req.body.username || req.body.hwid || '').toLowerCase();
  if (!name) return res.json({ success: false, error: 'Missing name' });
  const data = load();
  data[name] = true;
  save(data);
  res.json({ success: true });
});

// Unban
app.post('/api/unblock', (req, res) => {
  const name = (req.body.username || req.body.hwid || '').toLowerCase();
  if (!name) return res.json({ success: false, error: 'Missing name' });
  const data = load();
  delete data[name];
  save(data);
  res.json({ success: true });
});

// List
app.get('/api/list', (req, res) => {
  const data = load();
  res.json({ success: true, users: Object.keys(data) });
});

// Admin HTML
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Xenvora Auth</title>
<style>body{background:#111;color:#ccc;font-family:monospace;padding:20px}
input,button{background:#222;border:1px solid #444;color:#fff;padding:8px;margin:4px}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #222;padding:8px;text-align:left}
th{background:#1a1a2e;color:#f44}
.ban{color:#f44}
</style></head><body>
<h1>Xenvora Auth</h1>
<input id=cmd placeholder="/ban name or /unban name" style=width:300px>
<button onclick=run()>Run</button>
<span id=e style=color:#f44></span>
<pre id=r></pre>
<script>
async function rf(){var r=await(await fetch("/api/list")).json();document.getElementById("r").textContent=r.success?r.users.join("\\n")||"No entries":"Error"}
function run(){var c=document.getElementById("cmd").value.trim().split(" ");if(c.length<2){document.getElementById("e").textContent="Usage: /ban <name> or /unban <name>";return}
var a=c[0].toLowerCase(),n=c.slice(1).join(" ");
if(a=="/ban"){fetch("/api/block",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n})}).then(()=>{document.getElementById("e").textContent="Blocked "+n;rf()})}
else if(a=="/unban"){fetch("/api/unblock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n})}).then(()=>{document.getElementById("e").textContent="Unblocked "+n;rf()})}
else{document.getElementById("e").textContent="Unknown command"}}
rf()
</script></body></html>`);
});

app.listen(PORT, () => console.log('Auth server on port ' + PORT));