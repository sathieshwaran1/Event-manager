
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlmodel import SQLModel, Field, Session, create_engine, select
from typing import Optional, List
import csv
import io
from datetime import datetime, date
from pydantic import BaseModel, constr
from fastapi.middleware.cors import CORSMiddleware

DATABASE_URL = "sqlite:///./events.db"
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

app = FastAPI(title="Event Management API")



app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = ""
    date: date
    location: Optional[str] = ""
    capacity: int = 0
    tickets_sold: int = 0
    ticket_price_cents: int = 0  # store price as integer cents

class Attendee(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: constr(strip_whitespace=True)
    event_id: int


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    date: date
    location: Optional[str] = ""
    capacity: int = 0
    ticket_price_cents: int = 0

class EventUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    date: Optional[date]
    location: Optional[str]
    capacity: Optional[int]
    ticket_price_cents: Optional[int]

class AttendeeCreate(BaseModel):
    name: str
    email: constr(strip_whitespace=True)

# Initialize DB
def init_db():
    SQLModel.metadata.create_all(engine)

@app.on_event("startup")
def on_startup():
    init_db()

def get_session():
    return Session(engine)

@app.post("/events", response_model=Event)
def create_event(e: EventCreate):
    event = Event(
        title=e.title,
        description=e.description,
        date=e.date,
        location=e.location,
        capacity=e.capacity,
        tickets_sold=0,
        ticket_price_cents=e.ticket_price_cents,
    )
    with get_session() as s:
        s.add(event)
        s.commit()
        s.refresh(event)
    return event

@app.get("/events", response_model=List[Event])
def list_events(title: Optional[str] = None, date_from: Optional[date] = None, date_to: Optional[date] = None):
    with get_session() as s:
        q = select(Event)
        if title:
            q = q.where(Event.title.ilike(f"%{title}%"))
        if date_from:
            q = q.where(Event.date >= date_from)
        if date_to:
            q = q.where(Event.date <= date_to)
        events = s.exec(q).all()
        return events

@app.get("/events/{event_id}", response_model=Event)
def get_event(event_id: int):
    with get_session() as s:
        event = s.get(Event, event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        return event

@app.put("/events/{event_id}", response_model=Event)
def update_event(event_id: int, u: EventUpdate):
    with get_session() as s:
        event = s.get(Event, event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        update_data = u.dict(exclude_unset=True)
        for k, v in update_data.items():
            setattr(event, k, v)
        # Ensure tickets_sold <= capacity
        if event.tickets_sold > event.capacity:
            raise HTTPException(status_code=400, detail="capacity cannot be less than tickets sold")
        s.add(event)
        s.commit()
        s.refresh(event)
        return event

@app.delete("/events/{event_id}")
def delete_event(event_id: int):
    with get_session() as s:
        event = s.get(Event, event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        s.delete(event)
        s.commit()
    return JSONResponse({"ok": True})

# Attendee endpoints
@app.post("/events/{event_id}/attendees", response_model=Attendee)
def register_attendee(event_id: int, attendee: AttendeeCreate):
    with get_session() as s:
        event = s.get(Event, event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        if event.tickets_sold >= event.capacity:
            raise HTTPException(status_code=400, detail="Event is sold out")
        att = Attendee(name=attendee.name, email=attendee.email, event_id=event_id)
        s.add(att)
        # increment tickets_sold on registration: each registration reserves 1 ticket
        event.tickets_sold += 1
        s.add(event)
        s.commit()
        s.refresh(att)
        return att

@app.get("/events/{event_id}/attendees", response_model=List[Attendee])
def list_attendees(event_id: int):
    with get_session() as s:
        event = s.get(Event, event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        attendees = s.exec(select(Attendee).where(Attendee.event_id == event_id)).all()
        return attendees

@app.put("/attendees/{attendee_id}", response_model=Attendee)
def update_attendee(attendee_id: int, data: AttendeeCreate):
    with get_session() as s:
        att = s.get(Attendee, attendee_id)
        if not att:
            raise HTTPException(status_code=404, detail="Attendee not found")
        att.name = data.name
        att.email = data.email
        s.add(att)
        s.commit()
        s.refresh(att)
        return att

# Ticket purchase endpoint (alternative to register_attendee, for programmatic purchases)
@app.post("/events/{event_id}/purchase")
def purchase_ticket(event_id: int, buyer_name: str = Form(...), buyer_email: str = Form(...), quantity: int = Form(1)):
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be >= 1")
    with get_session() as s:
        event = s.get(Event, event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        if event.tickets_sold + quantity > event.capacity:
            raise HTTPException(status_code=400, detail="Not enough tickets available")
        # Create attendees for each ticket (simple model)
        for i in range(quantity):
            att = Attendee(name=buyer_name, email=buyer_email, event_id=event_id)
            s.add(att)
        event.tickets_sold += quantity
        s.add(event)
        s.commit()
        revenue_cents = quantity * event.ticket_price_cents
        return {"tickets_purchased": quantity, "revenue_cents": revenue_cents, "tickets_sold": event.tickets_sold}

# Sales report
@app.get("/reports/sales")
def sales_report():
    with get_session() as s:
        events = s.exec(select(Event)).all()
        report = []
        for e in events:
            revenue_cents = e.tickets_sold * e.ticket_price_cents
            available = max(e.capacity - e.tickets_sold, 0)
            report.append({
                "event_id": e.id,
                "title": e.title,
                "date": e.date.isoformat(),
                "capacity": e.capacity,
                "tickets_sold": e.tickets_sold,
                "tickets_available": available,
                "revenue_cents": revenue_cents
            })
        return {"report": report, "generated_at": datetime.utcnow().isoformat() + "Z"}

# CSV Import endpoint - multipart form upload
# CSV expected columns: Event Title, Description, Date (YYYY-MM-DD), Location, Capacity, TicketPrice (in cents or decimal)
@app.post("/import/events")
async def import_events(file: UploadFile = File(...)):
    contents = await file.read()
    text = contents.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(text))
    created = []
    errors = []
    with get_session() as s:
        for i, row in enumerate(reader, start=1):
            try:
                title = row.get("Event Title") or row.get("title") or row.get("Title")
                if not title:
                    raise ValueError("Missing title")
                desc = row.get("Description", "")
                date_str = row.get("Date") or row.get("date")
                d = date.fromisoformat(date_str)
                location = row.get("Location", "")
                capacity_raw = row.get("Capacity", "0").strip()
                capacity = int(float(capacity_raw))
                # Ticket price optional: accept "TicketPrice" as decimal in main currency e.g. 12.50
                tp_raw = row.get("TicketPrice") or row.get("Ticket Price") or row.get("ticket_price") or "0"
                tp_raw = tp_raw.strip()
                if tp_raw == "":
                    ticket_price_cents = 0
                else:
                    # handle decimals
                    if "." in tp_raw:
                        # convert to cents
                        ticket_price_cents = int(round(float(tp_raw) * 100))
                    else:
                        ticket_price_cents = int(tp_raw)
                ev = Event(title=title, description=desc, date=d, location=location, capacity=capacity, tickets_sold=0, ticket_price_cents=ticket_price_cents)
                s.add(ev)
                s.commit()
                s.refresh(ev)
                created.append({"row": i, "event_id": ev.id, "title": ev.title})
            except Exception as ex:
                errors.append({"row": i, "error": str(ex), "row_data": row})
    return {"created": created, "errors": errors}

# Root
@app.get("/")
def root():
    return {"message": "Event Management API"}
