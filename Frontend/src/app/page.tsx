"use client"

import { useState, type FormEvent } from "react"
import useSWR from "swr"
import axios from "axios"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InlineNav } from "@/components/inline-nav"

const API = "http://localhost:8000"
const fetcher = (url: string) => axios.get(url).then((r) => r.data)

interface Event {
  id: number
  title: string
  date: string
  description?: string
  location?: string
  capacity: number
  tickets_sold: number
  ticket_price_cents?: number
}

export default function HomePage() {
  const { data: events, isLoading, mutate } = useSWR<Event[]>(`${API}/events`, fetcher)
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [capacity, setCapacity] = useState<number>(50)
  const [price, setPrice] = useState<string>("0.00")

  const createEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await axios.post(`${API}/events`, {
      title,
      date,
      description: "",
      location: "",
      capacity: Number(capacity),
      ticket_price_cents: Math.round(Number(price) * 100),
    })
    setTitle("")
    setDate("")
    setCapacity(50)
    setPrice("0.00")
    mutate()
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">Create New Event</CardTitle>
          </CardHeader>
          <form onSubmit={createEvent}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Tech Conference 2026"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Ticket Price (₹)</Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end mt-6">
              <Button type="submit">Create Event</Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/upload">Upload Events CSV</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/report">View Sales Report</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading events…</p>
            ) : (events?.length ?? 0) === 0 ? (
              <p>No events yet. Create your first event above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted text-muted-foreground">
                      <th className="p-3 text-left">Title</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Capacity</th>
                      <th className="p-3 text-left">Sold</th>
                      <th className="p-3 text-left">Available</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events?.map((e) => {
                      const available = Math.max(e.capacity - e.tickets_sold, 0)
                      return (
                        <tr key={e.id} className="border-t border-border">
                          <td className="p-3">{e.title}</td>
                          <td className="p-3">{e.date}</td>
                          <td className="p-3">{e.capacity}</td>
                          <td className="p-3">{e.tickets_sold}</td>
                          <td className="p-3">{available}</td>
                          <td className="p-3">
                            <Button asChild size="sm" variant="secondary">
                              <Link href={`/events/${e.id}`}>Manage</Link>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
