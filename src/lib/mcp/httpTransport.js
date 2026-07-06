/**
 * A minimal MCP `Transport` that bridges Next.js App Router (Web `Request` /
 * `Response`) to the SDK's JSON-RPC `Protocol`.
 *
 * The SDK's own `StreamableHTTPServerTransport` is written against Node's
 * `http.IncomingMessage`/`ServerResponse`, which the App Router doesn't expose.
 * Instead we implement the small `Transport` interface directly: the Protocol
 * calls `send()` with each outgoing JSON-RPC message, and we call `onmessage()`
 * with each incoming one. `dispatch()` feeds one client message and resolves
 * with its response (or null for notifications), matching responses to requests
 * by JSON-RPC id — which supports both stateless single-shot requests and
 * long-lived sessions handling many requests.
 */
export class HttpBridgeTransport {
    constructor() {
        this._pending = new Map(); // JSON-RPC id -> { resolve, reject }
        this._closed = false;
        this.sessionId = undefined;
        this.protocolVersion = undefined;
        // Assigned by Protocol.connect():
        this.onmessage = undefined;
        this.onclose = undefined;
        this.onerror = undefined;
    }

    async start() { /* nothing to open — messages are pushed in via dispatch() */ }

    // Protocol -> client. We only surface JSON-RPC responses (id + result/error)
    // back to the awaiting HTTP caller; server-initiated notifications/requests
    // are dropped since this transport exposes no server->client stream.
    async send(message) {
        if (message && message.id !== undefined && ('result' in message || 'error' in message)) {
            const pending = this._pending.get(message.id);
            if (pending) {
                this._pending.delete(message.id);
                pending.resolve(message);
            }
        }
    }

    async close() {
        if (this._closed) return;
        this._closed = true;
        for (const pending of this._pending.values()) {
            pending.reject(new Error('Transport closed'));
        }
        this._pending.clear();
        this.onclose?.();
    }

    // Called by Protocol during initialize negotiation.
    setProtocolVersion(version) { this.protocolVersion = version; }

    /**
     * Feed one incoming client JSON-RPC message. Resolves with the matching
     * response for requests, or null for notifications / client responses.
     */
    dispatch(message) {
        const isRequest =
            message && typeof message === 'object' &&
            message.method !== undefined && message.id !== undefined && message.id !== null;

        if (!isRequest) {
            Promise.resolve(this.onmessage?.(message)).catch((err) => this.onerror?.(err));
            return Promise.resolve(null);
        }

        return new Promise((resolve, reject) => {
            this._pending.set(message.id, { resolve, reject });
            Promise.resolve(this.onmessage?.(message)).catch((err) => {
                this._pending.delete(message.id);
                reject(err);
            });
        });
    }
}
