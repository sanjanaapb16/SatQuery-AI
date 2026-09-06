import { useState } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, UserRound, Waves } from 'lucide-react'
import './auth.css'

type AuthMode = 'signin' | 'register'

export default function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    window.setTimeout(onAuthenticated, 500)
  }

  return <main className="auth-page"><div className="auth-visual"><div className="auth-brand"><span><Waves size={18} /></span><strong>SatQuery</strong></div><div className="auth-copy"><p className="eyebrow"><i /> SATELLITE INTELLIGENCE PLATFORM</p><h1>Ask the satellite.<br /><em>Get the evidence.</em></h1><p>Turn Earth observation data into decisions you can see, question, and trust.</p></div><div className="auth-orbit"><div className="auth-earth"><b /><b /><b /></div><div className="auth-ring one" /><div className="auth-ring two" /><span>12.97° N</span><span>77.59° E</span></div><div className="auth-footer"><span><CheckCircle2 size={14} /> Secure workspace</span><span>Demo environment · SIH26167</span></div></div><section className="auth-card"><div className="auth-card-top"><div><p className="auth-kicker">WELCOME BACK</p><h2>{mode === 'signin' ? 'Sign in to SatQuery' : 'Create your workspace'}</h2><p>{mode === 'signin' ? 'Continue your satellite intelligence work.' : 'Start asking better questions of Earth.'}</p></div><div className="auth-icon"><Waves size={19} /></div></div><form onSubmit={submit}>{mode === 'register' && <label><span>Full name</span><div className="field"><UserRound size={16} /><input required value={name} onChange={event => setName(event.target.value)} placeholder="Ananya Sharma" /></div></label>}<label><span>Email address</span><div className="field"><Mail size={16} /><input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@organisation.com" /></div></label><label><span>Password</span><div className="field"><LockKeyhole size={16} /><input required minLength={6} type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>{mode === 'signin' && <div className="auth-options"><label className="remember"><input type="checkbox" /> <span>Remember me</span></label><button type="button" className="forgot">Forgot password?</button></div>}<button className="auth-submit" type="submit">{submitted ? 'Opening workspace...' : mode === 'signin' ? 'Sign in' : 'Create account'} {!submitted && <ArrowRight size={17} />}</button></form><div className="auth-divider"><span>or continue with</span></div><button className="google-button" onClick={onAuthenticated}><span>G</span> Continue with Google</button><p className="switch-auth">{mode === 'signin' ? 'New to SatQuery?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setSubmitted(false) }}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p><p className="demo-note">Demo access is enabled locally. Firebase Authentication can replace this adapter without changing the dashboard.</p></section></main>
}
