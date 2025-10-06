'use client'
import { useCalendarSubscription } from "../hooks/useCalendarSubscription";

export default function CalendarSubscription(  
    { orgId, orgName, variant = "inline" }:
    { orgId: string; orgName?: string; variant?: "inline" | "card" }){
    const {query, rotate, deactivate} = useCalendarSubscription(orgId);
    const subscription = query.data;
    

    if(query.isLoading) return <div>Kalender Abo wird geladen</div>
    if(query.isError) return <div>Fehler: {(query.error as Error).message || "Unbekannter Fehler"}</div>
    if(!subscription) return <div>Kein Kalender Abo gefunden</div>

    const copy = async () => {
        await navigator.clipboard.writeText(subscription.webcalUrl);
        console.log("Kalender-Abo kopiert");
    }

    const container =
    variant === "card" ? "space-y-3 rounded-2xl p-4 border": "mt-3 rounded-xl border p-3";

  const statusBadge = subscription.is_active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700";
//console.log("webcal:", subscription.webcalUrl)
  return (
    <div className={container}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Kalender-Integration {orgName ? `– ${orgName}` : ""}
        </div>
{/*         <span className={`text-[10px] px-2 py-0.5 rounded ${statusBadge}`}>
          {subscription.is_active ? "Aktiv" : "Deaktiviert"}
        </span> */}
      </div>

{/*       {subscription.last_accessed && (
        <div className="mt-1 text-[11px] text-muted-foreground">
          Zuletzt synchronisiert: {new Date(subscription.last_accessed).toLocaleString()}
        </div>
      )}
 */}
{/* {      <div className="mt-2 text-[11px] break-all rounded bg-muted/40 p-2 select-all">
        {subscription.webcalUrl}
      </div>} */}

      <div className="mt-2 flex flex-wrap gap-2">
        <button className="px-3 py-1.5 rounded border text-xs" onClick={copy}>
          URL kopieren
        </button>

        <a className="px-3 py-1.5 rounded border text-xs" href={subscription.webcalUrl} rel="noreferrer">
          In Kalender öffnen
        </a>

        <button
          className="px-3 py-1.5 rounded border text-xs"
          onClick={() => rotate.mutate(subscription.id)}
          disabled={rotate.isPending}
        >
          {rotate.isPending ? "Generiere…" : "Link neu generieren"}
        </button>

        <button
          className="px-3 py-1.5 rounded border text-xs text-red-600"
          onClick={() => deactivate.mutate(subscription.id)}
          disabled={!subscription.is_active || deactivate.isPending}
        >
          {deactivate.isPending ? "Deaktiviere…" : "Deaktivieren"}
        </button>
      </div>
    </div>
  );

}

