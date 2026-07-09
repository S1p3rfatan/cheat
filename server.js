import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'bans.json');
const PORT = process.env.PORT || 3000;

const DEF = {};

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function entry(data, name) {
  if (!data[name]) data[name] = { banned: false, timer: 0 };
  return data[name];
}

const app = express();
app.use(express.json());

app.post('/api/check', (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ success: false, error: 'Missing' });
  const data = load();
  const e = entry(data, username.toLowerCase());
  save(data);
  res.json({ success: true, blocked: e.banned || false, crash: false, timer: e.timer || 0 });
});

app.post('/api/block', (req, res) => {
  const name = (req.body.username || req.body.name || '').toLowerCase();
  if (!name) return res.json({ success: false, error: 'Missing name' });
  const data = load();
  entry(data, name).banned = true;
  save(data);
  res.json({ success: true });
});

app.post('/api/unblock', (req, res) => {
  const name = (req.body.username || req.body.name || '').toLowerCase();
  if (!name) return res.json({ success: false, error: 'Missing name' });
  const data = load();
  if (data[name]) data[name].banned = false;
  save(data);
  res.json({ success: true });
});

app.post('/api/timer', (req, res) => {
  const name = (req.body.username || req.body.name || '').toLowerCase();
  const timer = parseInt(req.body.timer) || 0;
  if (!name) return res.json({ success: false, error: 'Missing name' });
  if (timer < 0 || timer > 500) return res.json({ success: false, error: 'Timer 0-500' });
  const data = load();
  entry(data, name).timer = timer;
  save(data);
  res.json({ success: true, timer });
});

app.get('/api/list', (req, res) => {
  const data = load();
  const users = Object.entries(data).map(([name, e]) => ({
    name, banned: e.banned || false, timer: e.timer || 0
  }));
  res.json({ success: true, users });
});

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
<input id=cmd placeholder="Command" style=width:300px>
<button onclick=run()>Run</button>
<span id=e style=color:#f44></span>
<pre id=r></pre>
<script>
async function rf(){var r=await(await fetch("/api/list")).json();if(!r.success)return;
var t="Ban  Timer  Name\\n----------------------\\n";r.users.forEach(function(u){t+=(u.banned?"BANNED ":"OK     ")+(u.timer?String(u.timer).padStart(3):"  0")+"  "+u.name+"\\n"});
document.getElementById("r").textContent=t||"No entries"}
function run(){var c=document.getElementById("cmd").value.trim().split(" ");if(c.length<2){document.getElementById("e").textContent="Commands: /ban /unban /timer";return}
var a=c[0].toLowerCase(),n=c[1];
if(a=="/ban"){fetch("/api/block",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n})}).then(()=>{document.getElementById("e").textContent="Blocked "+n;rf()})}
else if(a=="/unban"){fetch("/api/unblock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n})}).then(()=>{document.getElementById("e").textContent="Unblocked "+n;rf()})}
else if(a=="/timer"&&c.length>2){var v=parseInt(c[2]);if(isNaN(v)){document.getElementById("e").textContent="Usage: /timer name number";return}
fetch("/api/timer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n,timer:v})}).then(function(r){return r.json()}).then(function(d){document.getElementById("e").textContent=d.success?"Timer set to "+d.timer:d.error;rf()})}
else if(a=="/timer"){document.getElementById("e").textContent="Usage: /timer name number"}
else{document.getElementById("e").textContent="Unknown command"}}
rf()
</script></body></html>`);
});

app.listen(PORT, () => console.log('Auth server on port ' + PORT));