/**
 * Word-level diff for the revision history viewer (SPEC §8). Deliberately
 * simple and modular — a richer algorithm can be swapped in later without
 * touching the UI.
 *
 * Produces a sequence of segments: unchanged words run together, while
 * removed and added words are marked so the UI can render them inline.
 */

export type DiffSegment =
  | { type: "same"; text: string }
  | { type: "removed"; text: string }
  | { type: "added"; text: string }

interface DiffOp {
  op: "same" | "removed" | "added"
  words: string[]
}

/** LCS table over word arrays, capped so pathological inputs stay bounded. */
const MAX_WORDS = 4000

export function diffWords(oldText: string, newText: string): DiffSegment[] {
  const a = oldText.split(/\s+/).filter(Boolean)
  const b = newText.split(/\s+/).filter(Boolean)

  if (a.length > MAX_WORDS || b.length > MAX_WORDS) {
    return [
      ...(oldText ? [{ type: "removed", text: oldText } as DiffSegment] : []),
      ...(newText ? [{ type: "added", text: newText } as DiffSegment] : []),
    ]
  }

  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  )
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        a[i] === b[j]
          ? (lcs[i + 1][j + 1] ?? 0) + 1
          : Math.max(lcs[i + 1][j] ?? 0, lcs[i][j + 1] ?? 0)
    }
  }

  const ops: DiffOp[] = []
  let i = 0
  let j = 0
  const push = (op: DiffOp["op"], word: string) => {
    const last = ops[ops.length - 1]
    if (last && last.op === op) {
      last.words.push(word)
    } else {
      ops.push({ op, words: [word] })
    }
  }
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("same", a[i] ?? "")
      i += 1
      j += 1
    } else if ((lcs[i + 1][j] ?? 0) >= (lcs[i][j + 1] ?? 0)) {
      push("removed", a[i] ?? "")
      i += 1
    } else {
      push("added", b[j] ?? "")
      j += 1
    }
  }
  for (; i < a.length; i += 1) push("removed", a[i] ?? "")
  for (; j < b.length; j += 1) push("added", b[j] ?? "")

  return ops.map(({ op, words }) => ({
    type: op,
    text: words.join(" "),
  }))
}
