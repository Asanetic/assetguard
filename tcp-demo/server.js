#!/usr/bin/env node
// tcp-demo/server.js — a tiny TCP server for a back-and-forth text demo.
// - receives text from connected clients (prints it)
// - auto-replies "ACK" to every message
// - you can type your own lines any time to send MORE texts to the client(s)
//
//   node tcp-demo/server.js [port]        (default 9000)
import net from "net";
import readline from "readline";

const PORT = Number(process.argv[2]) || 9000;
const clients = new Set();

const server = net.createServer((sock) => {
  clients.add(sock);
  const who = `${sock.remoteAddress}:${sock.remotePort}`;
  console.log(`\n● client connected: ${who}`);
  sock.setEncoding("utf8");

  sock.on("data", (text) => {
    process.stdout.write(`\nclient> ${text.trimEnd()}\n`);
    // auto-ACK — and note we can still send more after this
    sock.write("ACK\n");
    console.log("you(auto)> ACK");
    prompt();
  });
  sock.on("close", () => { clients.delete(sock); console.log(`\n● client left: ${who}`); prompt(); });
  sock.on("error", () => clients.delete(sock));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`TCP server listening on 0.0.0.0:${PORT}`);
  console.log("type a line + Enter to send it to the connected client(s). Ctrl+C to quit.");
  prompt();
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function prompt() { process.stdout.write("server> "); }

rl.on("line", (line) => {
  if (!clients.size) { console.log("(no clients connected)"); return prompt(); }
  for (const c of clients) { try { c.write(line + "\n"); } catch {} }
  prompt();
});
rl.on("SIGINT", () => { for (const c of clients) { try { c.end(); } catch {} } process.exit(0); });
