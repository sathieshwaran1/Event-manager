"use client"

import { useState, type FormEvent, type ChangeEvent } from "react"
import axios from "axios"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { InlineNav } from "@/components/inline-nav"

const API = "http://localhost:8000"

interface ImportResponse {
  created: string[]
  errors: string[]
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState("")

  const upload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) return

    const form = new FormData()
    form.append("file", file)

    const res = await axios.post<ImportResponse>(`${API}/import/events`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    setMessage(`Created ${res.data.created.length}, errors ${res.data.errors.length}`)
  }

  return (
    <main className="dark mx-auto w-full max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-pretty">Import Events (CSV)</CardTitle>
        </CardHeader>
        <form onSubmit={upload}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="csv">Choose CSV file</Label>
              <Input
                id="csv"
                type="file"
                accept=".csv"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-sm text-muted-foreground">
                The CSV should include columns like title, date, location, capacity, ticket_price_cents.
              </p>
            </div>
            {message && (
              <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
                {message}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <Button type="submit">Upload</Button>
          </CardFooter>
        </form>
      </Card>

    </main>
  )
}
