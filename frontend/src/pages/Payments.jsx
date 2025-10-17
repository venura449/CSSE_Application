import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Payments() {
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Payments - WasteTrack Pro";
    loadData();
  }, []);

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

  async function loadData() {
    setLoading(true);
    try {
      const r = await apiGet("/api/collections/requests");
      setRequests(r || []);
    } catch (err) {
      console.error("Failed to load requests", err);
    }
    try {
      const p = await apiGet("/api/payments");
      setPayments(p || []);
    } catch (err) {
      console.error("Failed to load payments", err);
    }
    setLoading(false);
  }

  async function payRequest(reqId, amount) {
    toast.info("Confirm payment");
    if (!confirm(`Pay $${Number(amount).toFixed(2)} for request ${reqId}?`))
      return;
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
          body: JSON.stringify({ request_id: reqId, amount }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadData();
      toast.success("Payment recorded");
    } catch (err) {
      alert("Payment failed: " + err.message);
    }
  }

  if (loading) return <div className="p-6">Loading payments...</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Payments</h2>

      <section className="mb-6">
        <h3 className="font-semibold">Pending Special Requests</h3>
        {requests.filter((r) => r.status === "PendingPayment").length === 0 ? (
          <p className="text-gray-500">No pending requests.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {requests
              .filter((r) => r.status === "PendingPayment")
              .map((r) => (
                <li
                  key={r.id}
                  className="p-3 border rounded flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{r.item_type}</div>
                    <div className="text-sm text-gray-600">
                      Requested: {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-700">
                      Estimate: ${Number(r.estimated_cost || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <button
                      className="px-3 py-1 bg-green-100 rounded"
                      onClick={() => payRequest(r.id, r.estimated_cost || 0)}
                    >
                      Pay ${Number(r.estimated_cost || 0).toFixed(2)}
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-semibold">Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-gray-500">No payments found.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="p-3 border rounded flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">
                    ${Number(p.amount).toFixed(2)} — {p.currency}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-gray-600">{p.status}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
