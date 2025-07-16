import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({ message: "GET method works" });
}

export async function POST() {
    return NextResponse.json({ message: "POST method works" });
}

export async function PUT() {
    return NextResponse.json({ message: "PUT method works" });
}
