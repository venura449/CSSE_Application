import { useEffect } from "react";

export default function Settings() {
  useEffect(() => {
    document.title = "Settings - WasteTrack Pro";
  }, []);
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      <p className="text-gray-600">User settings and preferences.</p>
    </div>
  );
}
