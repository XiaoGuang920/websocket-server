"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountServer = void 0;
const ws_1 = require("ws");
const crypto_1 = require("crypto");
class CountServer {
    constructor(port) {
        this.port = port;
        this.count = 0;
        this.sessionCountMap = {};
        this.wss = new ws_1.WebSocketServer({ port: this.port });
        this.wss.on('connection', (ws, req) => this.connectHandler(ws, req));
    }
    connectHandler(ws, req) {
        var _a;
        ws.on('error', () => { });
        const sid = (_a = req.headers['sec-websocket-key']) !== null && _a !== void 0 ? _a : this.generateRandomString(24);
        console.log(`[Client Connected] sid: ${sid}`);
        const now = new Date();
        this.sessionCountMap[sid] = {
            connectedDate: now,
            countedDate: now,
        };
        const token = {
            method: 'getToken',
            sid: sid,
            connectedDate: now,
            countedDate: now,
        };
        ws.send(JSON.stringify(token));
        ws.on('message', (data) => this.messageHandler(data, ws, sid));
        ws.on('close', (code) => this.closeHandler(code, sid));
    }
    messageHandler(data, ws, sid) {
        console.log(`[Client Message] sid: ${sid}`);
        const message = JSON.parse(data.toString());
        let response = {
            method: message['action'],
            status: false,
        };
        if (message['action'] == 'plus') {
            const now = new Date();
            if (now.getTime() == this.sessionCountMap[sid]['countedDate'].getTime()
                || now.getTime() - this.sessionCountMap[sid]['countedDate'].getTime() > 1000) {
                this.count += 1;
                console.log(`[Action Plus] count = ${this.count}`);
                this.sessionCountMap[sid]['countedDate'] = now;
                response['status'] = true;
            }
        }
        ws.send(JSON.stringify(response));
    }
    closeHandler(code, sid) {
        console.log(`[Client Disconnected] sid: ${sid}, code: ${code}`);
        delete this.sessionCountMap[sid];
    }
    generateRandomString(length) {
        return (0, crypto_1.randomBytes)(length)
            .toString('base64')
            .slice(0, length);
    }
}
exports.CountServer = CountServer;
