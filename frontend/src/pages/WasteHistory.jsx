import { useEffect, useState } from "react";
import { toast } from "sonner";
import FieldHint from "../components/FieldHint";

export default function WasteHistory() {
  const [schedules, setSchedules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collectors, setCollectors] = useState([]);
  const [user, setUser] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);

  useEffect(() => {
    document.title = "Waste History - WasteTrack Pro";
  }, []);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      setUser(u);
    } catch (e) {
      setUser(null);
    }
    loadAll();
    loadCollectors();
  }, []);

  async function loadCollectors() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://127.0.0.1:3000"
        }/api/collectors`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to load collectors");
      const list = await res.json();
      setCollectors(list || []);
    } catch (err) {
      console.error("Failed to fetch collectors", err);
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

  async function loadAll() {
    setLoading(true);
    try {
      // schedules endpoint lists current user's schedules; Authority should see all collections
      const localUser = (() => {
        try {
          return JSON.parse(localStorage.getItem("user") || "null");
        } catch (e) {
          return null;
        }
      })();
      let s;
      if (localUser && localUser.role === "Authority") {
        // admin: fetch all collections (schedules) with their status
        s = await apiGet("/api/collections");
      } else {
        // residents/collectors: fetch own schedules
        s = await apiGet("/api/schedules");
      }
      setSchedules(s || []);
      const r = await apiGet("/api/collections/requests");
      setRequests(r || []);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRequest(id) {
    toast.info("Confirm deletion");
    if (!confirm("Delete this special collection request?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://127.0.0.1:3000"
        }/api/collections/request/${id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadAll();
      toast.success("Deleted");
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }

  async function handleEditRequest(r) {
    setEditingRequest({ ...r });
  }

  async function submitEditRequest() {
    if (!editingRequest) return;
    try {
      const token = localStorage.getItem("token");
      const body = {
        item_type: editingRequest.item_type,
        preferred_date: editingRequest.preferred_datetime,
      };
      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://127.0.0.1:3000"
        }/api/collections/request/${editingRequest.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadAll();
      toast.success("Updated");
      setEditingRequest(null);
    } catch (err) {
      toast.error("Update failed: " + err.message);
    }
  }

  async function handlePayRequest(r) {
    toast.info("Confirm payment");
    if (!confirm(`Pay ${r.estimated_cost || 0} for request ${r.id}?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://127.0.0.1:3000"
        }/api/payments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request_id: r.id,
            amount: r.estimated_cost || 0,
            currency: "USD",
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadAll();
      toast.success("Payment recorded and schedule created");
    } catch (err) {
      alert("Payment failed: " + err.message);
    }
  }

  async function assignCollector(requestId, collectorId) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://127.0.0.1:3000"
        }/api/collections/request/${requestId}/assign`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ collector_id: collectorId }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success("Collector assigned");
      await loadAll();
    } catch (err) {
      toast.error("Assign failed: " + err.message);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Waste History</h2>

      {/* Admin combined view: show all collections (schedules + special requests) with status/state */}
      {user &&
        user.role === "Authority" &&
        (() => {
          // normalize schedules and requests into a common shape
          const scheds = (schedules || []).map((s) => ({
            id: s.id,
            kind: "Schedule",
            type: s.type,
            date: s.date || s.scheduled_at || s.scheduledAt || null,
            status: s.status || "Unknown",
            user_id: s.user_id || s.userId || null,
          }));
          const reqs = (requests || []).map((r) => ({
            id: r.id,
            kind: "Request",
            type: r.item_type || r.type || "Special",
            date: r.preferred_datetime || r.created_at || null,
            status: r.status || "Unknown",
            user_id: r.user_id || r.userId || null,
          }));
          const combined = [...scheds, ...reqs].sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
          });
          return (
            <section className="mb-6">
              <h3 className="font-semibold">All Collections (Admin)</h3>
              {combined.length === 0 ? (
                <p className="text-gray-500">No collections found.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {combined.map((c) => (
                    <li
                      key={`${c.kind}-${c.id}`}
                      className="p-3 border rounded flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">
                          {c.kind}: {c.type}
                        </div>
                        <div className="text-sm text-gray-600">
                          {c.date
                            ? new Date(c.date).toLocaleString()
                            : "No date"}{" "}
                          — {c.status}
                        </div>
                        <div className="text-xs text-gray-500">
                          Owner ID: {c.user_id || "Unknown"}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })()}

      <section className="mb-6">
        <h3 className="font-semibold">Scheduled Collections</h3>
        {schedules.length === 0 ? (
          <p className="text-gray-500">No scheduled collections.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="p-3 border rounded flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{s.type}</div>
                  <div className="text-sm text-gray-600">
                    {(() => {
                      const dt =
                        s.date || s.scheduled_at || s.scheduledAt || null;
                      try {
                        return dt
                          ? `${new Date(dt).toLocaleString()} — ${
                              s.status || "Unknown"
                            }`
                          : `${s.status || "Unknown"}`;
                      } catch (e) {
                        return `${s.status || "Unknown"}`;
                      }
                    })()}
                  </div>
                  {/* show owner for Authority */}
                  {user && user.role === "Authority" && s.user_id && (
                    <div className="text-xs text-gray-500">
                      Owner ID: {s.user_id}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-semibold">Special Collection Requests</h3>
        {requests.length === 0 ? (
          <p className="text-gray-500">No special requests.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="p-3 border rounded flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">
                    {r.item_type} — {r.status}
                  </div>
                  <div className="text-sm text-gray-600">
                    Requested: {new Date(r.created_at).toLocaleString()}
                    {r.preferred_datetime
                      ? ` • Preferred: ${new Date(
                          r.preferred_datetime
                        ).toLocaleString()}`
                      : ""}
                  </div>
                  <div className="text-sm text-gray-700">
                    Estimated: ${Number(r.estimated_cost || 0).toFixed(2)}
                  </div>
                  {user && user.role === "Authority" && (
                    <div className="mt-2">
                      <label className="text-xs text-gray-500">
                        Assign collector
                      </label>
                      <select
                        className="mt-1 border rounded p-1 text-sm"
                        value={r.assigned_collector_id || ""}
                        onChange={(e) =>
                          assignCollector(r.id, Number(e.target.value))
                        }
                      >
                        <option value="">-- unassigned --</option>
                        {collectors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Only show edit/delete/pay for owners (Residents) or Authority */}
                  {user &&
                    (user.role === "Authority" ||
                      (r.user_id ? r.user_id === user.id : true)) && (
                      <>
                        <button
                          onClick={() => handleEditRequest(r)}
                          className="px-3 py-1 bg-yellow-100 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(r.id)}
                          className="px-3 py-1 bg-red-100 rounded"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  {/* Pay button only when pending payment */}
                  {r.status === "PendingPayment" &&
                    user &&
                    r.user_id === user.id && (
                      <button
                        onClick={() => handlePayRequest(r)}
                        className="px-3 py-1 bg-green-100 rounded"
                      >
                        Pay ${Number(r.estimated_cost || 0).toFixed(2)}
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {editingRequest && (
        <div
          className="fixed inset-0 bg-black/40 grid place-items-center z-50"
          onClick={() => setEditingRequest(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Edit Special Request</h3>
              <button
                onClick={() => setEditingRequest(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <div className="text-gray-600 mb-1">Item Type</div>
                <input
                  className="w-full border rounded-lg p-2"
                  value={editingRequest.item_type || ""}
                  onChange={(e) =>
                    setEditingRequest((s) => ({
                      ...s,
                      item_type: e.target.value,
                    }))
                  }
                />
                <FieldHint>
                  Example: Mattress, Electronics, Garden Waste
                </FieldHint>
              </label>
              <label className="block">
                <div className="text-gray-600 mb-1">Preferred Date</div>
                <input
                  type="datetime-local"
                  className="w-full border rounded-lg p-2"
                  value={
                    editingRequest.preferred_datetime
                      ? new Date(editingRequest.preferred_datetime)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setEditingRequest((s) => ({
                      ...s,
                      preferred_datetime: e.target.value,
                    }))
                  }
                />
                <FieldHint>Format: YYYY-MM-DDThh:mm (local time)</FieldHint>
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-lg bg-gray-100"
                  onClick={() => setEditingRequest(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-green-600 text-white"
                  onClick={submitEditRequest}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
