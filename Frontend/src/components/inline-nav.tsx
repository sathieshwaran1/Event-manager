"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

interface InlineNavProps {
  backHref?: string
  backLabel?: string
  nextHref?: string
  nextLabel?: string
}

export function InlineNav({ backHref, backLabel = "Back", nextHref, nextLabel = "Next" }: InlineNavProps) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <div>
        {backHref ? (
          <Button asChild variant="outline">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        ) : (
          <span />
        )}
      </div>
      <div>
        {nextHref ? (
          <Button asChild>
            <Link href={nextHref}>{nextLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
