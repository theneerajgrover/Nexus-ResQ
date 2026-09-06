import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Role } from '../../store/useAppStore';
import { authApi } from '../../api';

type AuthMode = 'select' | 'citizen-login' | 'citizen-register' | 'responder-login' | 'responder-register' | 'authority-login' | 'resource-login';
type CoreRole = NonNullable<Role>;

function HexGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.06]">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="hg" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon points="15,2 45,2 58,26 45,50 15,50 2,26" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hg)" />
      </svg>
    </div>
  );
}

function AmbientOrbs({ color }: { color: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {[280, 200, 130, 70].map((size, i) => (
        <motion.div
          key={size}
          className="absolute rounded-full border"
          style={{ width: size, height: size, left: -size / 2, top: -size / 2, borderColor: `${color}${['14', '10', '18', '22'][i]}` }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 55 + i * 18, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 44, height: 44, left: -22, top: -22, background: `radial-gradient(circle, ${color}50 0%, transparent 70%)` }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function NexusLogo({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div style={{ filter: `drop-shadow(0 0 12px ${color}99)` }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <polygon points="18,3 33,10.5 33,25.5 18,33 3,25.5 3,10.5" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5" />
          <polygon points="18,8 27,13 27,23 18,28 9,23 9,13" stroke={color} strokeWidth="1" fill="none" opacity="0.75" />
          <circle cx="18" cy="18" r="4" fill={color} />
        </svg>
      </div>
      <div>
        <div className="font-condensed font-black text-2xl tracking-widest text-white leading-none">NEXUS</div>
        <div className="font-condensed text-sm tracking-widest leading-none" style={{ color }}>RESQ</div>
      </div>
    </div>
  );
}

// ── Role selection hub ────────────────────────────────────────────────────────
function RoleSelectScreen({ onSelect }: { onSelect: (mode: AuthMode) => void }) {
  return (
    <motion.div
      key="select"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="w-full max-w-xl"
    >
      <div className="text-center mb-10">
        <div className="font-mono text-xs tracking-widest text-white/35 mb-6">SELECT YOUR ACCESS TYPE</div>
        <h1 className="font-condensed font-black text-5xl tracking-widest text-white mb-2">
          WHO ARE YOU?
        </h1>
        <p className="font-mono text-xs text-white/30">Your role determines your interface and permissions.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Citizen */}
        <motion.button
          onClick={() => onSelect('citizen-login')}
          className="p-6 rounded-xl text-left group transition-all duration-300"
          style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.25)' }}
          whileHover={{ scale: 1.02, borderColor: 'rgba(6,182,212,0.5)' }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="font-condensed font-black text-2xl tracking-wider mb-1" style={{ color: '#06b6d4' }}>
            CITIZEN
          </div>
          <div className="font-mono text-xs text-white/40 mb-4 leading-relaxed">
            Report emergencies · Find shelter · Stay safe
          </div>
          <div className="flex gap-2">
            <div className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>LOG IN</div>
            <div className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'rgba(6,182,212,0.08)', color: 'rgba(6,182,212,0.7)' }}>SIGN UP</div>
          </div>
        </motion.button>

        {/* Responder */}
        <motion.button
          onClick={() => onSelect('responder-login')}
          className="p-6 rounded-xl text-left group transition-all duration-300"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}
          whileHover={{ scale: 1.02, borderColor: 'rgba(245,158,11,0.5)' }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="font-condensed font-black text-2xl tracking-wider mb-1" style={{ color: '#f59e0b' }}>
            RESPONDER
          </div>
          <div className="font-mono text-xs text-white/40 mb-4 leading-relaxed">
            Execute missions · Update status · Request resources
          </div>
          <div className="flex gap-2">
            <div className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>LOG IN</div>
            <div className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.08)', color: 'rgba(245,158,11,0.7)' }}>APPLY</div>
          </div>
        </motion.button>
      </div>

      {/* Operational access — no self-registration */}
      <div
        className="p-5 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="font-mono text-xs text-white/30 mb-4 tracking-widest">OPERATIONAL ACCESS — AUTHORIZED PERSONNEL ONLY</div>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={() => onSelect('authority-login')}
            className="p-4 rounded-lg text-left transition-all duration-200"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="font-condensed font-bold text-sm tracking-wider mb-1" style={{ color: '#dc2626' }}>AUTHORITY / COMMAND</div>
            <div className="font-mono text-xs text-white/30">Assigned by organization</div>
          </motion.button>
          <motion.button
            onClick={() => onSelect('resource-login')}
            className="p-4 rounded-lg text-left transition-all duration-200"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="font-condensed font-bold text-sm tracking-wider mb-1" style={{ color: '#10b981' }}>RESOURCE MANAGER</div>
            <div className="font-mono text-xs text-white/30">Assigned by organization</div>
          </motion.button>
        </div>
        <div className="font-mono text-xs text-white/20 mt-3 text-center">
          These roles are assigned by backend administrators. Self-registration is not available.
        </div>
      </div>
    </motion.div>
  );
}

// ── Generic form container ────────────────────────────────────────────────────
function FormCard({
  title, subtitle, color, children, onBack, wide,
}: {
  title: string; subtitle: string; color: string;
  children: React.ReactNode; onBack: () => void; wide?: boolean;
}) {
  return (
    <motion.div
      key={title}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'}`}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 font-mono text-xs text-white/35 hover:text-white/60 transition-colors mb-6"
      >
        ← BACK
      </button>
      <div className="mb-6">
        <div className="font-condensed font-black text-3xl tracking-wider mb-1" style={{ color }}>{title}</div>
        <div className="font-mono text-xs text-white/35">{subtitle}</div>
      </div>
      {children}
    </motion.div>
  );
}

function InputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="mb-4">
      <div className="font-mono text-xs text-white/40 mb-1.5 tracking-widest">{label}</div>
      <input
        type={type}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
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

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  error,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-4">
      <div className="font-mono text-xs text-white/40 mb-1.5 tracking-widest">{label}</div>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 pr-11 rounded-lg font-mono text-sm transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${error ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.1)'}`,
            color: 'rgba(232,237,242,0.9)',
            outline: 'none',
          }}
          onFocus={(e) => { e.target.style.borderColor = error ? 'rgba(220,38,38,0.8)' : 'rgba(255,255,255,0.25)'; }}
          onBlur={(e) => { e.target.style.borderColor = error ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.1)'; }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors cursor-pointer"
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
        >
          {visible ? (
            /* Eye-off icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            /* Eye icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && <div className="font-mono text-xs text-red-400 mt-1">{error}</div>}
    </div>
  );
}

function PasswordRequirements({ password }: { password: string }) {
  const rules = [
    { label: 'Minimum 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains digit', met: /[0-9]/.test(password) },
    { label: 'Contains special character', met: /[!@#$%^&*()_+\-=\[\]{};:'",.<>?\/\\|`~]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="mb-4 -mt-2 px-1">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {rules.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5 font-mono text-xs" style={{ color: r.met ? '#06b6d4' : 'rgba(255,255,255,0.25)' }}>
            <span style={{ fontSize: '10px' }}>{r.met ? '✓' : '✗'}</span>
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Citizen Login ─────────────────────────────────────────────────────────────
function CitizenLogin({
  onBack,
  onRegister,
  onLogin,
}: {
  onBack: () => void;
  onRegister: () => void;
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [email, setEmail] = useState('citizen@nexusresq.org');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    const res = await onLogin(email.trim(), password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Invalid credentials.');
    }
  }

  return (
    <FormCard title="CITIZEN LOGIN" subtitle="Access emergency services and safety information." color="#06b6d4" onBack={onBack}>
      {error && (
        <div className="p-3 rounded-lg mb-4 font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20">
          {error}
        </div>
      )}
      <InputField label="EMAIL ADDRESS" type="email" placeholder="your@email.com" value={email} onChange={setEmail} />
      <InputField label="PASSWORD" type="password" placeholder="••••••••" value={password} onChange={setPassword} />
      <motion.button
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-widest mb-4"
        style={{ background: loading ? 'rgba(6,182,212,0.5)' : '#06b6d4', color: '#080b0f', boxShadow: '0 0 30px rgba(6,182,212,0.35)' }}
        whileHover={loading ? {} : { scale: 1.02 }}
        whileTap={loading ? {} : { scale: 0.98 }}
      >
        {loading ? 'AUTHENTICATING...' : 'LOG IN'}
      </motion.button>
      <div className="text-center">
        <span className="font-mono text-xs text-white/30">Don't have an account? </span>
        <button onClick={onRegister} className="font-mono text-xs transition-colors cursor-pointer" style={{ color: '#06b6d4' }}>
          SIGN UP
        </button>
      </div>
    </FormCard>
  );
}

// ── Citizen Register ──────────────────────────────────────────────────────────
function CitizenRegister({
  onBack,
  onLogin,
  onRegister,
}: {
  onBack: () => void;
  onLogin: () => void;
  onRegister: (data: { name: string; email: string; password: string; confirmPassword: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordValid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=\[\]{};:'",.<>?\/\\|`~]/.test(password);

  async function handleSubmit() {
    setPasswordError('');
    setError('');

    if (!fullName.trim()) { setError('Full name is required.'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('A valid email address is required.'); return; }
    if (!password) { setPasswordError('Password is required.'); return; }
    if (!passwordValid) { setPasswordError('Password does not meet all requirements.'); return; }
    if (!confirmPassword) { setPasswordError('Confirm Password is required.'); return; }
    if (password !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }

    setLoading(true);
    const res = await onRegister({
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
      phone: phone.trim() || undefined,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Registration failed.');
    }
  }

  return (
    <FormCard title="CREATE ACCOUNT" subtitle="Register to access emergency services in your area." color="#06b6d4" onBack={onBack} wide>
      {error && (
        <div className="p-3 rounded-lg mb-4 font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-x-3">
        <div className="md:col-span-2">
          <InputField label="FULL NAME" placeholder="Your name" value={fullName} onChange={setFullName} />
        </div>
        <div className="md:col-span-3">
          <InputField label="EMAIL ADDRESS" type="email" placeholder="your@email.com" value={email} onChange={setEmail} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3">
        <PasswordField label="PASSWORD" placeholder="Min. 8 characters" value={password} onChange={setPassword} />
        <PasswordField label="CONFIRM PASSWORD" placeholder="Re-enter password" value={confirmPassword} onChange={setConfirmPassword} error={passwordError} />
      </div>
      <PasswordRequirements password={password} />
      <InputField label="PHONE (OPTIONAL)" type="tel" placeholder="+1 555 000 0000" value={phone} onChange={setPhone} />
      <motion.button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-widest mb-4"
        style={{ background: loading ? 'rgba(6,182,212,0.5)' : '#06b6d4', color: '#080b0f', boxShadow: '0 0 30px rgba(6,182,212,0.35)' }}
        whileHover={loading ? {} : { scale: 1.02 }}
        whileTap={loading ? {} : { scale: 0.98 }}
      >
        {loading ? 'CREATING ACCOUNT...' : 'CREATE CITIZEN ACCOUNT'}
      </motion.button>
      <div className="text-center">
        <span className="font-mono text-xs text-white/30">Already have an account? </span>
        <button onClick={onLogin} className="font-mono text-xs transition-colors cursor-pointer" style={{ color: '#06b6d4' }}>
          LOG IN
        </button>
      </div>
    </FormCard>
  );
}

// ── Responder Login ───────────────────────────────────────────────────────────
function ResponderLogin({
  onBack,
  onRegister,
  onLogin,
}: {
  onBack: () => void;
  onRegister: () => void;
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [email, setEmail] = useState('responder@nexusresq.org');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    const res = await onLogin(email.trim(), password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Invalid responder credentials.');
    }
  }

  return (
    <FormCard title="RESPONDER LOGIN" subtitle="Field operations access. Verified credentials required." color="#f59e0b" onBack={onBack}>
      {error && (
        <div className="p-3 rounded-lg mb-4 font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20">
          {error}
        </div>
      )}
      <InputField label="RESPONDER EMAIL" placeholder="responder@nexusresq.org" value={email} onChange={setEmail} />
      <InputField label="PASSWORD" type="password" placeholder="••••••••" value={password} onChange={setPassword} />
      <motion.button
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-widest mb-4"
        style={{ background: loading ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#080b0f', boxShadow: '0 0 30px rgba(245,158,11,0.35)' }}
        whileHover={loading ? {} : { scale: 1.02 }}
        whileTap={loading ? {} : { scale: 0.98 }}
      >
        {loading ? 'AUTHENTICATING...' : 'LOG IN'}
      </motion.button>
      <button onClick={onRegister} className="w-full py-3 rounded-xl font-condensed font-bold text-sm tracking-widest transition-all duration-200 cursor-pointer"
        style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
        APPLY FOR RESPONDER ACCESS
      </button>
    </FormCard>
  );
}

// ── Responder Register (onboarding) ───────────────────────────────────────────
function ResponderRegister({ onBack, onLogin }: { onBack: () => void; onLogin: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [certId, setCertId] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!fullName.trim() || !email.trim() || !certId.trim()) {
      setError('Full name, email, and certification ID are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.applyResponder({
        fullName: fullName.trim(),
        email: email.trim(),
        organization: organization.trim() || 'Independent Agency',
        certId: certId.trim(),
        phone: phone.trim(),
      });
      if (res.success) {
        setSubmitted(true);
      } else {
        setError(res.error || 'Failed to submit application.');
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting application.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <FormCard title="APPLICATION SUBMITTED" subtitle="" color="#f59e0b" onBack={onBack}>
        <div className="p-5 rounded-xl mb-4 text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <div className="font-condensed font-black text-lg text-white mb-2">APPLICATION RECEIVED</div>
          <div className="font-mono text-xs text-white/50 leading-relaxed">
            Your responder application is under review by authorized personnel. You will be contacted with next steps.
          </div>
        </div>
        <button onClick={onLogin} className="w-full py-3 rounded-xl font-condensed font-bold text-sm tracking-widest cursor-pointer"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
          BACK TO LOGIN
        </button>
      </FormCard>
    );
  }
  return (
    <FormCard title="RESPONDER APPLICATION" subtitle="Responder roles require verification by an authorized administrator." color="#f59e0b" onBack={onBack} wide>
      {error && (
        <div className="p-3 rounded-lg mb-4 font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-3">
        <InputField label="FULL NAME" placeholder="Your name" value={fullName} onChange={setFullName} />
        <InputField label="EMAIL ADDRESS" type="email" placeholder="your@email.com" value={email} onChange={setEmail} />
        <InputField label="ORGANIZATION / UNIT" placeholder="Agency or organization" value={organization} onChange={setOrganization} />
        <InputField label="CERTIFICATION ID" placeholder="Cert number" value={certId} onChange={setCertId} />
      </div>
      <InputField label="PHONE" type="tel" placeholder="+1 555 000 0000" value={phone} onChange={setPhone} />
      <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <div className="font-mono text-xs text-amber-400/80 leading-relaxed">
          Applications are reviewed by authorized administrators. Account activation requires verification. Self-assignment of responder privileges is not permitted.
        </div>
      </div>
      <motion.button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-widest"
        style={{ background: loading ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#080b0f' }}
        whileHover={loading ? {} : { scale: 1.02 }}
        whileTap={loading ? {} : { scale: 0.98 }}
      >
        {loading ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
      </motion.button>
    </FormCard>
  );
}

// ── Operational login (Authority / Resource Manager) ──────────────────────────
function OperationalLogin({
  role,
  onBack,
  onLogin,
}: {
  role: CoreRole;
  onBack: () => void;
  onLogin: (role: CoreRole, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const isAuthority = role === 'authority_command';
  const roleLabel = isAuthority ? 'AUTHORITY / COMMAND' : 'RESOURCE MANAGER';
  const roleColor = isAuthority ? '#dc2626' : '#10b981';
  const defaultEmail = isAuthority ? 'authority@nexusresq.org' : 'resources@nexusresq.org';

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    setError('');
    setLoading(true);
    const res = await onLogin(role, email.trim(), password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Authentication failed.');
    }
  }

  return (
    <FormCard title={roleLabel} subtitle="Access is granted exclusively through institutional authorization." color={roleColor} onBack={onBack}>
      {error && (
        <div className="p-3 rounded-lg mb-4 font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20">
          {error}
        </div>
      )}
      <div className="mb-5 p-3 rounded-lg" style={{ background: `${roleColor}0a`, border: `1px solid ${roleColor}25` }}>
        <div className="font-mono text-xs leading-relaxed" style={{ color: `${roleColor}cc` }}>
          Authenticating as {roleLabel}. This role is assigned by backend administrators. All sessions are logged.
        </div>
      </div>
      <InputField label="ASSIGNED CREDENTIALS / EMAIL" placeholder="Institutional email" value={email} onChange={setEmail} />
      <InputField label="PASSWORD" type="password" placeholder="••••••••" value={password} onChange={setPassword} />
      <div className="mb-5 p-3 rounded-lg" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
        <div className="font-mono text-xs text-red-400/80 leading-relaxed">
          These operational roles cannot be self-registered. Access is granted exclusively through institutional authorization. All sessions are logged.
        </div>
      </div>
      <motion.button
        onClick={handleAuth}
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-widest"
        style={{
          background: loading ? `${roleColor}88` : roleColor,
          color: '#fff',
        }}
        whileHover={loading ? {} : { scale: 1.02 }}
        whileTap={loading ? {} : { scale: 0.98 }}
      >
        {loading ? 'VERIFYING CREDENTIALS...' : 'AUTHENTICATE'}
      </motion.button>
    </FormCard>
  );
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────
export default function AuthPage() {
  const { setRole, setAuthenticated, setUser } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  function modeFromParam(param: string | null): AuthMode {
    switch (param) {
      case 'citizen': return 'citizen-login';
      case 'responder': return 'responder-login';
      case 'authority': return 'authority-login';
      case 'resource': return 'resource-login';
      case 'signup': return 'citizen-register';
      default: return 'select';
    }
  }

  const startedFromUrl = searchParams.get('mode') !== null;
  const [mode, setMode] = useState<AuthMode>(() => modeFromParam(searchParams.get('mode')));

  useEffect(() => {
    setAuthenticated(false);
  }, [setAuthenticated]);

  useEffect(() => {
    const param = searchParams.get('mode');
    setMode(modeFromParam(param));
  }, [searchParams]);

  function goBack() {
    if (startedFromUrl) navigate('/');
    else setMode('select');
  }

  const activeColor =
    mode.startsWith('citizen') ? '#06b6d4' :
    mode.startsWith('responder') ? '#f59e0b' :
    mode === 'authority-login' ? '#dc2626' :
    mode === 'resource-login' ? '#10b981' :
    '#06b6d4';

  async function loginAs(role: CoreRole, email?: string, password?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await authApi.login(role, email, password);
      if (res.success && res.user) {
        if (res.user.token) {
          localStorage.setItem('nexus_token', res.user.token);
        }
        setUser({ id: res.user.id, name: res.user.name, email: res.user.email });
        setRole(role);
        setAuthenticated(true);
        const routes: Record<CoreRole, string> = {
          citizen: '/citizen',
          responder: '/responder',
          authority_command: '/command',
          resource_manager: '/resources',
        };
        navigate(routes[role]);
        return { success: true };
      } else {
        return { success: false, error: res.error || 'Authentication failed.' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication error.' };
    }
  }

  async function registerCitizen(data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await authApi.signup(data);
      if (res.success && res.user) {
        if (res.user.token) {
          localStorage.setItem('nexus_token', res.user.token);
        }
        setUser({ id: res.user.id, name: res.user.name, email: res.user.email });
        setRole('citizen');
        setAuthenticated(true);
        navigate('/citizen');
        return { success: true };
      } else {
        return { success: false, error: res.error || 'Registration failed.' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration error.' };
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <HexGrid />
      <AmbientOrbs color={activeColor} />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 flex items-center justify-between px-8 py-3 z-20">
        <div className="flex items-center gap-5">
          <NexusLogo color={activeColor} />
          <div className="w-px h-4 bg-white/10" />
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-mono text-xs text-white/35 hover:text-white/60 transition-colors cursor-pointer"
          >
            ← BACK TO HOME
          </button>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs tracking-widest" style={{ color: activeColor }}>
          <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: activeColor }} />
          SYSTEM OPERATIONAL
        </div>
        <div className="font-mono text-xs text-white/25">
          {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC
        </div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center px-8 py-16">
        <AnimatePresence mode="wait">
          {mode === 'select' && <RoleSelectScreen key="select" onSelect={setMode} />}
          {mode === 'citizen-login' && (
            <CitizenLogin
              key="cl"
              onBack={goBack}
              onRegister={() => setMode('citizen-register')}
              onLogin={(email, password) => loginAs('citizen', email, password)}
            />
          )}
          {mode === 'citizen-register' && (
            <CitizenRegister
              key="cr"
              onBack={goBack}
              onLogin={() => setMode('citizen-login')}
              onRegister={registerCitizen}
            />
          )}
          {mode === 'responder-login' && (
            <ResponderLogin
              key="rl"
              onBack={goBack}
              onRegister={() => setMode('responder-register')}
              onLogin={(email, password) => loginAs('responder', email, password)}
            />
          )}
          {mode === 'responder-register' && (
            <ResponderRegister key="rr" onBack={goBack} onLogin={() => setMode('responder-login')} />
          )}
          {mode === 'authority-login' && (
            <OperationalLogin
              key="al"
              role="authority_command"
              onBack={goBack}
              onLogin={(role, email, password) => loginAs(role, email, password)}
            />
          )}
          {mode === 'resource-login' && (
            <OperationalLogin
              key="rl2"
              role="resource_manager"
              onBack={goBack}
              onLogin={(role, email, password) => loginAs(role, email, password)}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 text-center pb-3 z-20">
        <div className="font-mono text-xs tracking-widest text-white/15">
          AUTHORIZED ACCESS ONLY · ALL SESSIONS LOGGED · FOUR OPERATIONAL ROLES
        </div>
      </div>
    </div>
  );
}
