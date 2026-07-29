import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/auth';
import { useAlifbo } from '@/alifbo';
import fvvIcon from '@/styles/fvv-icon.png';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { tr } = useAlifbo();
  const navigate = useNavigate();
  const [gr, setGr] = useState('');
  const [parol, setParol] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!gr.trim() || !parol.trim()) {
      setError(tr('Guvohnoma raqami va parolni kiriting'));
      return;
    }
    setLoading(true);
    const err = await login(gr.toUpperCase(), parol);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] px-4">
      <div className="card w-full max-w-[420px] p-8">
        {/* Navy logo blok */}
        <div className="mb-7 flex flex-col items-center text-center">
          <img
            src={fvvIcon}
            alt="FVV"
            className="mb-4 h-24 w-24 object-contain"
            draggable={false}
          />
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {tr('XAVFSIZ XONADON')}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {tr('FVV monitoring tizimiga kirish')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              {tr('Guvohnoma raqami')}
            </label>
            <input
              className="input uppercase"
              type="text"
              value={gr}
              onChange={(e) => setGr(e.target.value.toUpperCase())}
              placeholder="XODIM001"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              {tr('Parol')}
            </label>
            <input
              className="input"
              type="password"
              value={parol}
              onChange={(e) => setParol(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-[rgba(192,57,43,0.25)] bg-[rgba(192,57,43,0.08)] px-3 py-2.5 text-sm text-[#96291f]">
              <AlertCircle size={16} strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
              <span>{tr(error)}</span>
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? tr('Kirmoqda...') : tr('Kirish')}
          </button>
        </form>
      </div>
    </div>
  );
}
