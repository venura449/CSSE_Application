import React, { useState } from "react";
import { dashboardChartData as staticChartData } from "../data/dashboardData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowUp,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
} from "lucide-react";
import ScheduleModal from "../components/ScheduleModal";
import { toast } from "sonner";

export default function Dashboard() {
  try {
    console.log("Recharts imports:", {
      BarChart,
      Bar,
      XAxis,
      YAxis,
      CartesianGrid,
      Tooltip,
      ResponsiveContainer,
    });
  } catch (e) {}
  const missingRecharts = [];
  [
    ["BarChart", BarChart],
    ["Bar", Bar],
    ["XAxis", XAxis],
    ["YAxis", YAxis],
    ["CartesianGrid", CartesianGrid],
    ["Tooltip", Tooltip],
    ["ResponsiveContainer", ResponsiveContainer],
  ].forEach(([name, val]) => {
    if (!val) missingRecharts.push(name);
  });
  const missingIcons = [];
  [
    ["ArrowUp", ArrowUp],
    ["DollarSign", DollarSign],
    ["Calendar", Calendar],
    ["Clock", Clock],
    ["CheckCircle", CheckCircle],
  ].forEach(([name, val]) => {
    if (!val) missingIcons.push(name);
  });
  if (missingRecharts.length > 0 || missingIcons.length > 0) {
    return (
      <div className="min-h-screen p-6">
        <h2 className="text-xl font-semibold text-red-600">
          Dashboard load issues
        </h2>
        {missingRecharts.length > 0 && (
          <div className="mt-3">
            Missing Recharts imports: {missingRecharts.join(", ")}
          </div>
        )}
        {missingIcons.length > 0 && (
          <div className="mt-3">
            Missing icon imports: {missingIcons.join(", ")}
          </div>
        )}
        <div className="mt-4 text-sm text-gray-600">
          Please check package versions or imports. The app will continue to
          function without charts/icons.
        </div>
      </div>
    );
  }
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(staticChartData);
  const [recentActivity, setRecentActivity] = useState([]);

  const [srItem, setSrItem] = useState("Electronics");
  const [srDate, setSrDate] = useState("");
  const [srTime, setSrTime] = useState("11:30 AM");
  const [srCost, setSrCost] = useState(45.0);
  const [srPhotos, setSrPhotos] = useState([]);

  function handlePhotoFiles(files) {
    const arr = Array.from(files || []);
    Promise.all(
      arr.map(
        (f) =>
          new Promise((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.readAsDataURL(f);
          })
      )
    ).then((dataUrls) => setSrPhotos(dataUrls));
  }

  async function submitSpecialRequest() {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please sign in to request special pickup");
      return;
    }
    const payload = {
      item_type: srItem,
      preferred_date: srDate ? new Date(srDate).toISOString() : null,
      preferred_time_label: srTime,
      photos: srPhotos,
      estimated_cost: Number(srCost || 0),
    };
    try {
      const res = await fetch(
        (import.meta.env.VITE_API_URL || "http://127.0.0.1:3000") +
          "/api/collections/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      toast.success("Request created: " + json.id);
      setShowSpecialModal(false);
      // refresh dashboard data
      loadDashboard();
    } catch (err) {
      console.error(err);
      toast.error("Failed: " + err.message);
    }
  }

  async function apiGet(path) {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${import.meta.env.VITE_API_URL || "http://127.0.0.1:3000"}${path}`,
      {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            }
          : { "Content-Type": "application/json" },
      }
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function loadDashboard() {
    setLoading(true);
    try {
      const s = localStorage.getItem("token")
        ? await apiGet("/api/schedules")
        : [];
      const r = localStorage.getItem("token")
        ? await apiGet("/api/collections/requests")
        : [];
      const p = localStorage.getItem("token")
        ? await apiGet("/api/payments")
        : [];
      setSchedules(s || []);
      setRequests(r || []);
      setPayments(p || []);

      // compute dashboard stats
      const totalWaste = s.length; // placeholder metric
      const lastCollection = s.length
        ? new Date(s[s.length - 1].date).toLocaleString()
        : "N/A";
      const balance = p
        .reduce((acc, cur) => acc + Number(cur.amount || 0), 0)
        .toFixed(2);
      const nextCollection = s.find((item) => new Date(item.date) > new Date())
        ? new Date(
            s.find((item) => new Date(item.date) > new Date()).date
          ).toLocaleString()
        : "N/A";

      // simple recent activity: map last few schedule/request/payment actions
      const recent = [];
      s.slice(-3)
        .reverse()
        .forEach((it) =>
          recent.push({
            type: "collection",
            label: `${it.type} scheduled`,
            time: new Date(it.date).toLocaleString(),
          })
        );
      r.slice(0, 3).forEach((it) =>
        recent.push({
          type: it.status === "Paid" ? "payment" : "request",
          label: `${it.item_type} request • ${it.status}`,
          time: new Date(it.created_at).toLocaleString(),
        })
      );
      p.slice(0, 3).forEach((it) =>
        recent.push({
          type: "payment",
          label: `Payment ${it.amount} ${it.currency}`,
          time: new Date(it.created_at).toLocaleString(),
        })
      );
      // sort recent by time desc and take top 5
      recent.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivity(recent.slice(0, 5));

      // chart data: counts per month for schedules
      const months = {};
      s.forEach((it) => {
        const d = new Date(it.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        months[key] = (months[key] || 0) + 1;
      });
      const cd = Object.entries(months)
        .slice(-6)
        .map(([k, v]) => ({ month: k, waste: v }));
      setChartData(cd.length ? cd : staticChartData);

      // set derived dashboard stats into dom via state variables used in layout
      dashboardDerived.totalWaste = totalWaste;
      dashboardDerived.lastCollection = lastCollection;
      dashboardDerived.balance = `$${balance}`;
      dashboardDerived.nextCollection = nextCollection;
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  }

  // lightweight derived object for display (keeps original layout variables)
  const dashboardDerived = {
    totalWaste: "—",
    lastCollection: "—",
    balance: "—",
    nextCollection: "—",
  };

  React.useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content area */}
      <div className="flex flex-1 p-8 gap-6">
        {/* Left Sidebar with key metrics */}
        <aside className="w-64 bg-white shadow-inner p-6 space-y-4 rounded-xl h-fit">
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <ArrowUp />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Waste</p>
              <h3 className="text-xl font-bold">
                {dashboardDerived.totalWaste}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <Clock />
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Collection</p>
              <h3 className="text-xl font-bold">
                {dashboardDerived.lastCollection}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <DollarSign />
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance</p>
              <h3 className="text-xl font-bold">{dashboardDerived.balance}</h3>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
            <div className="bg-orange-100 p-3 rounded-full text-orange-600">
              <Calendar />
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Collection</p>
              <h3 className="text-xl font-bold">
                {dashboardDerived.nextCollection}
              </h3>
            </div>
          </div>
        </aside>

        {/* Left/Main section */}
        <main className="flex-1 space-y-8">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold">Dashboard Overview</h2>
            <p className="text-gray-500">Today is Monday, September 3, 2025</p>
          </div>

          {/* Chart Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold">Waste Collection Overview</h3>
                <p className="text-gray-500 text-sm">
                  Monthly waste collection data
                </p>
              </div>
              <div className="space-x-2">
                <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-full">
                  3 months
                </button>
                <button className="px-3 py-1 text-gray-600 text-sm">
                  6 months
                </button>
                <button className="px-3 py-1 text-gray-600 text-sm">
                  1 year
                </button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="waste" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </main>

        {/* Right Sidebar (kept for activity, actions, notifications) */}
        <aside className="w-72 bg-white shadow-inner p-6 space-y-6 rounded-xl">
          <div>
            <h3 className="font-semibold mb-3">Recent Activity</h3>
            <ul className="space-y-3 text-sm">
              {recentActivity.map((a, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-2 ${
                    a.type === "success"
                      ? "text-green-600"
                      : a.type === "payment"
                      ? "text-blue-600"
                      : "text-orange-600"
                  }`}
                >
                  {a.type === "success" ? (
                    <CheckCircle size={16} />
                  ) : a.type === "payment" ? (
                    <DollarSign size={16} />
                  ) : (
                    <Calendar size={16} />
                  )}
                  {a.label}
                  <span className="text-gray-400 ml-auto">{a.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowSchedule(true)}
                className="bg-green-600 text-white py-2 rounded-lg"
              >
                + Schedule Collection
              </button>
              <button
                onClick={() => setShowSpecialModal(true)}
                className="bg-purple-600 text-white py-2 rounded-lg"
              >
                + New Special Request
              </button>
              <button className="bg-green-500 text-white py-2 rounded-lg">
                Make Payment
              </button>
              <button className="bg-green-400 text-white py-2 rounded-lg">
                View Reports
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-400 py-4 text-sm border-t bg-white">
        © 2025 EcoTrack
      </footer>
      {showSchedule && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          onAdded={() => {
            /* Collections reads storage */
          }}
        />
      )}
      {showSpecialModal && (
        <div
          className="fixed inset-0 bg-black/40 grid place-items-center z-50"
          onClick={() => setShowSpecialModal(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">New Special Collection Request</h3>
              <button
                onClick={() => setShowSpecialModal(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <div className="text-gray-600 mb-1">Item Type</div>
                <select
                  className="w-full border rounded-lg p-2"
                  value={srItem}
                  onChange={(e) => setSrItem(e.target.value)}
                >
                  <option>Electronics</option>
                  <option>Large Furniture</option>
                  <option>Yard Waste</option>
                </select>
              </label>
              <label className="block">
                <div className="text-gray-600 mb-1">Preferred Date</div>
                <input
                  type="date"
                  className="w-full border rounded-lg p-2"
                  value={srDate}
                  onChange={(e) => setSrDate(e.target.value)}
                />
              </label>
              <label className="block">
                <div className="text-gray-600 mb-1">Preferred Time</div>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={srTime}
                  onChange={(e) => setSrTime(e.target.value)}
                />
              </label>
              <label className="block">
                <div className="text-gray-600 mb-1">Estimated Cost</div>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded-lg p-2"
                  value={srCost}
                  onChange={(e) => setSrCost(e.target.value)}
                />
              </label>
              <label className="block">
                <div className="text-gray-600 mb-1">Item Photos</div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-lg bg-gray-100"
                  onClick={() => setShowSpecialModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white"
                  onClick={submitSpecialRequest}
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
