import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { authApi } from '../../api';
import { useAppStore } from '../../store/useAppStore';

function InputField({ label, type = 'text', placeholder, value, onChange, error }: {
  label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <div className="mb-4">
      <div className="font-mono text-xs text-white/40 mb-1.5 tracking-wide">{label}</div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-lg font-mono text-sm transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${error ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.1)'}`,
          color: 'rgba(232,237,242,0.9)',
          outline: 'none',
        }}
        onFocus={(e) => { e.target.style.borderColor = error ? 'rgba(220,38,38,0.8)' : 'rgba(255,255,255,0.25)'; }}
        onBlur={(e) => { e.target.style.borderColor = error ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.1)'; }}
      />
      {error && <div className="font-mono text-xs text-red-400 mt-1">{error}</div>}
    </div>
  );
}

export default function CitizenSignup() {
  const navigate = useNavigate();
  const { setRole, setAuthenticated } = useAppStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState('');

  async function handleSubmit() {
    setPasswordError('');
    setServerError('');

    if (!fullName.trim()) {
      setServerError('Full name is required.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setServerError('A valid email address is required.');
      return;
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.signup({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        phone: phone.trim() || undefined,
      });

      if (res.success && res.user) {
        if (res.user.token) {
          localStorage.setItem('nexus_token', res.user.token);
        }
        setRole('citizen');
        setAuthenticated(true);
        setSubmitted(true);
      } else {
        setServerError(res.error || 'Registration failed.');
      }
    } catch (err: any) {
      setServerError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center overflow-y-auto bg-[#080b0f]">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.06]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="shg" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon points="15,2 45,2 58,26 45,50 15,50 2,26" fill="none" stroke="white" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#shg)" />
        </svg>
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(6,182,212,0.07) 0%, transparent 55%)'
      }} />

      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-8 py-4 shrink-0 relative z-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-mono text-xs text-white/35 hover:text-cyan-400 transition-colors"
        >
          ← BACK TO HOME
        </button>
        <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full live-dot bg-cyan-400" />
          CITIZEN REGISTRATION
        </div>
        <div className="font-mono text-xs text-white/25">
          {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC
        </div>
      </div>

      {/* Form */}
      <div className="relative z-10 w-full max-w-sm px-8 pb-12 flex-1 flex flex-col justify-center">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(6,182,212,0.12)', border: '2px solid rgba(6,182,212,0.4)', boxShadow: '0 0 32px rgba(6,182,212,0.2)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
              </svg>
            </div>
            <div className="font-condensed font-black text-2xl text-white mb-2">ACCOUNT CREATED</div>
            <div className="font-mono text-xs text-white/40 mb-6 leading-relaxed">
              Your citizen account has been registered. You can now log in to access emergency services, alerts, and shelter information.
            </div>
            <div className="flex flex-col gap-3">
              <motion.button
                onClick={() => navigate('/citizen')}
                className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-wide"
                style={{ background: '#06b6d4', color: '#080b0f', boxShadow: '0 0 24px rgba(6,182,212,0.3)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ENTER CITIZEN DASHBOARD →
              </motion.button>
              <button
                onClick={() => navigate('/')}
                className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Return to Home
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6">
              <div className="font-condensed font-black text-3xl tracking-wide mb-1" style={{ color: '#06b6d4' }}>
                CREATE ACCOUNT
              </div>
              <div className="font-mono text-xs text-white/35">
                Register to access emergency services in your area.
              </div>
            </div>

            {serverError && (
              <div className="p-3 rounded-lg mb-4 font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20">
                {serverError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-3">
              <InputField label="FULL NAME" placeholder="Your name" value={fullName} onChange={setFullName} />
              <InputField label="EMAIL ADDRESS" type="email" placeholder="your@email.com" value={email} onChange={setEmail} />
            </div>
            <InputField label="PASSWORD" type="password" placeholder="Min. 8 characters" value={password} onChange={setPassword} error={passwordError && password.length < 8 ? passwordError : undefined} />
            <InputField label="CONFIRM PASSWORD" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={setConfirmPassword} error={passwordError && password.length >= 8 ? passwordError : undefined} />
            <InputField label="PHONE (OPTIONAL)" type="tel" placeholder="+1 555 000 0000" value={phone} onChange={setPhone} />

            <motion.button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-wide mb-4"
              style={{
                background: loading ? 'rgba(6,182,212,0.5)' : '#06b6d4',
                color: '#080b0f',
                boxShadow: '0 0 30px rgba(6,182,212,0.35)',
              }}
              whileHover={loading ? {} : { scale: 1.02 }}
              whileTap={loading ? {} : { scale: 0.98 }}
            >
              {loading ? 'CREATING ACCOUNT...' : 'CREATE CITIZEN ACCOUNT'}
            </motion.button>

            <div className="text-center">
              <span className="font-mono text-xs text-white/30">Already have an account? </span>
              <button
                onClick={() => navigate('/login?mode=citizen')}
                className="font-mono text-xs transition-colors"
                style={{ color: '#06b6d4' }}
              >
                LOG IN
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
