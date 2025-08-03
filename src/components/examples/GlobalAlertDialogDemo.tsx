"use client";

import { useAlertDialog } from "@/contexts/AlertDialogContext";

export function GlobalAlertDialogDemo() {
  const { showDialog } = useAlertDialog();

  const handleDelete = async () => {
    const result = await showDialog({
      title: "Einsatz löschen",
      description:
        "Sind Sie sicher, dass Sie diesen Einsatz löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
    });

    if (result === "success") {
      console.log("User confirmed deletion");
      // Delete the item here
    } else {
      console.log("User cancelled deletion");
    }
  };

  const handleConfirmAction = async () => {
    const result = await showDialog({
      title: "Aktion bestätigen",
      description: "Möchten Sie diese Aktion wirklich ausführen?",
    });

    if (result === "success") {
      console.log("User confirmed action");
      // Execute the action here
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Global AlertDialog Demo</h2>
      <div className="space-x-4">
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Einsatz löschen
        </button>
        <button
          onClick={handleConfirmAction}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Aktion bestätigen
        </button>
      </div>
    </div>
  );
}
