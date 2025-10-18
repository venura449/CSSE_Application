import React from "react";

export default function ProfileOverlay({ user, onClose }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0 bg-black opacity-40"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center gap-4">
          <img
            src={`https://i.pravatar.cc/80?u=${user.email}`}
            alt="avatar"
            className="w-16 h-16 rounded-full"
          />
          <div>
            <h3 className="text-lg font-bold">{user.name || user.email}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div>
            <p className="text-xs text-gray-400">Member since</p>
            <p className="text-sm">{user.created_at || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Account ID</p>
            <p className="text-sm">{user.id || "N/A"}</p>
          </div>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
