import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { jsPDF } from 'jspdf'
import { type Session } from '@supabase/supabase-js'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Gauge,
  Globe,
  History,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  Lock,
  MapPinned,
  MessageSquareText,
  Mic,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Volume2,
  VolumeX,
  Workflow,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Circle, MapContainer, Marker, Polygon, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { imageService } from './services/imageService'
import { runAnalysis } from './services/analysisService'
import type { AnalysisHistoryItem, AnalysisMode, AnalysisResult, UploadedImage } from './types'

const modeOptions: Array<{ key: AnalysisMode; label: string; description: string }> = [
  { key: 'single', label: 'Single Image', description: 'Optical or multispectral scene' },
  { key: 'optical-sar', label: 'Optical + SAR', description: 'Compare modalities side by side' },
  { key: 'before-after', label: 'Before / After', description: 'Change detection workflow' },
  { key: 'change', label: 'Change Detection', description: 'Identify new or removed features' },
  { key: 'object', label: 'Object Detection', description: 'Highlight roads, buildings, water' },
  { key: 'land-cover', label: 'Land Cover', description: 'Classify terrain and usage' },
  { key: 'disaster', label: 'Disaster Analysis', description: 'Flood, fire, landslide analysis' },
  { key: 'agriculture', label: 'Agriculture', description: 'Field and stress monitoring' },
  { key: 'urban-growth', label: 'Urban Growth', description: 'Expansion and densification' },
]

const suggestionQuestions = [
  'What changed between these images?',
  'Identify all buildings.',
  'Where are the water bodies?',
  'How much agricultural land is visible?',
  'Are there signs of flooding?',
  'Compare the optical and SAR images.',
  'Identify urban expansion.',
  'Calculate the approximate affected area.',
]

const demoUser = {
  full_name: 'Demo Researcher',
  email: 'researcher@satquery.ai',
  organization: 'GeoIntelligence Lab',
}

const chartColors = ['#60a5fa', '#34d399', '#a78bfa', '#fbbf24', '#f87171', '#67e8f9']

function estimatePolygonAreaKm2(points: Array<[number, number]>) {
  if (points.length < 3) {
    return 0
  }

  const radians = points.map(([lat, lng]) => [lat * (Math.PI / 180), lng * (Math.PI / 180)] as const)

  let area = 0

  for (let index = 0; index < radians.length; index += 1) {
    const [lat1, lng1] = radians[index]
    const [lat2, lng2] = radians[(index + 1) % radians.length]
    area += lng1 * lat2 - lng2 * lat1
  }

  const absArea = Math.abs(area) / 2
  return absArea * 6371 * 6371
}

function App() {
  return (
    <BrowserRouter>
      <SatQueryApp />
    </BrowserRouter>
  )
}

