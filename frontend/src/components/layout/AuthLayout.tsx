interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[440px] xl:w-[480px] flex-col justify-between bg-brand-sidebar p-10 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-32 -right-10 w-48 h-48 rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/[0.04]" />
        <div className="absolute bottom-24 right-10 w-32 h-32 rounded-full bg-white/[0.06]" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 bg-brand/20 border border-white/20 rounded-lg flex items-center justify-center">
              <PortalIcon />
            </div>
            <span className="text-white/70 text-sm font-medium tracking-wide">IT 업무요청 포털</span>
          </div>

          <h1 className="text-white text-3xl font-bold leading-snug mb-4">
            팀의 업무를<br />한 곳에서 관리하세요
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            업무 요청부터 개발, 테스트, 배포까지<br />전체 개발 사이클을 추적합니다.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-4">
          {FEATURES.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="mt-0.5 w-4 h-4 rounded-full border border-white/30 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-brand" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{item.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-white/25 text-xs">
          © 2026 IT 업무요청 포털
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-brand-sidebar rounded-lg flex items-center justify-center">
              <PortalIcon />
            </div>
            <span className="text-brand-sidebar font-semibold text-sm">IT 업무요청 포털</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  { label: '업무 요청 관리', desc: '접수부터 완료까지 실시간 추적' },
  { label: '개발 사이클', desc: '계획서, 테스트, 배포 이력 관리' },
  { label: '팀 협업', desc: '회의록, 지식 베이스, 공유 리소스' },
]

function PortalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="11" height="13" rx="1.5" stroke="white" strokeWidth="1.4" />
      <rect x="5" y="2" width="11" height="13" rx="1.5" stroke="white" strokeWidth="1.4" strokeOpacity="0.5" />
      <line x1="5" y1="8" x2="10" y2="8" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="5" y1="11" x2="10" y2="11" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
