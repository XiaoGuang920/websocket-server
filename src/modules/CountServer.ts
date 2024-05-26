import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { randomBytes } from 'crypto';

type SessionCountMap = {
    [key: string]: {
        connectedDate: Date;
        countedDate: Date;
    };
}

type Message = {
    method: string;
}

type Token = {
    sid: string;
    connectedDate: Date;
    countedDate: Date;
} & Message

type ActionRequest = {
    action: string;
} & Message

type ActionResponse = {
    status: boolean;
} & Message

export class CountServer
{
    private port: number;
    private count: number;
    private sessionCountMap: SessionCountMap;
    
    private wss: WebSocketServer;

    constructor(port: number)
    {
        this.port = port;
        this.count = 0;
        this.sessionCountMap = {};
        
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => this.connectHandler(ws, req));
    }

    protected connectHandler(ws: WebSocket, req: IncomingMessage): void
    {
        ws.on('error', () => {});
        
        const sid: string = req.headers['sec-websocket-key'] ?? this.generateRandomString(24);
        console.log(`[Client Connected] sid: ${sid}`);
        
        const now: Date = new Date();

        this.sessionCountMap[sid] = {
            connectedDate: now,
            countedDate: now,
        };

        const token: Token = {
            method: 'getToken',
            sid: sid,
            connectedDate: now,
            countedDate: now,
        };
        ws.send(JSON.stringify(token));

        ws.on('message', (data: RawData) => this.messageHandler(data, ws, sid));

        ws.on('close', (code: number) => this.closeHandler(code, sid));
    }

    protected messageHandler(data: RawData, ws: WebSocket, sid: string): void
    {
        console.log(`[Client Message] sid: ${sid}`);
        
        const message: ActionRequest = JSON.parse(data.toString());

        let response: ActionResponse = {
            method: message['action'],
            status: false,
        };

        if (message['action'] == 'plus') {
            const now: Date = new Date();

            if (now.getTime() == this.sessionCountMap[sid]['countedDate'].getTime()
                || now.getTime() - this.sessionCountMap[sid]['countedDate'].getTime() > 1000
            ) {
                this.count += 1;
                console.log(`[Action Plus] count = ${this.count}`);
                this.sessionCountMap[sid]['countedDate'] = now;

                response['status'] = true;
            }
        }

        ws.send(JSON.stringify(response));
    }

    protected closeHandler(code: number, sid: string): void
    {
        console.log(`[Client Disconnected] sid: ${sid}, code: ${code}`);

        delete this.sessionCountMap[sid];
    }

    protected generateRandomString(length: number): string
    {
        return randomBytes(length)
            .toString('base64')
            .slice(0, length);
    }
}