function SatQueryApp() {
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [profile, setProfile] = useState<typeof demoUser>({ ...demoUser })
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('single')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [query, setQuery] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([])
  const [aoiPoints, setAoiPoints] = useState<Array<[number, number]>>([])
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es' | 'fr'>('en')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (mounted) {
        setSession(currentSession)
        setIsInitializing(false)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession)
      }
    })

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor()
      recognition.lang = 'en-US'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? ''
        if (transcript) {
          setQuery(transcript)
        }
      }

      recognition.onerror = (event: any) => {
        setVoiceError(event.error ? `Voice input error: ${event.error}` : 'Voice input failed.')
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      setVoiceSupported(true)
    } else {
      setVoiceSupported(false)
    }

    return () => {
      mounted = false
      subscription.unsubscribe()
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user) {
        setProfile({ ...demoUser })
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, organization')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (error) {
        console.error('Failed to load profile:', error)
      }

      setProfile({
        full_name: data?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || demoUser.full_name,
        email: data?.email || session.user.email || demoUser.email,
        organization: data?.organization || 'Authenticated User',
      })
    }

    void loadProfile()
  }, [session])

  const latestMode = useMemo(
    () => modeOptions.find((option) => option.key === analysisMode) ?? modeOptions[0],
    [analysisMode],
  )

  const startVoiceInput = () => {
    if (!voiceSupported) {
      setVoiceError('Voice input is not supported in this browser.')
      return
    }

    setVoiceError('')
    recognitionRef.current?.start()
    setIsListening(true)
  }

  const stopVoiceInput = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const speakAnalysisResult = () => {
    if (!analysisResult || typeof window === 'undefined') {
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(
      `${analysisResult.summary}. ${analysisResult.detailed_explanation}`,
    )
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  const stopVoiceAnswer = () => {
    window.speechSynthesis?.cancel()
  }

  const statCards = useMemo(
    () => [
      { label: 'Total Analyses', value: '24', icon: <Workflow className="h-5 w-5" /> },
      { label: 'Images Processed', value: '38', icon: <ImageIcon className="h-5 w-5" /> },
      { label: 'Average Confidence', value: '91.4%', icon: <Gauge className="h-5 w-5" /> },
      { label: 'Change Detection', value: '12', icon: <BarChart3 className="h-5 w-5" /> },
    ],
    [],
  )

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return

    setIsUploading(true)

    try {
      const uploadedImages = await imageService.uploadFiles(fileList, session?.user?.id)

      setImages((current) => {
        if (analysisMode === 'before-after') {
          const filtered = current.filter((image) => image.imageType !== 'before' && image.imageType !== 'after')
          return [...filtered, ...uploadedImages]
        }

        return [...current, ...uploadedImages]
      })
    } catch (error) {
      console.error(error)
      window.alert(error instanceof Error ? error.message : 'Image upload failed.')
    } finally {
      setIsUploading(false)
      const input = fileInputRef.current
      if (input) {
        input.value = ''
      }
    }
  }

  const removeImage = (id: string) => {
    setImages((current) => current.filter((image) => image.id !== id))
  }

  const updateImageGeoMetadata = (
    patch: Partial<Pick<UploadedImage, 'latitude' | 'longitude' | 'zoom' | 'regionName' | 'geospatialSource'>>,
  ) => {
    setImages((current) =>
      current.map((image, index) => (index === 0 ? { ...image, ...patch } : image)),
    )
  }

  const handleAnalyze = async () => {
    if (!query.trim()) {
      window.alert('Please enter a question before running analysis.')
      return
    }

    if (images.length === 0) {
      window.alert('Please upload at least one image before running analysis.')
      return
    }

    setIsAnalyzing(true)

    try {
      const result = await runAnalysis({
        mode: analysisMode,
        query,
        images,
      })

      setAnalysisResult(result)
      setHistory((current) => [
        {
          id: result.id,
          title: latestMode.label,
          question: query,
          content: result.summary,
          created_at: result.created_at,
          analysis_type: analysisMode,
        },
        ...current,
      ])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDownloadReport = () => {
    if (!analysisResult) {
      return
    }

    const aoiAreaKm2 = estimatePolygonAreaKm2(aoiPoints)
    const pdf = new jsPDF()

    pdf.setFillColor(15, 23, 42)
    pdf.rect(0, 0, 210, 44, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('SATQUERY AI', 14, 24)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Interactive Vision-Language Remote Sensing Assistant', 14, 34)

    pdf.setTextColor(15, 23, 42)
    pdf.setFontSize(12)
    pdf.text(`Analysis Date: ${new Date(analysisResult.created_at).toLocaleString()}`, 14, 58)
    pdf.text(`Analysis Type: ${analysisResult.analysis_type}`, 14, 66)
    pdf.text(`Query: ${query}`, 14, 74)

    pdf.setFont('helvetica', 'bold')
    pdf.text('Summary', 14, 92)
    pdf.setFont('helvetica', 'normal')
    pdf.text(analysisResult.summary, 14, 100, { maxWidth: 180 })

    pdf.setFont('helvetica', 'bold')
    pdf.text('Detailed Explanation', 14, 124)
    pdf.setFont('helvetica', 'normal')
    pdf.text(analysisResult.detailed_explanation, 14, 132, { maxWidth: 180 })

    pdf.setFont('helvetica', 'bold')
    pdf.text('Evidence', 14, 176)
    pdf.setFont('helvetica', 'normal')
    analysisResult.evidence_data.forEach((item, index) => {
      pdf.text(` ${item}`, 18, 184 + index * 8, { maxWidth: 170 })
    })

    pdf.setFont('helvetica', 'bold')
    pdf.text('Recommendations', 14, 230)
    pdf.setFont('helvetica', 'normal')
    analysisResult.recommendations.forEach((item, index) => {
      pdf.text(` ${item}`, 18, 238 + index * 8, { maxWidth: 170 })
    })

    if (aoiPoints.length >= 3) {
      const lineStart = 270
      pdf.setFont('helvetica', 'bold')
      pdf.text('AOI Geometry', 14, lineStart)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Estimated Area: ${aoiAreaKm2.toFixed(2)} km²`, 18, lineStart + 10)
      pdf.text(
        `Points: ${aoiPoints.map(([lat, lng]) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`).join(' | ')}`,
        18,
        lineStart + 18,
        { maxWidth: 170 },
      )
    }

    pdf.save(`satquery-ai-report-${Date.now()}.pdf`)
  }

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')

    if (!email || !password) {
      setAuthError('Please provide both email and password.')
      return
    }

    setAuthLoading(true)

    try {
      if (authMode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split('@')[0],
            },
          },
        })

        if (error) {
          throw error
        }

        if (data.user && data.session) {
          await supabase.from('profiles').upsert(
            {
              user_id: data.user.id,
              full_name: fullName || email.split('@')[0],
              email,
              organization: 'New User',
              avatar_url: null,
            },
            { onConflict: 'user_id' },
          )
        }

        setAuthMessage('Account created. Check your inbox for email confirmation if required.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          throw error
        }

        setAuthMessage('Signed in successfully.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.'
      setAuthError(message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!email) {
      setAuthError('Enter your email before requesting a password reset.')
      return
    }

    const redirectTo = `${window.location.origin}/`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      setAuthError(error.message)
      return
    }

    setAuthMessage('Password reset email sent successfully.')
  }

  const handleProfileSave = async ({ full_name, organization }: { full_name: string; organization: string }) => {
    if (!session?.user) {
      return
    }

    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: session.user.id,
        full_name,
        email: session.user.email || profile.email,
        organization,
        avatar_url: null,
      },
      { onConflict: 'user_id' },
    )

    if (error) {
      throw error
    }

    setProfile((current) => ({
      ...current,
      full_name,
      organization,
      email: session.user.email || current.email,
    }))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setAuthMessage('You have been signed out.')
  }

  if (isSupabaseConfigured && !session && !isInitializing && location.pathname !== '/') {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        fullName={fullName}
        setFullName={setFullName}
        authError={authError}
        authMessage={authMessage}
        authLoading={authLoading}
        onSubmit={handleAuthSubmit}
        onResetPassword={handlePasswordReset}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Vision-Language Assistant</p>
              <h1 className="text-xl font-semibold text-white">SATQUERY AI</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-full border border-slate-800 bg-slate-900/90 p-1 md:flex">
            <NavLink className={({ isActive }) => `rounded-full px-3 py-2 text-sm ${isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`} to="/">
              Home
            </NavLink>
            <NavLink className={({ isActive }) => `rounded-full px-3 py-2 text-sm ${isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`} to="/dashboard">
              Dashboard
            </NavLink>
            <NavLink className={({ isActive }) => `rounded-full px-3 py-2 text-sm ${isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`} to="/history">
              History
            </NavLink>
            <NavLink className={({ isActive }) => `rounded-full px-3 py-2 text-sm ${isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`} to="/reports">
              Reports
            </NavLink>
            <NavLink className={({ isActive }) => `rounded-full px-3 py-2 text-sm ${isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`} to="/profile">
              Profile
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <button type="button" className="rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-200">
              Analysis History
            </button>
            <button type="button" className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-950">
              <UserCircle2 className="h-4 w-4" />
              {session?.user?.email ?? demoUser.full_name}
            </button>
            {session && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/80 p-6 shadow-2xl shadow-blue-950/40">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
                Premium remote-sensing AI platform
              </p>
              <h2 className="text-3xl font-semibold text-white md:text-5xl">
                Discover change, objects, and land cover from satellite imagery in seconds.
              </h2>
              <p className="mt-4 max-w-xl text-sm text-slate-300 md:text-base">
                Ask natural-language questions, compare optical and SAR data, and review AI evidence, confidence, reliability, and recommendations in one unified workflow.
              </p>
            </div>

            <div className="grid min-w-[260px] gap-3 sm:grid-cols-2 lg:w-[420px]">
              <HeroMetric label="Active modes" value="9" />
              <HeroMetric label="Demo analyses" value="24" />
              <HeroMetric label="Confidence" value="91.4%" />
              <HeroMetric label="Supabase-ready" value="Yes" />
            </div>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<HomePage session={session} />} />
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                analysisMode={analysisMode}
                setAnalysisMode={setAnalysisMode}
                images={images}
                query={query}
                setQuery={setQuery}
                isAnalyzing={isAnalyzing}
                isUploading={isUploading}
                addFiles={addFiles}
                removeImage={removeImage}
                updateImageGeoMetadata={updateImageGeoMetadata}
                handleAnalyze={handleAnalyze}
                handleDownloadReport={handleDownloadReport}
                analysisResult={analysisResult}
                latestMode={latestMode}
                suggestionQuestions={suggestionQuestions}
                statCards={statCards}
                fileInputRef={fileInputRef}
                isListening={isListening}
                voiceError={voiceError}
                startVoiceInput={startVoiceInput}
                stopVoiceInput={stopVoiceInput}
                speakAnalysisResult={speakAnalysisResult}
                stopVoiceAnswer={stopVoiceAnswer}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
                aoiPoints={aoiPoints}
                setAoiPoints={setAoiPoints}
              />
            }
          />
          <Route path="/history" element={<HistoryPage history={history} />} />
          <Route path="/reports" element={<ReportsPage analysisResult={analysisResult} query={query} />} />
          <Route path="/profile" element={<ProfilePage user={profile} onSave={handleProfileSave} />} />
        </Routes>
      </main>
    </div>
  )
}

