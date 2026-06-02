export interface RpcError {
  readonly code:     string;
  readonly message:  string;
  readonly details?: unknown;
}

export type AsyncState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error';   readonly error: RpcError };
