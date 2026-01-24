import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { endpoint, query, variables } = await req.json();

        if (!endpoint) {
            return NextResponse.json({ errors: [{ message: "Endpoint is required" }] }, { status: 400 });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "MovementWallet/1.0",
                "Accept": "application/json",
                "Origin": "https://explorer.movementnetwork.xyz"
            },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[Indexer Proxy Error]:", err);
        return NextResponse.json(
            { errors: [{ message: err.message || "Internal server error" }] },
            { status: 500 }
        );
    }
}
