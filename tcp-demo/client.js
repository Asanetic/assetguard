#!/usr/bin/env node
// tcp-demo/client.js — a tiny TCP client for the back-and-forth text demo.
// - connects to the server and stays connected
// - prints everything the server sends (ACKs AND any later messages)
// - you can type lines any time to send text to the server
//
//   node tcp-demo/client.js [host] [port]     (default 127.0.0.1 9000)
import net from "net";
import readline from "readline";

const HOST = process.argv[2] || "127.0.0.1";
const PORT = Number(process.argv[3]) || 9000;

const sock = net.connect(PORT, HOST, () => {
  console.log(`● connected to ${HOST}:${PORT}`);
  console.log("type a line + Enter to send to the server. Ctrl+C to quit.");
  prompt();
});
sock.setEncoding("utf8");

sock.on("data", (text) => {
  process.stdout.write(`\nserver> ${text.trimEnd()}\n`);
  prompt();
});
sock.on("close", () => { console.log("\n● disconnected"); process.exit(0); });
sock.on("error", (e) => console.log("● error:", e.message));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function prompt() { process.stdout.write("client> "); }

rl.on("line", (line) => { try { sock.write(line + "\n"); } catch {} prompt(); });
rl.on("SIGINT", () => { try { sock.end(); } catch {} process.exit(0); });
