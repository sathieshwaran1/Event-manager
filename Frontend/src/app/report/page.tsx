"use client"

import { useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InlineNav } from "@/components/inline-nav"

const API = "http://localhost:8000"

interface SalesReport {
  event_id: number
  title: string
  tickets_sold: number
  tickets_available: number
  revenue_cents: number
}

interface ReportResponse {
  report: SalesReport[]
}

export default function ReportPage() {
  const [report, setReport] = useState<SalesReport[] | null>(null)

  async function load() {
    const res = await axios.get<ReportResponse>(`${API}/reports/sales`)
    setReport(res.data.report)
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-pretty">Sales Report</CardTitle>
          <Button onClick={load}>Generate Report</Button>
        </CardHeader>
        <CardContent>
          {!report ? (
            <p className="text-muted-foreground">Click “Generate Report” to load the latest numbers.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="p-3 text-left">Event</th>
                    <th className="p-3 text-left">Tickets Sold</th>
                    <th className="p-3 text-left">Available</th>
                    <th className="p-3 text-left">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((r) => (
                    <tr key={r.event_id} className="border-t border-border">
                      <td className="p-3">{r.title}</td>
                      <td className="p-3">{r.tickets_sold}</td>
                      <td className="p-3">{r.tickets_available}</td>
                      <td className="p-3">₹{(r.revenue_cents / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>


    </main>
  )
}
