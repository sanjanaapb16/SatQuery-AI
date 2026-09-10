import { useState } from 'react'
import type { FormEvent } from 'react'
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { auth, firebaseConfigured } from './lib/firebase'
import './auth.css'

type AuthScreenProps = { onDemo: () => void }

function authMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'This email already has an account. Switch to Sign in.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/operation-not-allowed': 'Email/Password sign-in is not enabled in Firebase Console.',
    'auth/invalid-api-key': 'Firebase API key is invalid. Check Vercel Environment Variables.',
    'auth/unauthorized-domain': 'This Vercel domain is not authorized in Firebase Authentication settings.',
    'auth/network-request-failed': 'Network request failed. Check your connection and try again.',
  }
  return messages[code] || (error instanceof Error ? error.message : 'Authentication failed. Check Firebase settings.')
}

export default function AuthScreen({ onDemo }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!auth) {
      setError('Firebase is not configured. Check your .env.local values and restart the dev server.')
      return
    }
    setBusy(true)
    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        await sendEmailVerification(credential.user)
        setNotice('Account created. Check your inbox to verify your email, then sign in.')
        setIsSignUp(false)
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password)
        if (!credential.user.emailVerified) {
          setNotice('Please verify your email before entering SatQuery. A new verification email is ready to send.')
          await sendEmailVerification(credential.user)
          return
        }
      }
    } catch (firebaseError) {
      setError(authMessage(firebaseError))
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async () => {
    setError('')
    setNotice('')
    if (!auth) return setError('Firebase is not configured.')
    if (!email) return setError('Enter your email address first.')
    setBusy(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setNotice('Password reset email sent. Check your inbox for the secure link.')
    } catch (firebaseError) {
      setError(authMessage(firebaseError))
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-shell">
    <div className="auth-visual"><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /><div className="auth-scanline" /><div className="auth-brand"><span>◒</span><div><strong>SATQUERY</strong><small>AI / REMOTE SENSING INTELLIGENCE</small></div></div><div className="auth-visual-copy"><span className="eyebrow">MISSION CONTROL · SECURE ACCESS</span><h1>See the planet<br /><em>with context.</em></h1><p>Turn satellite observations into clear, defensible answers with an agentic vision-language workspace.</p><div className="auth-stats"><div><strong>11</strong><span>Specialist models</span></div><div><strong>24/7</strong><span>Analysis readiness</span></div><div><strong>∞</strong><span>Questions per session</span></div></div></div><div className="auth-coordinates">12°58'42&quot; N<br />77°35'19&quot; E <span>LIVE ORBITAL FEED</span></div></div>
    <section className="auth-panel"><div className="auth-panel-top"><span className="eyebrow">WELCOME BACK</span><span className="secure-badge">⌁ ENCRYPTED</span></div><h2>{isSignUp ? 'Create your workspace' : 'Continue your analysis'}</h2><p className="auth-subtitle">{isSignUp ? 'Set up your secure SatQuery account.' : 'Sign in to access your imagery, projects, and findings.'}</p><form onSubmit={submit}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@organisation.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" minLength={6} required /></label>{!isSignUp && <button type="button" className="forgot" onClick={resetPassword}>Forgot password?</button>}{error && <div className="auth-error" role="alert">! {error}</div>}{notice && <div className="auth-notice" role="status">✓ {notice}</div>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Connecting…' : isSignUp ? 'Create account' : 'Sign in'} <span>→</span></button></form><div className="auth-divider"><span>OR</span></div><button className="demo-entry" onClick={onDemo}>✦ Preview with demo data</button><p className="auth-switch">{isSignUp ? 'Already have an account?' : 'New to SatQuery?'} <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setNotice('') }}>{isSignUp ? 'Sign in' : 'Create an account'}</button></p><p className="auth-legal">By continuing, you agree to SatQuery's terms and acknowledge that AI outputs are analytical aids.</p><div className="auth-config"><span className={firebaseConfigured ? 'config-dot ready' : 'config-dot'} /> {firebaseConfigured ? 'Firebase project connected' : 'Firebase configuration required'}</div></section>
  </main>
}