function HomePage({ session }: { session: Session | null }) {
  const extraFeatures = [
    {
      title: 'Interactive Satellite Map',
      description: 'Pan, zoom, and view live satellite imagery with AI-grounded overlays.',
      icon: <MapPinned className="h-5 w-5 text-blue-400" />,
    },
    {
      title: 'AI Change Heatmap',
      description: 'Spot surface changes and compare before/after scenes with clear visual indicators.',
      icon: <BarChart3 className="h-5 w-5 text-emerald-400" />,
    },
    {
      title: 'Object Highlighting',
      description: 'Ask for buildings, water bodies, roads, and other targets to highlight them instantly.',
      icon: <Building2 className="h-5 w-5 text-violet-400" />,
    },
    {
      title: 'Land Cover Classification',
      description: 'Classify water, vegetation, agriculture, urban areas, and more from the same image.',
      icon: <Layers3 className="h-5 w-5 text-cyan-400" />,
    },
    {
      title: 'Optical vs SAR Comparison',
      description: 'Combine optical imagery with radar analysis for richer geospatial interpretation.',
      icon: <Globe className="h-5 w-5 text-blue-400" />,
    },
    {
      title: 'Voice & Multilingual Support',
      description: 'Use voice commands and multilingual responses for faster, more natural analysis.',
      icon: <Mic className="h-5 w-5 text-pink-400" />,
    },
  ]

  return (
    <div className="space-y-8 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-blue-950/80 to-violet-950/80 p-8 shadow-2xl shadow-blue-950/40 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
              Interactive Vision-Language Platform
            </p>
            <h2 className="text-4xl font-semibold text-white md:text-6xl">
              Ask questions about remote sensing imagery in plain language.
            </h2>
            <p className="mt-5 max-w-xl text-base text-slate-300 md:text-lg">
              SatQuery AI helps researchers, analysts, and GIS teams analyze imagery, detect objects, measure change, and generate polished reports from a single interface.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <NavLink
                to="/dashboard"
                className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30"
              >
                Open Dashboard
              </NavLink>
              <NavLink
                to={session ? '/dashboard' : '/dashboard'}
                className="rounded-full border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-slate-100"
              >
                Explore Features
              </NavLink>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">Object Detection</span>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">Change Detection</span>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">Land Cover</span>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">PDF Reporting</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <HeroMetric label="Modes" value="9" />
            <HeroMetric label="Accuracy" value="91.4%" />
            <HeroMetric label="Supabase" value="Ready" />
            <HeroMetric label="Reports" value="Auto" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <FeatureCard
          title="Natural Language Querying"
          description="Ask questions like ‘What changed between these images?’ and get AI-first explanations, evidence, and recommendations."
          icon={<MessageSquareText className="h-5 w-5 text-blue-400" />}
        />
        <FeatureCard
          title="Multimodal Analysis"
          description="Work with optical, SAR, before/after, land cover, and disaster-focused workflows in one place."
          icon={<Layers3 className="h-5 w-5 text-violet-400" />}
        />
        <FeatureCard
          title="Exportable Insights"
          description="Generate PDF reports, review confidence metrics, and share a polished summary with stakeholders."
          icon={<FileText className="h-5 w-5 text-emerald-400" />}
        />
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Extra Features</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Additional capabilities included in the same blue theme</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {extraFeatures.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}


function FeatureCard({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <div className="panel">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  )
}

function DashboardPage({
  analysisMode,
  setAnalysisMode,
  images,
  query,
  setQuery,
  isAnalyzing,
  isUploading,
  addFiles,
  removeImage,
  updateImageGeoMetadata,
  handleAnalyze,
  handleDownloadReport,
  analysisResult,
  latestMode,
  suggestionQuestions,
  statCards,
  fileInputRef,
  isListening,
  voiceError,
  startVoiceInput,
  stopVoiceInput,
  speakAnalysisResult,
  stopVoiceAnswer,
  selectedLanguage,
  setSelectedLanguage,
  aoiPoints,
  setAoiPoints,
}: {
  analysisMode: AnalysisMode
  setAnalysisMode: (mode: AnalysisMode) => void
  images: UploadedImage[]
  query: string
  setQuery: (query: string) => void
  isAnalyzing: boolean
  isUploading: boolean
  addFiles: (fileList: FileList | null) => Promise<void>
  removeImage: (id: string) => void
  updateImageGeoMetadata: (
    patch: Partial<Pick<UploadedImage, 'latitude' | 'longitude' | 'zoom' | 'regionName' | 'geospatialSource'>>,
  ) => void
  handleAnalyze: () => Promise<void> | void
  handleDownloadReport: () => void
  analysisResult: AnalysisResult | null
  latestMode: { key: AnalysisMode; label: string; description: string }
  suggestionQuestions: string[]
  statCards: Array<{ label: string; value: string; icon: ReactNode }>
  fileInputRef: RefObject<HTMLInputElement | null>
  isListening: boolean
  voiceError: string
  startVoiceInput: () => void
  stopVoiceInput: () => void
  speakAnalysisResult: () => void
  stopVoiceAnswer: () => void
  selectedLanguage: 'en' | 'es' | 'fr'
  setSelectedLanguage: (language: 'en' | 'es' | 'fr') => void
  aoiPoints: Array<[number, number]>
  setAoiPoints: React.Dispatch<React.SetStateAction<Array<[number, number]>>>
}) {
  const currentGeo = images[0] ?? {
    latitude: 20.5937,
    longitude: 78.9629,
    zoom: 2,
    regionName: 'Scene Overview',
    geospatialSource: 'manual',
  }

  const [mapLayers, setMapLayers] = useState({
    showSatellite: true,
    showDetectedObjects: true,
    showAOI: true,
    showHeatmap: true,
  })

  const toggleMapLayer = (key: keyof typeof mapLayers) => {
    setMapLayers((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const landCoverData = analysisResult?.land_cover_result ?? [
    { label: 'Agriculture', percentage: 38.4, color: '#34d399' },
    { label: 'Forest', percentage: 24.2, color: '#22c55e' },
    { label: 'Urban', percentage: 18.7, color: '#60a5fa' },
    { label: 'Water', percentage: 9.3, color: '#38bdf8' },
    { label: 'Bare Land', percentage: 6.1, color: '#fbbf24' },
    { label: 'Roads', percentage: 3.3, color: '#a78bfa' },
  ]

  return (
    <>
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1.5fr)_420px]">
        <aside className="panel">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Input</h2>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200"
            >
              {isUploading ? 'Uploading...' : 'Add Images'}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void addFiles(event.target.files)
            }}
          />

          <div className="space-y-3">
            {modeOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setAnalysisMode(option.key)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  analysisMode === option.key
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  {analysisMode === option.key && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
                </div>
                <p className="mt-1 text-xs text-slate-400">{option.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-200">Uploaded Images</p>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{images.length} files</span>
            </div>
            <div className="space-y-3">
              {images.length === 0 ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-6 text-center text-slate-400">
                  No images yet.
                </div>
              ) : (
                images.map((image) => (
                  <div key={image.id} className="flex items-center gap-3 rounded-2xl bg-slate-950/70 p-2">
                    <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                      <img src={image.localUrl} alt={image.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{image.name}</p>
                      <p className="text-xs text-slate-400">{image.imageType.toUpperCase()}  {Math.round(image.size / 1024)} KB</p>
                    </div>
                    <button type="button" onClick={() => removeImage(image.id)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="panel">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Viewer</p>
              <h2 className="text-lg font-semibold text-white">{latestMode.label}</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-[0.18em] text-slate-400">Language</label>
              <select
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value as 'en' | 'es' | 'fr')}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
              <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                {isSupabaseConfigured ? 'Supabase Connected' : 'Demo Mode Active'}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {images.length > 0 ? (
              images.map((image) => (
                <div key={image.id} className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
                  <div className="relative h-56">
                    <img src={image.localUrl} alt={image.name} className="h-full w-full object-cover" />
                    {analysisResult?.detected_objects.map((object) => (
                      <div
                        key={`${image.id}-${object.id}`}
                        className="absolute rounded-xl border-2 border-cyan-300/90 bg-cyan-400/10"
                        style={{
                          left: `${Math.min(Math.max((object.x / 100) * 100, 4), 96)}%`,
                          top: `${Math.min(Math.max((object.y / 100) * 100, 4), 96)}%`,
                          width: `${Math.min(Math.max((object.width / 100) * 100, 8), 30)}%`,
                          height: `${Math.min(Math.max((object.height / 100) * 100, 8), 30)}%`,
                        }}
                      >
                        <span className="absolute -top-6 left-0 rounded-full bg-slate-950/90 px-2 py-1 text-[10px] font-medium text-cyan-200">
                          {object.label}
                        </span>
                      </div>
                    ))}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950 to-transparent px-4 pb-3 pt-12">
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200">
                        {image.imageType}
                      </span>
                      <span className="text-xs text-slate-200">{image.width ?? 1280}  {image.height ?? 720}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex h-72 items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 text-slate-500">
                Upload an image to begin analysis.
              </div>
            )}
          </div>

          {(images.length > 0 || analysisResult) && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <MapPreviewPanel
                detectedObjects={analysisResult?.detected_objects ?? []}
                imageName={images[0]?.name ?? 'Satellite scene'}
                geo={currentGeo}
                layerConfig={mapLayers}
                onToggleLayer={toggleMapLayer}
                aoiPoints={aoiPoints}
                onAoiChange={setAoiPoints}
              />

              {analysisResult && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-200"><BarChart3 className="h-4 w-4 text-emerald-400" /> AI Change Heatmap</div>
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-emerald-300">Change Index</span>
                  </div>
                  <div className="space-y-3">
                    {analysisResult.detected_changes.map((change) => (
                      <div key={change.id}>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                          <span>{change.label}</span>
                          <span className={change.magnitude >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{change.magnitude}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${change.magnitude >= 0 ? 'bg-gradient-to-r from-emerald-400 to-cyan-400' : 'bg-gradient-to-r from-rose-400 to-orange-400'}`}
                            style={{ width: `${Math.min(Math.abs(change.magnitude) * 8, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-slate-300"><MapPinned className="h-4 w-4" /> Geospatial Alignment</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="space-y-1 text-slate-300">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Latitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={currentGeo.latitude ?? 20.5937}
                    onChange={(event) =>
                      updateImageGeoMetadata({ latitude: Number(event.target.value) || 20.5937 })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="space-y-1 text-slate-300">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Longitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={currentGeo.longitude ?? 78.9629}
                    onChange={(event) =>
                      updateImageGeoMetadata({ longitude: Number(event.target.value) || 78.9629 })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="space-y-1 text-slate-300">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Zoom</span>
                  <input
                    type="number"
                    min={1}
                    max={18}
                    value={currentGeo.zoom ?? 2}
                    onChange={(event) => updateImageGeoMetadata({ zoom: Number(event.target.value) || 2 })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="space-y-1 text-slate-300">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Region</span>
                  <input
                    type="text"
                    value={currentGeo.regionName ?? 'Scene Overview'}
                    onChange={(event) =>
                      updateImageGeoMetadata({ regionName: event.target.value || 'Scene Overview' })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100 outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-slate-300"><Layers3 className="h-4 w-4" /> AI Workflow</div>
              <p className="text-sm text-slate-400">Preprocess → Align geospatial metadata → Detect objects → Generate evidence</p>
            </div>
          </div>
        </section>

        <aside className="panel space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">AI Query</p>
            <h2 className="mt-2 text-lg font-semibold">Ask a question</h2>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Voice input</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  isListening
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-200'
                    : 'border-slate-700 bg-slate-900 text-slate-200'
                }`}
              >
                <Mic className="h-3.5 w-3.5" />
                {isListening ? 'Stop' : 'Speak'}
              </button>
              {analysisResult && (
                <button
                  type="button"
                  onClick={window.speechSynthesis?.speaking ? stopVoiceAnswer : speakAnalysisResult}
                  className="flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200"
                >
                  {window.speechSynthesis?.speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  {window.speechSynthesis?.speaking ? 'Stop Audio' : 'Listen'}
                </button>
              )}
            </div>
          </div>

          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-[150px] w-full rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-100 outline-none focus:border-blue-500"
            placeholder="Ask about changes, objects, land cover, disaster patterns, agriculture, or urban growth..."
          />

          {voiceError && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {voiceError}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {suggestionQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => setQuery(question)}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:border-blue-500 hover:text-white"
              >
                {question}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={isAnalyzing}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAnalyzing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>

            <button
              type="button"
              onClick={handleDownloadReport}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100"
            >
              <FileText className="h-4 w-4" />
              Generate PDF Report
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Reliability</div>
            <div className="space-y-3">
              <ProgressLine label="Confidence" value={analysisResult?.confidence_score ?? 91} tone="blue" />
              <ProgressLine label="Reliability" value={analysisResult?.reliability_score ?? 86} tone="green" />
            </div>
          </div>
        </aside>
      </div>

      <section className="mt-8">
        {analysisResult ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">AI Analysis Result</p>
                <h3 className="text-2xl font-semibold text-white">{analysisResult.summary}</h3>
              </div>
              <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300">
                {isSupabaseConfigured ? 'Supabase-powered' : 'DEMO / MOCK ANALYSIS'}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <ResultCard title="Summary" icon={<Sparkles className="h-5 w-5 text-blue-400" />} value={analysisResult.summary} />
              <ResultCard title="Confidence" icon={<Gauge className="h-5 w-5 text-emerald-400" />} value={`${analysisResult.confidence_score}%`} />
              <ResultCard title="Reliability" icon={<ShieldCheck className="h-5 w-5 text-violet-400" />} value={`${analysisResult.reliability_score}%`} />
              <ResultCard title="Objects" icon={<Building2 className="h-5 w-5 text-orange-400" />} value={`${analysisResult.detected_objects.length} highlights`} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <div className="panel">
                <div className="mb-4 flex items-center gap-2 text-slate-200"><MessageSquareText className="h-4 w-4 text-blue-400" /> Detailed Explanation</div>
                <p className="leading-7 text-slate-300">{analysisResult.detailed_explanation}</p>
              </div>

              <div className="panel">
                <div className="mb-4 flex items-center gap-2 text-slate-200"><Globe className="h-4 w-4 text-blue-400" /> Evidence</div>
                <ul className="space-y-3 text-sm text-slate-300">
                  {analysisResult.evidence_data.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_1.2fr_1fr]">
              <div className="panel">
                <div className="mb-4 flex items-center gap-2 text-slate-200"><Activity className="h-4 w-4 text-violet-400" /> Detected Objects</div>
                <div className="space-y-3">
                  {analysisResult.detected_objects.map((object) => (
                    <div key={object.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-slate-200">{object.label}</span>
                        <span className="text-xs text-slate-400">{object.confidence}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${object.confidence}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="mb-4 flex items-center gap-2 text-slate-200"><BarChart3 className="h-4 w-4 text-emerald-400" /> Change Detection</div>
                <div className="space-y-3">
                  {analysisResult.detected_changes.map((change) => (
                    <div key={change.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-slate-200">{change.label}</span>
                        <span className={`text-xs ${change.magnitude >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {change.magnitude > 0 ? '+' : ''}{change.magnitude}%
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{change.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="mb-4 flex items-center gap-2 text-slate-200"><Layers3 className="h-4 w-4 text-orange-400" /> Area Measurements</div>
                <div className="space-y-3">
                  {analysisResult.area_measurements.map((area) => (
                    <div key={area.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{area.label}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{area.value}</p>
                      {area.estimate && <p className="text-xs text-slate-400">Estimated from AI interpretation</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <div className="panel">
                <div className="mb-4 flex items-center gap-2 text-slate-200"><BarChart3 className="h-4 w-4 text-blue-400" /> Land-Cover Classification</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={landCoverData}>
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                        {landCoverData.map((entry, index) => (
                          <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel">
                <div className="mb-4 flex items-center gap-2 text-slate-200"><Workflow className="h-4 w-4 text-violet-400" /> Agent Execution Timeline</div>
                <div className="space-y-4">
                  {analysisResult.agent_steps.map((step) => (
                    <div key={step.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`mt-0.5 h-3 w-3 rounded-full ${step.status === 'completed' ? 'bg-emerald-400' : step.status === 'processing' ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                        {step.step_order !== analysisResult.agent_steps.length && <div className="mt-2 h-8 w-px bg-slate-700" />}
                      </div>
                      <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-200">{step.step_name}</p>
                          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{step.status}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">{step.description}</p>
                        <p className="mt-2 text-xs text-slate-500">Duration: {step.duration_ms} ms</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="panel">
                <div className="mb-4 flex items-center gap-2 text-slate-200"><History className="h-4 w-4 text-cyan-400" /> Recommendations</div>
                <ul className="space-y-3 text-sm text-slate-300">
                  {analysisResult.recommendations.map((recommendation) => (
                    <li key={recommendation} className="flex gap-2">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-cyan-400" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel">
                <div className="mb-4 flex items-center gap-2 text-slate-200"><Layers3 className="h-4 w-4 text-pink-400" /> Coverage Snapshot</div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={landCoverData} dataKey="percentage" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {landCoverData.map((entry, index) => (
                          <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel flex min-h-[240px] items-center justify-center text-slate-400">
            Upload imagery and run an analysis to preview results here.
          </div>
        )}
      </section>
    </>
  )
}

function MapPreviewPanel({
  detectedObjects,
  imageName,
  geo,
  layerConfig,
  onToggleLayer,
  aoiPoints,
  onAoiChange,
}: {
  detectedObjects: AnalysisResult['detected_objects']
  imageName: string
  geo?: Partial<UploadedImage>
  layerConfig?: {
    showSatellite: boolean
    showDetectedObjects: boolean
    showAOI: boolean
    showHeatmap: boolean
  }
  onToggleLayer?: (key: 'showSatellite' | 'showDetectedObjects' | 'showAOI' | 'showHeatmap') => void
  aoiPoints?: Array<[number, number]>
  onAoiChange?: (points: Array<[number, number]>) => void
}) {
  const [isDrawingAoi, setIsDrawingAoi] = useState(false)

  const center: [number, number] = [geo?.latitude ?? 20.5937, geo?.longitude ?? 78.9629]
  const zoom = geo?.zoom ?? 2
  const showSatellite = layerConfig?.showSatellite ?? true
  const showDetectedObjects = layerConfig?.showDetectedObjects ?? true
  const showAOI = layerConfig?.showAOI ?? true
  const showHeatmap = layerConfig?.showHeatmap ?? true
  const normalizedAoiPoints = aoiPoints ?? []
  const aoiAreaKm2 = useMemo(() => estimatePolygonAreaKm2(normalizedAoiPoints), [normalizedAoiPoints])

  const overlayPolygon: Array<[number, number]> = normalizedAoiPoints.length >= 3
    ? normalizedAoiPoints
    : detectedObjects.length
      ? [
          [center[0] - 0.9, center[1] - 1.6],
          [center[0] + 0.9, center[1] - 1.2],
          [center[0] + 1.1, center[1] + 1.6],
          [center[0] - 0.6, center[1] + 1.8],
        ]
      : []

  const MapAoiController = () => {
    useMapEvents({
      click(event) {
        if (!isDrawingAoi) {
          return
        }

        const nextPoints = [...normalizedAoiPoints, [event.latlng.lat, event.latlng.lng] as [number, number]]
        onAoiChange?.(nextPoints)
      },
    })

    return null
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <MapPinned className="h-4 w-4 text-blue-400" /> Interactive Satellite Map
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-blue-300">
            {geo?.regionName ?? 'Map Preview'}
          </span>
          {normalizedAoiPoints.length >= 3 && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-emerald-300">
              AOI ~ {aoiAreaKm2.toFixed(2)} km²
            </span>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { key: 'showSatellite', label: 'Satellite' },
          { key: 'showHeatmap', label: 'Heatmap' },
          { key: 'showAOI', label: 'AOI' },
          { key: 'showDetectedObjects', label: 'Objects' },
        ].map((toggle) => {
          const active = layerConfig?.[toggle.key as keyof typeof layerConfig] ?? true
          return (
            <button
              key={toggle.key}
              type="button"
              onClick={() => onToggleLayer?.(toggle.key as 'showSatellite' | 'showDetectedObjects' | 'showAOI' | 'showHeatmap')}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${
                active
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-200'
                  : 'border-slate-700 bg-slate-950 text-slate-400'
              }`}
            >
              {toggle.label}
            </button>
          )
        })}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setIsDrawingAoi((current) => !current)}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${
            isDrawingAoi
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
              : 'border-slate-700 bg-slate-950 text-slate-400'
          }`}
        >
          {isDrawingAoi ? 'Stop Drawing AOI' : 'Draw AOI'}
        </button>
        <button
          type="button"
          onClick={() => {
            onAoiChange?.([])
            setIsDrawingAoi(false)
          }}
          className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400"
        >
          Clear AOI
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <div className="h-52 w-full">
          <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
            <MapAoiController />
            {showSatellite && (
              <TileLayer
                attribution='Tiles &copy; Esri, OpenStreetMap contributors'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            )}
            {showAOI && overlayPolygon.length > 0 && (
              <Polygon
                positions={overlayPolygon}
                pathOptions={{ color: '#60a5fa', fillColor: '#60a5fa', fillOpacity: 0.17, weight: 1.5 }}
              />
            )}
            {showHeatmap &&
              detectedObjects.slice(0, 5).map((object, index) => {
                const lat = center[0] + (index % 2 === 0 ? 0.55 : -0.35) + (index + 1) * 0.12
                const lng = center[1] + (index % 2 === 0 ? 0.65 : -0.45) + (index + 1) * 0.18
                const radius = Math.max(18000, Math.min(85000, object.confidence * 900))

                return (
                  <Circle
                    key={`${object.id}-heatmap`}
                    center={[lat, lng]}
                    radius={radius}
                    pathOptions={{
                      color: '#67e8f9',
                      fillColor: '#67e8f9',
                      fillOpacity: 0.18,
                      weight: 1.5,
                    }}
                  />
                )
              })}
            {showDetectedObjects &&
              detectedObjects.slice(0, 5).map((object, index) => {
                const lat = center[0] + (index % 2 === 0 ? 0.55 : -0.35) + (index + 1) * 0.12
                const lng = center[1] + (index % 2 === 0 ? 0.65 : -0.45) + (index + 1) * 0.18

                return (
                  <Marker key={`${object.id}-marker`} position={[lat, lng]}>
                    <Popup>
                      <div className="text-sm text-slate-700">
                        <p className="font-semibold">{object.label}</p>
                        <p>{imageName}</p>
                        <p className="text-xs text-slate-500">Confidence: {object.confidence}%</p>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}

function HistoryPage({ history }: { history: AnalysisHistoryItem[] }) {
  return (
    <div className="panel">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">History</p>
          <h2 className="text-2xl font-semibold text-white">Analysis History</h2>
        </div>
        <button type="button" className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
          Search and filter
        </button>
      </div>

      <div className="space-y-4">
        {history.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{new Date(item.created_at).toLocaleDateString()}</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{item.title}</h3>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Open</button>
                <button type="button" className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300">Delete</button>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">"{item.question}"</p>
            <p className="mt-2 text-sm text-slate-400">{item.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportsPage({ analysisResult, query }: { analysisResult: AnalysisResult | null; query: string }) {
  return (
    <div className="panel">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Reports</p>
          <h2 className="text-2xl font-semibold text-white">Generated Reports</h2>
        </div>
        <button type="button" className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
          Export archive
        </button>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <h3 className="text-lg font-semibold text-white">SatQuery AI  Report Snapshot</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InfoBlock label="User" value="Demo Researcher" />
          <InfoBlock label="Analysis Type" value={analysisResult?.analysis_type ?? 'single'} />
          <InfoBlock label="Query" value={query || 'No query provided'} />
          <InfoBlock label="Confidence" value={analysisResult ? `${analysisResult.confidence_score}%` : ''} />
        </div>
        {analysisResult && (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-sm text-slate-300">{analysisResult.summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfilePage({ user, onSave }: { user: typeof demoUser; onSave?: (profile: { full_name: string; organization: string }) => Promise<void> | void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(user)

  useEffect(() => {
    setFormData(user)
  }, [user])

  const handleSave = async () => {
    if (!onSave) {
      setIsEditing(false)
      return
    }

    try {
      await onSave({
        full_name: formData.full_name,
        organization: formData.organization,
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save profile', error)
      window.alert(error instanceof Error ? error.message : 'Failed to update profile.')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-[2rem] border border-blue-500/20 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.18),_transparent_30%),linear-gradient(180deg,rgba(10,24,42,0.96),rgba(8,18,32,0.96))] p-6 shadow-[0_30px_80px_rgba(2,12,26,0.7)] md:p-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-blue-300">Profile</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Account Settings</h2>
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30"
            >
              Edit profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30"
              >
                Save changes
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-[1.5rem] border border-blue-500/20 bg-slate-950/60 p-5">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-2xl font-semibold text-white shadow-lg shadow-blue-500/30">
              {user.full_name.charAt(0).toUpperCase()}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workspace</p>
              <h3 className="text-xl font-semibold text-white">{user.full_name}</h3>
              <p className="text-sm text-slate-300">{user.organization}</p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Status</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-emerald-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Supabase Auth Ready
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {isEditing ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <label className="mb-2 block text-sm text-slate-300">Full Name</label>
                  <input
                    value={formData.full_name}
                    onChange={(event) => setFormData((current) => ({ ...current, full_name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <label className="mb-2 block text-sm text-slate-300">Email</label>
                  <input
                    value={formData.email}
                    disabled
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-400"
                  />
                </div>

                <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <label className="mb-2 block text-sm text-slate-300">Organization</label>
                  <input
                    value={formData.organization}
                    onChange={(event) => setFormData((current) => ({ ...current, organization: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <InfoBlock label="Full Name" value={user.full_name} />
                <InfoBlock label="Email" value={user.email} />
                <InfoBlock label="Organization" value={user.organization} />
                <InfoBlock label="Authentication" value="Supabase Auth Ready" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthScreen({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  fullName,
  setFullName,
  authError,
  authMessage,
  authLoading,
  onSubmit,
  onResetPassword,
}: {
  authMode: 'sign-in' | 'sign-up'
  setAuthMode: (mode: 'sign-in' | 'sign-up') => void
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  showPassword: boolean
  setShowPassword: (value: boolean) => void
  fullName: string
  setFullName: (value: string) => void
  authError: string
  authMessage: string
  authLoading: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
  onResetPassword: () => Promise<void>
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.25),_transparent_28%),linear-gradient(180deg,#020817_0%,#0f172a_100%)] px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/80 shadow-2xl shadow-blue-950/40 backdrop-blur-xl">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-500/10 via-violet-500/5 to-cyan-500/10 p-8 md:p-10">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 shadow-lg shadow-blue-500/40">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <p className="text-xs uppercase tracking-[0.32em] text-blue-300">Supabase authentication</p>
              <h2 className="mt-4 text-4xl font-semibold text-white md:text-5xl">Welcome to SatQuery AI</h2>
            </div>

          </div>

          <div className="p-8 md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-slate-700 bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setAuthMode('sign-in')}
                className={`rounded-full px-4 py-2 text-sm ${authMode === 'sign-in' ? 'bg-white text-slate-950' : 'text-slate-300'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('sign-up')}
                className={`rounded-full px-4 py-2 text-sm ${authMode === 'sign-up' ? 'bg-white text-slate-950' : 'text-slate-300'}`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {authMode === 'sign-up' && (
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Full name</label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pr-11 text-sm outline-none focus:border-blue-500"
                    placeholder=""
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{authError}</div>
              )}

              {authMessage && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{authMessage}</div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {authLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {authLoading ? 'Please wait...' : authMode === 'sign-in' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => void onResetPassword()}
              className="mt-4 text-sm text-blue-300 underline underline-offset-4"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="panel flex items-center justify-between p-4">
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
        {icon}
      </div>
    </div>
  )
}

function ResultCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="panel">
      <div className="mb-3 flex items-center gap-2 text-slate-300">
        {icon}
        <span className="text-sm">{title}</span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function ProgressLine({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' }) {
  const colorClass = tone === 'blue' ? 'from-blue-500 to-cyan-400' : 'from-emerald-500 to-lime-400'

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div className={`h-full rounded-full bg-gradient-to-r ${colorClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-200">{value}</p>
    </div>
  )
}

export default App
