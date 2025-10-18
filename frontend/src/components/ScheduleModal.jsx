import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { addSchedule as addScheduleToStore } from "../data/collectionsData";
import L from "leaflet";

export default function ScheduleModal({
  defaultType = "recycling",
  onClose,
  onAdded,
}) {
  const [type, setType] = useState(defaultType);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00 AM");
  const [location, setLocation] = useState(null); // {lat, lng}
  const mapEl = useRef(null);
  const markerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // Initialize map
    if (!mapEl.current) return;
    const defaultCenter = [6.9271, 79.8612];
    const map = L.map(mapEl.current).setView(defaultCenter, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    map.on("click", function (e) {
      const { lat, lng } = e.latlng;
      setLocation({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.marker(e.latlng).addTo(map);
      }
    });
    mapInstanceRef.current = map;

    // try to center map on geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        map.setView([lat, lng], 13);
      });
    }

    return () => {
      map.remove();
    };
  }, []);

  async function handleAdd() {
    if (!date || !time) return;
    const [hourMinute, meridiem] = time.trim().split(" ");
    const [hStr, mStr] = (hourMinute || "").split(":");
    const hNum = parseInt(hStr || "0", 10);
    const mNum = parseInt(mStr || "0", 10);
    const d = new Date(date);
    if (meridiem && meridiem.toLowerCase() === "pm" && hNum < 12)
      d.setHours(hNum + 12, mNum);
    else if (meridiem && meridiem.toLowerCase() === "am" && hNum === 12)
      d.setHours(0, mNum);
    else d.setHours(hNum, mNum);

    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const schedule = { id, date: d, type, time, status: "Scheduled", location };
    try {
      // if user is authenticated, POST to backend
      const token = localStorage.getItem("token");
      if (token) {
        const res = await fetch(
          (import.meta.env.VITE_API_URL || "http://127.0.0.1:3000") +
            "/api/schedules",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              type,
              scheduled_at: d.toISOString(),
              time_label: time,
              location: location
                ? { lat: location.lat, lng: location.lng }
                : null,
            }),
          }
        );
        if (!res.ok) throw new Error("Failed to save schedule");
        if (onAdded) onAdded();
      } else {
        const next = addScheduleToStore(schedule);
        if (onAdded) onAdded(next);
      }
    } catch (e) {
      console.error(e);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg p-6 w-full max-w-2xl z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Schedule Collection</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="block">
              <div className="text-gray-600 mb-1">Type</div>
              <select
                className="w-full border rounded-lg p-2"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="recycling">Recycling</option>
                <option value="general">General Waste</option>
                <option value="organic">Organic</option>
              </select>
            </label>
            <label className="block">
              <div className="text-gray-600 mb-1">Date</div>
              <input
                type="date"
                className="w-full border rounded-lg p-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <div className="text-xs text-gray-400 mt-1">
                Date — select a date (YYYY-MM-DD)
              </div>
            </label>
            <label className="block">
              <div className="text-gray-600 mb-1">Time</div>
              <input
                type="text"
                className="w-full border rounded-lg p-2"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
              <div className="text-xs text-gray-400 mt-1">
                Time — label like "9:00 AM" or "14:00"
              </div>
            </label>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={handleAdd}
              >
                Add
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-100"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
          <div>
            <div className="text-gray-600 mb-2">
              Click map to pick pickup location
            </div>
            <div ref={mapEl} className="h-64 rounded overflow-hidden" />
            <div className="text-xs text-gray-500 mt-2">
              Selected:{" "}
              {location
                ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                : "None"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
