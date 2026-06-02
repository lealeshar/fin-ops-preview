import type { RpcError } from '../../types/async.types';

interface ErrorBannerProps {
  error: RpcError;
}

function isPermissionDenied(error: RpcError): boolean {
  return (
    error.code === 'P0001' ||
    error.message.includes('PERMISSION_DENIED') ||
    error.message.toLowerCase().includes('permission denied')
  );
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  if (isPermissionDenied(error)) {
    return (
      <div className="error-banner error-banner-permission">
        <span>🔒</span>
        <span>אין לך הרשאה לבצע פעולה זו. פנה למנהל המערכת לקבלת הרשאות מתאימות.</span>
      </div>
    );
  }

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
