"use client"
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query"

export type CalendarSubscription = {
    id: string;
    name: string;
    is_active: boolean;
    token: string;
    webcalUrl: string;
    last_accessed: string | null;
}

const key = (orgId: string) => ["calendar-subscription", orgId];

async function getSubscription(orgId: string): Promise<CalendarSubscription>{
    const response = await fetch(`api/calendar/subscription?orgId=${orgId}`,
        {cache: "no-store", credentials: "include"});
    if(!response.ok) throw new Error(await response.text());
    return response.json();
}

async function rotateSubscription(id: string){
    const response = await fetch(`api/calendar/subscription`,{
        method: 'PATCH',
        headers: {"Content-Type": "applicatio/json"},
        credentials: "include",
        body: JSON.stringify({id})
    });
    if(!response.ok) throw new Error(await response.text());
    return response.json() as Promise<{id: string; token: string; webCalUrl: string;}>;
}

async function deactivateSubscription(id: string) {
    const res = await fetch(`/api/calendar/subscription`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ ok: true }>;
}

export function useCalendarSubscription(orgId: string){
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: key(orgId),
        queryFn: () => getSubscription(orgId),
        enabled: !!orgId,
        staleTime: 60000,
        retry: 1
    });

    const rotate = useMutation({
        mutationFn: (id: string) => rotateSubscription(id),
        onSuccess: (data) => {
            queryClient.setQueryData<CalendarSubscription | undefined>(key(orgId), (prev) =>
                prev ? {...prev, token: data.token, webCalUrl: data.webCalUrl, is_active: true} : prev
            );
        }
    });

    
    const deactivate = useMutation({
        mutationFn: (id: string) => deactivateSubscription(id),
        onSuccess: () => {
            queryClient.setQueryData<CalendarSubscription | undefined>(key(orgId), (prev)=>
                prev ? {... prev, is_active: false} : prev
        );
        },

    });

    return {query, rotate, deactivate}
}
