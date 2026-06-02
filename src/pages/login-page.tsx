import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase/client';

const schema = z.object({
  email:    z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const [mode, setMode]         = useState<'signin' | 'signup'>('signin');
  const [message, setMessage]   = useState<string | null>(null);
  const [isError, setIsError]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setMessage(null);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) { setIsError(true); setMessage(error.message); }
    } else {
      const { error } = await supabase.auth.signUp(values);
      if (error) {
        setIsError(true);
        setMessage(error.message);
      } else {
        setIsError(false);
        setMessage('נשלח אימייל לאימות — בדקי את תיבת הדואר ולחצי על הקישור.');
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Enterprise Fin-Ops</h1>

        <div className="login-tabs">
          <button
            className={`login-tab${mode === 'signin' ? ' active' : ''}`}
            onClick={() => { setMode('signin'); setMessage(null); }}
          >
            כניסה
          </button>
          <button
            className={`login-tab${mode === 'signup' ? ' active' : ''}`}
            onClick={() => { setMode('signup'); setMessage(null); }}
          >
            הרשמה
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form" noValidate>
          <div className="login-field">
            <label className="login-label">אימייל</label>
            <input
              type="email"
              className="login-input"
              placeholder="you@example.com"
              {...register('email')}
              dir="ltr"
            />
            {errors.email && <span className="login-error">{errors.email.message}</span>}
          </div>

          <div className="login-field">
            <label className="login-label">סיסמה</label>
            <input
              type="password"
              className="login-input"
              placeholder="••••••••"
              {...register('password')}
              dir="ltr"
            />
            {errors.password && <span className="login-error">{errors.password.message}</span>}
          </div>

          {message && (
            <div className={isError ? 'login-msg-error' : 'login-msg-success'}>
              {message}
            </div>
          )}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? 'טוען…' : mode === 'signin' ? 'כניסה' : 'הרשמה'}
          </button>
        </form>
      </div>
    </div>
  );
}
