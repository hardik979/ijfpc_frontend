"use client";

import React, { useEffect, useState } from "react";

type DemoUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export default function DemoUsersPage() {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/demo-users"); // update if backend runs elsewhere
      const data = await res.json();
      setUsers(data.items || []);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Demo Users</h1>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-3 py-2 text-left">
                Name
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left">
                Email
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left">
                Role
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left">
                Active
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left">ID</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">{u.name}</td>
                <td className="border border-gray-300 px-3 py-2">{u.email}</td>
                <td className="border border-gray-300 px-3 py-2">{u.role}</td>
                <td className="border border-gray-300 px-3 py-2">
                  {u.active ? "✅" : "❌"}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-gray-500">
                  {u._id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
