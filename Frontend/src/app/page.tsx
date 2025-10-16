"use client"

import { useState, type FormEvent } from "react"
import useSWR from "swr"
import axios from "axios"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EditIcon, TrashIcon, SaveIcon, XIcon } from "lucide-react"

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

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<Event & { priceDisplay?: string }>>({})

  const createEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
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
    } catch (err) {
      console.error("Create failed:", err)
      alert("Failed to create event. Check console for details.")
    }
  }

  const deleteEvent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return
    try {
      await axios.delete(`${API}/events/${id}`)
      mutate()
    } catch (err) {
      console.error("Delete failed:", err)
      alert("Failed to delete event. Check console.")
    }
  }

  const startEditing = (event: Event) => {
    setEditingId(event.id)
    setEditValues({
      title: event.title,
      date: event.date, // should be ISO YYYY-MM-DD (FastAPI accepts this)
      capacity: event.capacity,
      ticket_price_cents: event.ticket_price_cents ?? 0,
      // priceDisplay is just for showing rupee decimal in input
      priceDisplay: ((event.ticket_price_cents ?? 0) / 100).toFixed(2),
    })
  }

  const saveEdit = async (id: number) => {
    try {
      // Build payload only with valid/changed values
      const payload: any = {}
      if (editValues.title !== undefined) payload.title = String(editValues.title).trim()

      // Date must be non-empty string in YYYY-MM-DD format
      if (editValues.date) {
        // basic check (FastAPI will enforce properly)
        payload.date = String(editValues.date)
      }

      if (editValues.capacity !== undefined) {
        const capNum = Number(editValues.capacity)
        if (Number.isNaN(capNum) || !Number.isFinite(capNum)) {
          alert("Capacity must be a valid number")
          return
        }
        payload.capacity = Math.trunc(capNum)
      }

      if (editValues.ticket_price_cents !== undefined) {
        const centsNum = Number(editValues.ticket_price_cents)
        if (Number.isNaN(centsNum) || !Number.isFinite(centsNum)) {
          alert("Price must be a valid number")
          return
        }
        payload.ticket_price_cents = Math.trunc(centsNum)
      }

      // If payload is empty, nothing to do
      if (Object.keys(payload).length === 0) {
        setEditingId(null)
        return
      }

      // If user decreased capacity below tickets_sold, warn before sending
      const currentEvent = events?.find((ev) => ev.id === id)
      if (currentEvent && payload.capacity !== undefined) {
        if (payload.capacity < currentEvent.tickets_sold) {
          alert(
            `Capacity cannot be less than tickets already sold (${currentEvent.tickets_sold}).`
          )
          return
        }
      }

      payload.location = "";
      payload.description = "";

      await axios.put(`${API}/events/${id}`, payload)
      setEditingId(null)
      mutate()
    } catch (err: any) {
      console.error("Save failed:", err)
      if (err?.response?.status === 422) {
        // FastAPI validation error: show details if available
        const detail = err.response?.data ?? err.response?.data?.detail
        alert("Validation error (422). Check server console or details: " + JSON.stringify(detail))
      } else if (err?.response?.status === 400) {
        alert("Bad request: " + (err.response?.data?.detail ?? "check input"))
      } else {
        alert("Update failed. See console for details.")
      }
    }
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
                      <th className="p-3 text-left">Price (₹)</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events?.map((e) => {
                      const available = Math.max(e.capacity - e.tickets_sold, 0)
                      const isEditing = editingId === e.id
                      const ticketPrice = (e.ticket_price_cents || 0) / 100
                      return (
                        <tr key={e.id} className="border-t border-border">
                          <td className="p-3">
                            {isEditing ? (
                              <Input
                                value={editValues.title ?? ""}
                                onChange={(ev) => setEditValues((v) => ({ ...v, title: ev.target.value }))}
                              />
                            ) : (
                              e.title
                            )}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editValues.date ?? ""}
                                onChange={(ev) => setEditValues((v) => ({ ...v, date: ev.target.value }))}
                              />
                            ) : (
                              e.date
                            )}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <Input
                                type="number"
                                min={0}
                                value={String(editValues.capacity ?? e.capacity)}
                                onChange={(ev) =>
                                  setEditValues((v) => ({ ...v, capacity: ev.target.value === "" ? "" : Number(ev.target.value) }))
                                }
                              />
                            ) : (
                              e.capacity
                            )}
                          </td>
                          <td className="p-3">{e.tickets_sold}</td>
                          <td className="p-3">{available}</td>
                          <td className="p-3">
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={editValues.priceDisplay ?? ticketPrice.toFixed(2)}
                                onChange={(ev) => {
                                  const val = ev.target.value
                                  // Update both display and cents
                                  setEditValues((v) => ({
                                    ...v,
                                    priceDisplay: val,
                                    ticket_price_cents: val === "" ? undefined : Math.round(Number(val) * 100),
                                  }))
                                }}
                              />
                            ) : (
                              ticketPrice.toFixed(2)
                            )}
                          </td>
                          <td className="p-3 flex gap-2 items-center justify-center">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="inline-flex gap-2 cursor-pointer"
                                  onClick={() => saveEdit(e.id)}
                                >
                                  <SaveIcon className="text-gray-500" /> Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="inline-flex gap-2 cursor-pointer"
                                  onClick={() => setEditingId(null)}
                                >
                                  <XIcon className="text-gray-500" /> Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button asChild size="sm" variant="secondary">
                                  <Link href={`/events/${e.id}`}>Manage</Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="inline-flex gap-2 cursor-pointer"
                                  onClick={() => startEditing(e)}
                                >
                                  <EditIcon className="text-gray-500" /> Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="inline-flex gap-2 cursor-pointer"
                                  onClick={() => deleteEvent(e.id)}
                                >
                                  <TrashIcon className="text-gray-500" /> Delete
                                </Button>
                              </>
                            )}
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
