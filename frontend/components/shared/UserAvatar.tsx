'use client'

import { useLmsProfile } from '@/hooks/useLmsProfiles'
import { getCachedLmsProfile, personInitials } from '@/lib/profile-api'

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type UserAvatarKind = 'teacher' | 'student' | 'admin' | 'neutral'

interface UserAvatarProps {
  name: string
  optimateId?: string
  avatarUrl?: string
  size?: UserAvatarSize
  kind?: UserAvatarKind
  className?: string
  title?: string
}

export function UserAvatar({
  name,
  optimateId,
  avatarUrl,
  size = 'md',
  kind = 'neutral',
  className = '',
  title,
}: UserAvatarProps) {
  const { profile } = useLmsProfile(optimateId && !avatarUrl ? optimateId : undefined)
  const cached = optimateId ? getCachedLmsProfile(optimateId) : undefined
  const url = avatarUrl || profile?.avatar_url || cached?.avatar_url || ''
  const initials = personInitials(name || profile?.full_name || cached?.full_name || '?')

  return (
    <span
      className={`user-avatar user-avatar--${size} user-avatar--${kind}${url ? ' user-avatar--photo' : ''}${className ? ` ${className}` : ''}`}
      title={title ?? name}
      aria-hidden={!title}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" />
      ) : (
        <span className="user-avatar-initials">{initials}</span>
      )}
    </span>
  )
}

interface PersonInlineProps {
  name: string
  optimateId?: string
  avatarUrl?: string
  subtitle?: string
  size?: UserAvatarSize
  kind?: UserAvatarKind
  className?: string
}

export function PersonInline({
  name,
  optimateId,
  avatarUrl,
  subtitle,
  size = 'sm',
  kind = 'neutral',
  className = '',
}: PersonInlineProps) {
  return (
    <span className={`person-inline${className ? ` ${className}` : ''}`}>
      <UserAvatar name={name} optimateId={optimateId} avatarUrl={avatarUrl} size={size} kind={kind} />
      <span className="person-inline-text">
        <span className="person-inline-name">{name}</span>
        {subtitle && <span className="person-inline-sub">{subtitle}</span>}
      </span>
    </span>
  )
}

interface PersonRowProps {
  name: string
  optimateId?: string
  avatarUrl?: string
  subtitle?: React.ReactNode
  titleAddon?: React.ReactNode
  meta?: React.ReactNode
  kind?: UserAvatarKind
  onClick?: () => void
  className?: string
}

export function PersonRow({
  name,
  optimateId,
  avatarUrl,
  subtitle,
  titleAddon,
  meta,
  kind = 'neutral',
  onClick,
  className = '',
}: PersonRowProps) {
  const inner = (
    <>
      <UserAvatar name={name} optimateId={optimateId} avatarUrl={avatarUrl} size="lg" kind={kind} />
      <div className="person-row-body">
        <div className="person-row-title-line">
          <div className="person-row-title">{name}</div>
          {titleAddon}
        </div>
        {subtitle && <div className="person-row-sub">{subtitle}</div>}
      </div>
      {meta}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={`person-row person-row--button${className ? ` ${className}` : ''}`} onClick={onClick}>
        {inner}
      </button>
    )
  }

  return <div className={`person-row${className ? ` ${className}` : ''}`}>{inner}</div>
}

interface TeacherAboutBlockProps {
  optimateId?: string
  fallbackAbout?: string
  compact?: boolean
}

export function TeacherAboutBlock({ optimateId, fallbackAbout, compact = false }: TeacherAboutBlockProps) {
  const { profile } = useLmsProfile(optimateId)
  const about = (profile?.about_me || fallbackAbout || '').trim()
  if (!about) return null

  return (
    <div className={`teacher-about-block${compact ? ' teacher-about-block--compact' : ''}`}>
      {!compact && <div className="teacher-about-block-label">Про себе</div>}
      <p className="teacher-about-block-text">{about}</p>
    </div>
  )
}
