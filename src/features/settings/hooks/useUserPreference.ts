import { useState } from "react";

export function useUserPreferences(initial: { showLogosInCalendar: boolean; userId: string }) {
  const [showLogos, setShowLogos] = useState(initial.showLogosInCalendar);

  const [userId, setUserId] = useState(initial.userId);

    if (!userId) {
        console.warn("User ID is not set in useUserPreferences");
        return { showLogos, toggleShowLogos: () => {} };
    }
  const toggleShowLogos = async () => {
    const newValue = !showLogos;
    setShowLogos(newValue);
    await fetch(`/api/auth/settings/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, showLogosInCalendar: newValue }),
    });
  };

  return { showLogos, toggleShowLogos };
}