import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

const STORAGE_KEY = 'mewseum_found_cats'

interface CatProgressContextValue {
  foundCats: Set<string>
  findCat: (id: string) => void
  isCatFound: (id: string) => boolean
  foundCount: number
}

const CatProgressContext = createContext<CatProgressContextValue | null>(null)

function loadFoundCats(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return new Set(parsed as string[])
  } catch {
    // corrupted storage — start fresh
  }
  return new Set()
}

function saveFoundCats(cats: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...cats]))
}

export function CatProgressProvider({ children }: { children: ReactNode }) {
  const [foundCats, setFoundCats] = useState<Set<string>>(loadFoundCats)

  const findCat = useCallback((id: string) => {
    setFoundCats(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveFoundCats(next)
      return next
    })
  }, [])

  const isCatFound = useCallback(
    (id: string) => foundCats.has(id),
    [foundCats],
  )

  return (
    <CatProgressContext.Provider
      value={{ foundCats, findCat, isCatFound, foundCount: foundCats.size }}
    >
      {children}
    </CatProgressContext.Provider>
  )
}

export function useCatProgress(): CatProgressContextValue {
  const ctx = useContext(CatProgressContext)
  if (!ctx) throw new Error('useCatProgress must be used within CatProgressProvider')
  return ctx
}
