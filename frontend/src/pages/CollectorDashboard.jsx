import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Truck,
  Scale,
  Search,
  Filter,
  Clock,
} from "lucide-react";

function KpiCard({ label, value, icon, tone = "default" }) {
  const tones = {
    default: "bg-white",
    success: "bg-green-50",
    warning: "bg-yellow-50",
    danger: "bg-red-50",
  };
  return (
    <div className={`rounded-xl p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center gap-3">
        <div className="text-green-600">{icon}</div>
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function CollectorDashboard() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [route, setRoute] = useState("All Routes");
  const [status, setStatus] = useState("All Status");
  const [q, setQ] = useState("");
  const [collections, setCollections] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [isDemoSensors, setIsDemoSensors] = useState(false);
  const tickRef = useRef(null);
  const THRESHOLD = 85;

  function randomWithin(prev, idx) {
    const jitter = Math.max(1, Math.round(Math.random() * 6));
    const dir = idx % 2 ? 1 : 1;
    let next =
      prev +
      dir * jitter +
      (Math.random() > 0.8 ? Math.round(Math.random() * 3) : 0);
    if (next < 0) next = 0;
    if (next > 100) next = 100;
    return Math.round(next);
  }

  useEffect(() => {
    document.title = "Collector Dashboard - WasteTrack Pro";
  }, []);

  useEffect(() => {
    const sample = [
      {
        id: "BN001",
        location: "No 48/A,Samarahena Road",
        resident: "Venura's Family",
        status: "Collected",
        time: "08:45 AM",
        weightKg: 15.2,
        route: "Route 1",
      },
      {
        id: "BN002",
        location: "202,Dutugamunu Street",
        resident: "Nangi's Home",
        status: "Pending",
        time: "-",
        weightKg: null,
        route: "Route 1",
      },
      {
        id: "BN003",
        location: "34,Kaluthara Road",
        resident: "Gayasha's Residence",
        status: "Skipped",
        time: "09:15 AM",
        weightKg: 0,
        route: "Route 2",
      },
    ];
    setCollections(sample);
    setExceptions([
      {
        id: "ex1",
        type: "Failed Scan",
        binId: "BN004",
        note: "Device unable to read QR code at 22 Maple St",
        actions: ["Manual Entry", "Resolve"],
        time: "9:21 AM",
      },
      {
        id: "ex2",
        type: "Device Offline",
        binId: "Scanner Unit 4",
        note: "Lost connection at 9:32 AM",
        actions: ["Retry Sync", "Resolve"],
        time: "9:32 AM",
      },
    ]);
    (async () => {
      try {
        const res = await fetch(
          `${
            import.meta.env.VITE_API_URL || "http://127.0.0.1:3000"
          }/api/sensors`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (res.ok) {
          const json = await res.json();
          setSensors(Array.isArray(json) ? json : []);
          setIsDemoSensors(false);
        } else {
          throw new Error("no api");
        }
      } catch (_) {
        const ROADS = [
          "Maple Street",
          "Oak Avenue",
          "Pine Road",
          "River Drive",
          "Hillcrest Blvd",
          "Elm Lane",
          "Cedar Way",
          "Birch Street",
          "Willow Ave",
          "Sunset Road",
          "Highland Street",
          "Meadow Lane",
          "Parkside Ave",
          "Lakeshore Drive",
        ];
        const demo = Array.from({ length: 14 }).map((_, i) => ({
          id: `N-${String(i + 1).padStart(2, "0")}`,
          road: ROADS[i % ROADS.length],
          bin: Math.max(10, Math.round(Math.random() * 60 + i * 2)),
          updatedAt: Date.now() - Math.round(Math.random() * 60 * 60 * 1000),
          location: `${100 + i} ${ROADS[i % ROADS.length]}`,
        }));
        setSensors(demo);
        setIsDemoSensors(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isDemoSensors) return;
    tickRef.current = setInterval(() => {
      setSensors((prev) =>
        prev.map((n, idx) => ({
          ...n,
          bin: randomWithin(Number(n.bin || 0), idx),
          updatedAt: Date.now(),
        }))
      );
    }, 8000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isDemoSensors]);

  const filtered = useMemo(() => {
    return collections.filter(
      (c) =>
        (route === "All Routes" || c.route === route) &&
        (status === "All Status" || c.status === status) &&
        (q.trim() === "" ||
          (c.id + " " + c.location + " " + c.resident)
            .toLowerCase()
            .includes(q.toLowerCase()))
    );
  }, [collections, route, status, q]);

  const kpi = useMemo(() => {
    const today = filtered;
    const collected = today.filter((c) => c.status === "Collected");
    const pending = today.filter((c) => c.status === "Pending");
    const exceptionsCount = exceptions.length;
    const totalWeight = collected.reduce(
      (a, c) => a + Number(c.weightKg || 0),
      0
    );
    return {
      collected: collected.length,
      pending: pending.length,
      exceptions: exceptionsCount,
      totalWeight,
    };
  }, [filtered, exceptions]);

  const uniqueRoutes = useMemo(
    () => [
      "All Routes",
      ...Array.from(new Set(collections.map((c) => c.route))),
    ],
    [collections]
  );
  const uniqueStatuses = ["All Status", "Collected", "Pending", "Skipped"];
  const overfilledBins = useMemo(
    () => sensors.filter((s) => Number(s.bin) >= THRESHOLD),
    [sensors]
  );

  function schedulePickup(bin) {
    console.log("Schedule pickup for", bin.id);
    alert(`Schedule pickup requested for ${bin.id}`);
  }

  function resolveBin(bin) {
    console.log("Resolve overfill alert for", bin.id);
    alert(`Overfill alert resolved for ${bin.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-gray-500 text-sm">
              Daily overview for collectors
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Truck className="text-green-600" size={18} /> 3 devices online
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Clock size={16} /> {date}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Today's Collections"
            value={kpi.collected}
            icon={<CheckCircle2 />}
            tone="success"
          />
          <KpiCard
            label="Pending"
            value={kpi.pending}
            icon={<AlertTriangle />}
            tone="warning"
          />
          <KpiCard
            label="Exceptions"
            value={kpi.exceptions}
            icon={<AlertTriangle />}
            tone="danger"
          />
          <KpiCard
            label="Total Weight"
            value={`${kpi.totalWeight.toFixed(1)} kg`}
            icon={<Scale />}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 pr-3 py-2 border rounded-lg w-64"
              placeholder="Search by Bin ID or Resident..."
            />
          </div>
          <select
            className="border rounded-lg p-2"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
          >
            {uniqueRoutes.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select
            className="border rounded-lg p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {uniqueStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            type="date"
            className="border rounded-lg p-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="ml-auto px-3 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
        </div>

        {/* Overfilled Bins (>=85%) */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Overfilled Bins (≥85%)</h3>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                overfilledBins.length
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {overfilledBins.length}{" "}
              {overfilledBins.length === 1 ? "Bin" : "Bins"}
            </span>
          </div>
          {overfilledBins.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">
              No overfilled bins detected.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="p-3">Node</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Bin Level</th>
                    <th className="p-3">Last Update</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overfilledBins.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="p-3 font-medium">{b.id}</td>
                      <td className="p-3">{b.location || b.road || "-"}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
                          {Number(b.bin)}%
                        </span>
                      </td>
                      <td className="p-3">
                        {new Date(b.updatedAt || Date.now()).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 rounded bg-green-100 text-green-700"
                            onClick={() => schedulePickup(b)}
                          >
                            Schedule Pickup
                          </button>
                          <button className="px-2 py-1 rounded bg-blue-100 text-blue-700">
                            Navigate
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-gray-100"
                            onClick={() => resolveBin(b)}
                          >
                            Resolve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Daily Collection Overview */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Daily Collection Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="p-3">Bin ID</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Resident/Business</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Collection Time</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3 font-medium">{row.id}</td>
                    <td className="p-3">{row.location}</td>
                    <td className="p-3">{row.resident}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          row.status === "Collected"
                            ? "bg-green-100 text-green-700"
                            : row.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3">{row.time}</td>
                    <td className="p-3">
                      {row.weightKg == null ? "-" : `${row.weightKg} kg`}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 rounded bg-green-100 text-green-700">
                          Mark Collected
                        </button>
                        <button className="px-2 py-1 rounded bg-gray-100">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exceptions & Errors */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Exceptions & Errors</h3>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
              {exceptions.length} Active
            </span>
          </div>
          <div className="p-4 space-y-3">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className={`rounded-lg p-3 flex items-center justify-between ${
                  ex.type === "Failed Scan" ? "bg-red-50" : "bg-yellow-50"
                }`}
              >
                <div>
                  <div className="font-medium">
                    {ex.type} — {ex.binId}
                  </div>
                  <div className="text-sm text-gray-600">{ex.note}</div>
                </div>
                <div className="flex items-center gap-2">
                  {ex.actions.map((a) => (
                    <button
                      key={a}
                      className={`px-3 py-1 rounded ${
                        a.toLowerCase().includes("resolve")
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
