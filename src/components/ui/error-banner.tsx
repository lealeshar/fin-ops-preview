import type { RpcError } from '../../types/async.types';

interface ErrorBannerProps {
  error: RpcError;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  return (
    <div className="error-banner">
      <span>⚠</span>
      <div>
        <span>{error.message}</span>
        {error.code && <> (<code>{error.code}</code>)</>}
      </div>
    </div>
  );
}
