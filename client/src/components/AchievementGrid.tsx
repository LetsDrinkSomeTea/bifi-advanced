import { Lock } from 'lucide-react'
import { ACHIEVEMENTS } from '@shared/achievements'
import type { AchievementKey } from '@shared/types'
import { cn } from '../lib/utils'

interface AchievementGridProps {
  unlocked: AchievementKey[]
}

export function AchievementGrid({ unlocked }: AchievementGridProps) {
  const unlockedSet = new Set(unlocked)

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Achievements
      </h2>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {Object.values(ACHIEVEMENTS).map((def) => {
          const isUnlocked = unlockedSet.has(def.key as AchievementKey)
          const isHidden = def.hidden && !isUnlocked

          return (
            <div
              key={def.key}
              title={isHidden ? '???' : isUnlocked ? `${def.name}: ${def.description}` : `${def.name} (gesperrt)`}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-xl border text-center',
                isUnlocked
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-border bg-muted/30 opacity-50',
              )}
            >
              <span className="text-2xl leading-none">
                {isHidden ? '🔒' : def.icon}
              </span>
              <span className={cn('text-[10px] leading-tight font-medium line-clamp-2', !isUnlocked && 'text-muted-foreground')}>
                {isHidden ? '???' : def.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
