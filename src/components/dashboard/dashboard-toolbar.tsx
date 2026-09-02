"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Star, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type DashboardViewMode = "notes" | "trash"
export type DashboardSort = "updated" | "created" | "title"

const SORT_OPTIONS = [
  { value: "updated", label: "Last updated" },
  { value: "created", label: "Date created" },
  { value: "title", label: "Title" },
] as const

/**
 * Search / sort / favorites / trash-controls for the dashboard. State lives
 * in the URL (searchParams) so views stay shareable and server-rendered.
 */
export function DashboardToolbar({
  view,
  sort,
  favoritesOnly,
}: {
  view: DashboardViewMode
  sort: DashboardSort
  favoritesOnly: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.get("q") ?? ""

  const [query, setQuery] = useState(currentQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    })
  }

  function handleSearchChange(value: string) {
    setQuery(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      pushParams((params) => {
        if (value) {
          params.set("q", value)
        } else {
          params.delete("q")
        }
      })
    }, 300)
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
        <Button
          variant={view === "notes" ? "secondary" : "ghost"}
          size="sm"
          render={
            <Link
              href={withParams(searchParams, { view: null })}
              scroll={false}
            />
          }
        >
          All notes
        </Button>
        <Button
          variant={view === "trash" ? "secondary" : "ghost"}
          size="sm"
          render={<Link href={withParams(searchParams, { view: "trash" })} scroll={false} />}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Trash
        </Button>
      </div>

      <Input
        type="search"
        placeholder="Search notes by title…"
        aria-label="Search notes by title"
        value={query}
        onChange={(event) => handleSearchChange(event.target.value)}
        className="w-full sm:max-w-xs"
      />

      {view === "notes" ? (
        <Button
          variant={favoritesOnly ? "secondary" : "outline"}
          size="sm"
          aria-pressed={favoritesOnly}
          onClick={() =>
            pushParams((params) => {
              if (favoritesOnly) {
                params.delete("fav")
              } else {
                params.set("fav", "1")
              }
            })
          }
        >
          <Star
            className="size-3.5"
            aria-hidden
            fill={favoritesOnly ? "currentColor" : "none"}
          />
          Favorites
        </Button>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <label htmlFor="dashboard-sort" className="text-sm text-muted-foreground">
          Sort
        </label>
        <Select
          value={sort}
          onValueChange={(value) => {
            const nextSort = (value ?? "updated") as DashboardSort
            pushParams((params) => {
              if (nextSort === "updated") {
                params.delete("sort")
              } else {
                params.set("sort", nextSort)
              }
            })
          }}
        >
          <SelectTrigger id="dashboard-sort" className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

/** Builds a dashboard href that keeps other params and swaps one. */
function withParams(
  searchParams: URLSearchParams,
  overrides: { view: string | null }
): string {
  const params = new URLSearchParams(searchParams.toString())
  if (overrides.view === null) {
    params.delete("view")
  } else {
    params.set("view", overrides.view)
  }
  const queryString = params.toString()
  return queryString ? `/dashboard?${queryString}` : "/dashboard"
}
