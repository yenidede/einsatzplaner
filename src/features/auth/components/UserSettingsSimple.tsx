import React, { useState } from 'react';

interface UserSettingsSimpleProps {
  userId: string;
  initialData: {
    _id?: string;
    email: string;
    firstname: string;
    lastname: string;
  };
}

export default function UserSettingsSimple({ userId, initialData }: UserSettingsSimpleProps) {
  const [form, setForm] = useState(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hier könntest du ein API-Update machen
    alert('Gespeichert:\n' + JSON.stringify(form, null, 2));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700">E-Mail</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className="mt-1 block w-full border rounded px-3 py-2"
          placeholder="E-Mail eingeben"
        />
      </div>
      <div>
        <input
          type="text"
          name="firstname"
          value={form.firstname}
          onChange={handleChange}
          className="mt-1 block w-full border rounded px-3 py-2"
          placeholder="Vorname eingeben"
        />
      </div>
      <div>
        <input
          type="text"
          name="lastname"
          value={form.lastname}
          onChange={handleChange}
          className="mt-1 block w-full border rounded px-3 py-2"
          placeholder="Nachname eingeben"
        />
      </div>
    </form>
  );
}