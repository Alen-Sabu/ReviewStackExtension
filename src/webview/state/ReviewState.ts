export interface ReviewInfo {
  filePath: string;
  functionCode: string;
  language: string;
}

export class ReviewState {
  private _currentReview: ReviewInfo | null = null;
  private _loading = false;
  private _canRetry = false;

  get currentReview() {
    return this._currentReview;
  }

  get isLoading() {
    return this._loading;
  }

  startReview(review: ReviewInfo) {
    this._currentReview = review;
    this._loading = true;
  }

  finishReview() {
    this._loading = false;
  }

  setLoading(loading: boolean) {
    this._loading = loading;
  }

  clear() {
    this._currentReview = null;
    this._loading = false;
    this._canRetry = false;
  }

  get canRetry() {
    return this._canRetry;
  }
  setCanRetry(value: boolean) {
    this._canRetry = value;
  }
}
