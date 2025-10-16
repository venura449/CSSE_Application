import React, { useMemo, useState } from "react";
import { Calendar as CalendarIcon, Clock, MapPin, Filter, X, PlusCircle, Upload, DollarSign, TrendingUp } from "lucide-react";
import { loadSchedules, saveSchedules, addSchedule as addScheduleToStore, removeScheduleById } from "../data/collectionsData";
import RouteMap from '../components/RouteMap';

export default function Collections() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [activeFilter, setActiveFilter] = useState({ recycling: true, general: true, organic: false, special: true });
  const [selectedDay, setSelectedDay] = useState(null);

  // Schedules state
  const [schedules, setSchedules] = useState(() => loadSchedules());

  // New schedule form state
  const [newType, setNewType] = useState("recycling");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  // Special pickup form state
  const [specialItem, setSpecialItem] = useState("Large Furniture");
  const [specialDate, setSpecialDate] = useState("");
  const [specialTime, setSpecialTime] = useState("");

  function addSchedule() {
    if (!newDate || !newTime) return;
    const [hourMinute, meridiem] = newTime.trim().split(" ");
    const [hStr, mStr] = (hourMinute || "").split(":");
    const hNum = parseInt(hStr || "0", 10);
    const mNum = parseInt(mStr || "0", 10);
    const d = new Date(newDate);
    if (meridiem && (meridiem.toLowerCase() === "pm") && hNum < 12) d.setHours(hNum + 12, mNum);
    else if (meridiem && (meridiem.toLowerCase() === "am") && hNum === 12) d.setHours(0, mNum);
    else d.setHours(hNum, mNum);

    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next = [...schedules, { id, date: d, type: newType, time: newTime, status: "Scheduled", location: "Default" }];
    setSchedules(next);
    saveSchedules(next);
    setNewDate("");
    setNewTime("");
  }

  function cancelSchedule(id) {
    // if authenticated, delete from backend
    const token = localStorage.getItem('token');
    if (token) {
      fetch((import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000') + `/api/schedules/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (!res.ok) throw new Error('Delete failed');
          const next = schedules.filter((s) => s.id !== id);
          setSchedules(next);
        }).catch(err => console.error(err));
    } else {
      const next = schedules.filter((s) => s.id !== id);
      setSchedules(next);
      saveSchedules(next);
    }
    setSelectedDay((prev) => {
      if (!prev) return prev;
      const remaining = prev.events.filter((e) => e.id !== id);
      if (remaining.length === 0) return null;
      return { ...prev, events: remaining };
    });
  }

  function requestSpecialPickup() {
    if (!specialDate) return;
    const t = specialTime || "10:00 AM";
    const [hourMinute, meridiem] = t.trim().split(" ");
    const [hStr, mStr] = (hourMinute || "").split(":");
    const hNum = parseInt(hStr || "0", 10);
    const mNum = parseInt(mStr || "0", 10);
    const d = new Date(specialDate);
    if (meridiem && (meridiem.toLowerCase() === "pm") && hNum < 12) d.setHours(hNum + 12, mNum);
    else if (meridiem && (meridiem.toLowerCase() === "am") && hNum === 12) d.setHours(0, mNum);
    else d.setHours(hNum, mNum);

    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const token = localStorage.getItem('token');
    const payload = { type: 'special', scheduled_at: d.toISOString(), time_label: t, meta: { item: specialItem }, location: null };
    if (token) {
      fetch((import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000') + '/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
        .then(res => res.json()).then(() => {
          // refresh schedules from backend
          loadRemote();
        }).catch(err => console.error(err));
    } else {
      const next = [...schedules, { id, date: d, type: "special", time: t, status: "Scheduled", meta: { item: specialItem }, location: 'Default' }];
      setSchedules(next);
      saveSchedules(next);
    }
    setSpecialDate("");
    setSpecialTime("");
  }

  async function loadRemote() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000') + '/api/schedules', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load');
      const items = await res.json();
      // convert date strings to Date
      const converted = items.map(i => ({ id: i.id, date: new Date(i.date), type: i.type, time: i.time || i.time_label || '', status: i.status, location: i.location }));
      setSchedules(converted);
    } catch (e) {
      console.error(e);
    }
  }

  // on mount, if authenticated fetch remote schedules
  React.useEffect(() => { if (localStorage.getItem('token')) loadRemote(); }, []);

  const daysInView = useMemo(() => {
    const start = new Date(currentMonth);
    const startDay = start.getDay(); // 0-6, Sun-Sat
    const firstCellDate = new Date(start);
    firstCellDate.setDate(1 - startDay);

    const gridDays = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(firstCellDate);
      d.setDate(firstCellDate.getDate() + i);
      gridDays.push(d);
    }
    return gridDays;
  }, [currentMonth]);

  const monthName = currentMonth.toLocaleString("default", { month: "long" });
  const year = currentMonth.getFullYear();

  const filteredSchedules = schedules.filter((s) => activeFilter[s.type]);

  function getScheduleForDate(date) {
    return filteredSchedules.filter(
      (s) => s.date.getFullYear() === date.getFullYear() && s.date.getMonth() === date.getMonth() && s.date.getDate() === date.getDate()
    );
  }

  const upcoming = filteredSchedules
    .filter((s) => s.date >= new Date(year, currentMonth.getMonth(), 1))
    .sort((a, b) => a.date - b.date)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-1 p-8 gap-6">
        {/* Left Pane: Upcoming + Filters */}
        <aside className="w-72 bg-white p-6 rounded-xl shadow-inner h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Upcoming Collections</h3>
            <button className="text-green-600 text-sm">View All</button>
          </div>

          <div className="space-y-4">
            {upcoming.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-2xl font-bold">{item.date.getDate()}</div>
                    <div className="text-xs text-gray-500">
                      {item.date.toLocaleDateString(undefined, { weekday: "long", month: "short" })}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${item.status === "Confirmed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {item.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${item.type === "recycling" ? "bg-green-500" : item.type === "general" ? "bg-blue-500" : item.type === "organic" ? "bg-orange-500" : "bg-purple-500"}`}></span>
                  <span className="capitalize">{item.type} waste</span>
                  <Clock size={14} className="text-gray-400 ml-auto" />
                  <span className="text-gray-600">{item.time}</span>
                </div>
                <div className="mt-3 flex gap-2 text-xs">
                  <button className="px-3 py-1 rounded-full bg-gray-100">Reschedule</button>
                  <button className="px-3 py-1 rounded-full bg-gray-100" onClick={() => setSelectedDay({ date: item.date, events: getScheduleForDate(item.date) })}>Details</button>
                  <button className="px-3 py-1 rounded-full bg-red-50 text-red-600" onClick={() => cancelSchedule(item.id)}>Cancel</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Filter size={16} /> Quick Filters</h4>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-green-600" checked={activeFilter.recycling} onChange={(e) => setActiveFilter((f) => ({ ...f, recycling: e.target.checked }))} />
                <span>Recycling</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-blue-600" checked={activeFilter.general} onChange={(e) => setActiveFilter((f) => ({ ...f, general: e.target.checked }))} />
                <span>General Waste</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-orange-500" checked={activeFilter.organic} onChange={(e) => setActiveFilter((f) => ({ ...f, organic: e.target.checked }))} />
                <span>Organic</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-purple-600" checked={activeFilter.special} onChange={(e) => setActiveFilter((f) => ({ ...f, special: e.target.checked }))} />
                <span>Special Pickup</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Center: Calendar */}
        <main className="flex-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{monthName} {year}</h2>
                <div className="text-sm text-gray-500">Month</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-gray-700" onClick={() => setCurrentMonth(new Date(year, currentMonth.getMonth() - 1, 1))}>Prev</button>
                <button className="px-3 py-1 rounded-full bg-green-600 text-white" onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button>
                <button className="px-3 py-1 text-gray-700" onClick={() => setCurrentMonth(new Date(year, currentMonth.getMonth() + 1, 1))}>Next</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-sm text-gray-500 mb-2">
              {"Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",").map((d) => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {daysInView.map((date, idx) => {
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                const isToday = date.toDateString() === today.toDateString();
                const events = getScheduleForDate(date);
                const hasEvent = events.length > 0;
                return (
                  <button
                    key={idx}
                    onClick={() => hasEvent && setSelectedDay({ date, events })}
                    className={`relative h-24 rounded-lg border p-2 text-left ${isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400"} ${hasEvent ? "hover:border-green-400" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`text-sm ${isToday ? "font-bold text-green-700" : ""}`}>{date.getDate()}</div>
                      {hasEvent && <CalendarIcon size={14} className="text-green-500" />}
                    </div>
                    <div className="mt-2 space-y-1">
                      {events.slice(0, 2).map((ev, i) => (
                        <div key={i} className={`text-xs px-2 py-1 rounded-full w-fit ${ev.type === "recycling" ? "bg-green-100 text-green-700" : ev.type === "general" ? "bg-blue-100 text-blue-700" : ev.type === "organic" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"}`}>
                          {ev.type === "recycling" ? "Recycling" : ev.type === "general" ? "General" : ev.type === "organic" ? "Organic" : "Special"}
                        </div>
                      ))}
                      {events.length > 2 && <div className="text-xs text-gray-400">+{events.length - 2} more</div>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-6 text-sm mt-4">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Recycling</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> General Waste</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span> Organic</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Special Pickup</div>
              <button className="ml-auto text-green-600 text-sm">Export Schedule</button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-2">Today's Route</h3>
            <div className="rounded-lg border overflow-auto max-h-[420px]">
              <div className="min-w-[640px] min-h-[360px] p-2">
                <RouteMap events={schedules.filter(s => {
                  const today = new Date();
                  return s.date.getFullYear() === today.getFullYear() && s.date.getMonth() === today.getMonth() && s.date.getDate() === today.getDate();
                })} />
              </div>
            </div>
          </div>
        </main>

        {/* Right Pane: Special Request + Analytics */}
        <aside className="w-80 space-y-6">
          {/* New Schedule Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-4">Schedule Pickup</h3>
            <div className="space-y-3 text-sm">
              <label className="block">
                <div className="text-gray-600 mb-1">Type</div>
                <select className="w-full border rounded-lg p-2" value={newType} onChange={(e) => setNewType(e.target.value)}>
                  <option value="recycling">Recycling</option>
                  <option value="general">General Waste</option>
                  <option value="organic">Organic</option>
                </select>
              </label>
              <label className="block">
                <div className="text-gray-600 mb-1">Date</div>
                <input type="date" className="w-full border rounded-lg p-2" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </label>
              <label className="block">
                <div className="text-gray-600 mb-1">Time</div>
                <input type="text" placeholder="e.g. 9:00 AM" className="w-full border rounded-lg p-2" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </label>
              <button className="w-full bg-green-600 text-white py-2 rounded-lg mt-2" onClick={addSchedule}>Add Schedule</button>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-4">Special Collection Request</h3>
            <div className="space-y-3 text-sm">
              <label className="block">
                <div className="text-gray-600 mb-1">Item Type</div>
                <select className="w-full border rounded-lg p-2" value={specialItem} onChange={(e) => setSpecialItem(e.target.value)}>
                  <option value="Large Furniture">Large Furniture</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Yard Waste">Yard Waste</option>
                </select>
              </label>
              <label className="block">
                <div className="text-gray-600 mb-1">Preferred Date</div>
                <input type="date" className="w-full border rounded-lg p-2" value={specialDate} onChange={(e) => setSpecialDate(e.target.value)} />
              </label>
              <label className="block">
                <div className="text-gray-600 mb-1">Preferred Time</div>
                <input type="text" placeholder="e.g. 11:30 AM" className="w-full border rounded-lg p-2" value={specialTime} onChange={(e) => setSpecialTime(e.target.value)} />
              </label>
              <label className="block">
                <div className="text-gray-600 mb-1">Item Photos</div>
                <div className="border rounded-lg p-4 text-center text-gray-500">
                  <Upload className="inline mr-2" size={16} /> Drop files or click to upload
                </div>
              </label>
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-gray-600">Estimated Cost</div>
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-md">$45.00</div>
              </div>
              <button className="w-full bg-green-600 text-white py-2 rounded-lg mt-2 flex items-center justify-center gap-2" onClick={requestSpecialPickup}>
                <PlusCircle size={18} /> Request Pickup
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3">Analytics</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500">This Month</div>
                  <div className="text-xl font-bold">8 Pickups</div>
                  <div className="text-gray-500">$156.00 total</div>
                </div>
                <div className="text-green-600 flex items-center gap-1"><TrendingUp size={16} /> +12%</div>
              </div>
              <div className="pt-3 border-t">
                <div className="text-gray-500">CO₂ Saved</div>
                <div className="text-xl font-bold">24.5 lbs</div>
                <div className="text-gray-500">vs. landfill disposal</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal for Selected Day */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50" onClick={() => setSelectedDay(null)}>
          <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Scheduled Collections - {selectedDay.date.toLocaleDateString()}</h3>
              <button onClick={() => setSelectedDay(null)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {selectedDay.events.map((ev) => (
                <div key={ev.id} className="border rounded-lg p-3 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${ev.type === "recycling" ? "bg-green-500" : ev.type === "general" ? "bg-blue-500" : ev.type === "organic" ? "bg-orange-500" : "bg-purple-500"}`}></span>
                  <div className="flex-1">
                    <div className="font-medium capitalize">{ev.type === "special" ? `Special Pickup${ev.meta?.item ? ` • ${ev.meta.item}` : ""}` : `${ev.type} waste`}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2"><Clock size={14} /> {ev.time}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${ev.status === "Confirmed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{ev.status}</span>
                  <button className="ml-2 text-xs px-2 py-1 rounded bg-red-50 text-red-600" onClick={() => cancelSchedule(ev.id)}>Cancel</button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={16} /> Default pickup location
            </div>
            <div className="mt-4 flex gap-2">
              <button className="px-4 py-2 rounded-lg bg-gray-100">Reschedule</button>
              <button className="px-4 py-2 rounded-lg bg-green-600 text-white">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-gray-400 py-4 text-sm border-t bg-white">© 2025 EcoTrack</footer>
    </div>
  );
}


