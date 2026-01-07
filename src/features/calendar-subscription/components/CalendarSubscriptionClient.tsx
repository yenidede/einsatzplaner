"use client";
import { useCalendarSubscription } from "../hooks/useCalendarSubscription";
import { toast } from "sonner";

export default function CalendarSubscription({
  orgId,
  orgName,
  variant = "inline",
}: {
  orgId: string;
  orgName?: string;
  variant?: "inline" | "card";
}) {
  const { query, rotate, deactivate } = useCalendarSubscription(orgId);
  const subscription = query.data;

  if (query.isLoading) return <div>Kalender Abo wird geladen</div>;
  if (query.isError)
    return (
      <div>
        Fehler: {(query.error as Error).message || "Unbekannter Fehler"}
      </div>
    );
  if (!subscription) return <div>Kein Kalender Abo gefunden</div>;

  const copy = async () => {
    await navigator.clipboard.writeText(subscription.webcalUrl);
    toast.success("URL kopiert");
  };

  const container =
    variant === "card"
      ? "space-y-3 rounded-2xl p-4 border"
      : "mt-3 rounded-xl border p-3";

  return (
    <div className={container}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Kalender-Integration {orgName ? `– ${orgName}` : ""}
        </div>
      </div>
      <div
        className="mt-2 text-[13px] break-all rounded bg-muted/50 p-2 cursor-pointer hover:bg-muted/70 transition-colors select-none"
        onClick={copy}
        title="Klicken zum Kopieren"
      >
        {subscription.webcalUrl}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="px-3 py-1.5 rounded border text-xs" onClick={copy}>
          URL kopieren
        </button>

        <a
          className="px-3 py-1.5 rounded border text-xs inline-block"
          href={subscription.webcalUrl}
        >
          In Kalender öffnen
        </a>

        <button
          className="px-3 py-1.5 rounded border text-xs"
          onClick={() => {
            rotate.mutate(subscription.id);
            toast.success("Link neu generiert");
          }}
          disabled={rotate.isPending}
        >
          {rotate.isPending ? "Generiere…" : "Link neu generieren"}
        </button>

        <button
          className="px-3 py-1.5 rounded border text-xs text-red-600"
          onClick={() => {
            deactivate.mutate(subscription.id);
            toast.success("Kalender-Abo wird deaktiviert");
          }}
          disabled={!subscription.is_active || deactivate.isPending}
        >
          {deactivate.isPending ? "Deaktiviere…" : "Deaktivieren"}
        </button>
      </div>
    </div>
  );
}
