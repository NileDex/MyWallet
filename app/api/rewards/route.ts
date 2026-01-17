import { NextRequest, NextResponse } from 'next/server';
import { getRewardHistory } from '@/lib/canopy/reward-service';

export async function POST(req: NextRequest) {
    try {
        const { addresses } = await req.json();

        if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
            return NextResponse.json({ error: 'Please provide an array of addresses' }, { status: 400 });
        }

        const validAddresses = addresses.filter(addr =>
            typeof addr === 'string' &&
            addr.startsWith('0x') &&
            addr.length === 66
        );

        if (validAddresses.length === 0) {
            return NextResponse.json({
                error: 'No valid addresses provided. Addresses must start with 0x and be 66 characters long.'
            }, { status: 400 });
        }

        console.log(`Processing ${validAddresses.length} addresses for rewards...`);

        const results = [];
        for (const address of validAddresses) {
            try {
                console.log(`Fetching rewards for ${address}...`);
                const rewardData = await getRewardHistory(address);
                results.push({
                    address,
                    success: true,
                    data: rewardData
                });
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`Error fetching rewards for ${address}:`, errorMessage);
                results.push({
                    address,
                    success: false,
                    error: errorMessage
                });
            }
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error('API rewards error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
