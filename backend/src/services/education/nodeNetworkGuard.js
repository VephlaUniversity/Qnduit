// Loaded before the document parsers in the disposable worker. No document or
// relationship is allowed to make a network request, including to loopback.
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import dgram from "node:dgram";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";

const blocked = () => { throw new Error("NETWORK_DISABLED"); };
net.Socket.prototype.connect = blocked;
net.connect = blocked;
net.createConnection = blocked;
tls.connect = blocked;
http.request = blocked;
http.get = blocked;
https.request = blocked;
https.get = blocked;
dgram.createSocket = blocked;
for (const name of ["lookup", "resolve", "resolve4", "resolve6", "reverse"]) dns[name] = blocked;
globalThis.fetch = blocked;
globalThis.WebSocket = class { constructor() { blocked(); } };
syncBuiltinESMExports();
