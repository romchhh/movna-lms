interface AppSplashProps {
  label?: string
  fullScreen?: boolean
}

/** Brand splash — Movna mark on white during boot / route loading. */
export function AppSplash({
  label = 'Завантаження…',
  fullScreen = true,
}: AppSplashProps) {
  return (
    <div
      className={`movna-splash${fullScreen ? ' movna-splash--screen' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="movna-splash-card">
        <div className="movna-splash-logo-wrap">
          <img
            src="/branding/movna-logo.svg"
            alt="Movna"
            width={157}
            height={36}
            className="movna-splash-logo"
          />
        </div>
        <div className="movna-splash-bar" aria-hidden>
          <span />
        </div>
        <p className="movna-splash-label">{label}</p>
      </div>
    </div>
  )
}
