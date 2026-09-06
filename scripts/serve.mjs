import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.cwd());
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.webp':'image/webp', '.bin':'application/octet-stream' };
http.createServer((req,res) => {
  const requestPath = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const relative = requestPath.replace(/^\/Vividdesigns-demo(?=\/|$)/,'') || '/';
  const target = path.resolve(root, '.' + (relative.endsWith('/') ? relative + 'index.html' : relative));
  if (!target.startsWith(root + path.sep) || relative.split('/').some(p=>p.startsWith('.'))) { res.writeHead(403);res.end();return; }
  fs.stat(target,(error,stat) => {
    if(error || !stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(target)] || 'application/octet-stream','Content-Length':stat.size,'Cache-Control':path.extname(target)==='.bin'?'public,max-age=3600':'no-cache'});
    fs.createReadStream(target).pipe(res);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/Vividdesigns-demo/`));
