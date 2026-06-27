import { LastRequest } from "../types/lastRequest";

export class ReviewSession {
    private _lastRequest: LastRequest | null = null;

    setLastRequest(request: LastRequest): void {
        this._lastRequest = request;
    }

    getLastRequest(): LastRequest | null {
        return this._lastRequest;
    }

    clearLastRequest(): void {
        this._lastRequest = null;
    }
}