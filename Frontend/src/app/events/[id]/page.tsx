
"use client"

import type React from "react"

import useSWR from "swr"
import axios from "axios"
import { useParams } from "next/navigation"
import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { InlineNav } from "@/components/inline-nav"

const API = "http://localhost:8000"
const fetcher = (url: string) => axios.get(url).then((r) => r.data)

interface Event {
  id: number
  title: string
  date: string
  location: string
  capacity: number
  tickets_sold: number
}

interface Attendee {
  id: number
  name: string
  email: string
}

export default function EventDetail() {
  const params = useParams()
  const id = params?.id as string

  const { data: event, mutate: mutateEvent } = useSWR<Event>(id ? `${API}/events/${id}` : null, fetcher)
  const { data: attendees, mutate: mutateAttendees } = useSWR<Attendee[]>(
    id ? `${API}/events/${id}/attendees` : null,
    fetcher,
  )

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name || !email) return
    await axios.post(`${API}/events/${id}/attendees`, { name, email })
    setName("")
    setEmail("")
    mutateAttendees()
    mutateEvent()
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      {event && (
        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">{event.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-1">
              <p>
                <span className="text-muted-foreground">Date:</span> {event.date}
              </p>
              <p>
                <span className="text-muted-foreground">Location:</span> {event.location}
              </p>
              <p>
                <span className="text-muted-foreground">Capacity:</span> {event.capacity}{" "}
                <span className="text-muted-foreground">| Sold:</span> {event.tickets_sold}
              </p>
            </div>

            <form onSubmit={register} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="attendee-name">Attendee Name</Label>
                <Input
                  id="attendee-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attendee-email">Attendee Email</Label>
                <Input
                  id="attendee-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Register Attendee</Button>
              </div>
            </form>

            <div className="grid gap-2">
              <h2 className="text-lg font-semibold">Attendees</h2>
              {attendees && attendees.length > 0 ? (
                <ul className="grid gap-2">
                  {attendees.map((a) => (
                    <li key={a.id} className="rounded-md border border-border p-3">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-sm text-muted-foreground">{a.email}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No attendees yet.</p>
              )}
            </div>
          </CardContent>

        </Card>
      )}
    </main>
  )
}
