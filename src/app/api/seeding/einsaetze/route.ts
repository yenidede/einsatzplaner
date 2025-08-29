import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEinsaetzeFiltered } from "@/features/einsatz/dal-einsatz";

// Helper to generate random einsatz data
function randomEinsatz(orgId: string) {
    const titles = ["Veranstaltung", "Workshop", "Seminar", "Fest", "Einsatz", "Aktion"];
    const templates = ["e90de49b-fc76-44bc-82a5-222bd59f231f", "f06ac2b0-6907-46b0-9105-d38afc6a6be5"];
    const statusIds = ["15512bc7-fc64-4966-961f-c506a084a274", "46cee187-d109-4dea-b886-240cf923b8e6", "bb169357-920b-4b49-9e3d-1cf489409370"]; // Replace with real status IDs from your DB
    const now = new Date();
    const start = new Date(now.getTime() + Math.floor(Math.random() * 1e7));
    const end = new Date(start.getTime() + Math.floor(Math.random() * 1e7));
    return {
        title: titles[Math.floor(Math.random() * titles.length)] + " " + Math.floor(Math.random() * 1000),
        start,
        end: start,
        all_day: Math.random() > 0.1,
        helpers_needed: Math.floor(Math.random() * 10) + 1,
        participant_count: Math.floor(Math.random() * 50) + 1,
        price_per_person: Math.random() > 0.5 ? Math.floor(Math.random() * 100) : null,
        total_price: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) : null,
        org_id: orgId,
        status_id: statusIds[Math.floor(Math.random() * statusIds.length)],
        created_by: "77c99bd4-760a-4164-81d8-ad41a1de7463",
        template_id: templates[Math.floor(Math.random() * templates.length)],
    };
}

export async function POST(req: Request) {
    if (req.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const { count, orgId } = await req.json() || {};

    try {
        const einsaetze = [];
        for (let i = 0; i < count; i++) {
            einsaetze.push(randomEinsatz(orgId));
        }
        const created = await prisma.einsatz.createMany({ data: einsaetze });
        return Response.json({ success: true, created: created.count }, { status: 200 });
    } catch (err) {
        return Response.json({ error: String(err) }, { status: 500 });
    }
}

export async function GET(req: Request) {
    // const { orgId } = await req.json() || {};

    // if (!orgId) {
    //     return Response.json({ error: "Missing orgId" }, { status: 400 });
    // }

    try {
        const einsaetze = await getEinsaetzeFiltered([], { sort_field: "start", sort_order: "asc" }, { limit: 10000, offset: 0 });
        return Response.json({ success: true, data: einsaetze }, { status: 200 });
    } catch (err) {
        return Response.json({ error: String(err) }, { status: 500 });
    }
}
