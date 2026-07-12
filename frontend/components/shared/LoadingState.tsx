type LoadingVariant = 'inline' | 'block' | 'page'

interface LoadingStateProps {
  label?: string
  variant?: LoadingVariant
  rows?: number
}

function isLoadingCopy(label: string) {
  return /завантаж/i.test(label)
}

export function LoadingState({
  label = 'Завантаження…',
  variant = 'block',
  rows = 3,
}: LoadingStateProps) {
  const showBrand = variant !== 'inline'

  return (
    <div
      className={`movna-loading movna-loading--${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {showBrand && (
        <div className="movna-loading-mark" aria-hidden>
          <img src="/branding/little_logo.svg" alt="" width={48} height={30} />
          <span className="movna-loading-ring" />
        </div>
      )}

      {variant === 'inline' && (
        <span className="movna-loading-dot" aria-hidden />
      )}

      <p className="movna-loading-label">{label}</p>

      {variant !== 'inline' && (
        <div className="movna-loading-skeleton" aria-hidden>
          {Array.from({ length: Math.max(1, Math.min(rows, 5)) }, (_, i) => (
            <div
              key={i}
              className="movna-loading-bone"
              style={{ width: `${92 - i * 12}%`, animationDelay: `${i * 90}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function looksLikeLoadingLabel(label: string) {
  return isLoadingCopy(label)
}
