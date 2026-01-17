import { NextResponse } from 'next/server';
import { priceService } from '@/lib/price-service';

export async function GET() {
    try {
        const movePrice = await priceService.getPrice('MOVE');
        return NextResponse.json({
            success: true,
            price: movePrice || 2.30,
            source: movePrice ? 'PriceService' : 'Fallback'
        });
    } catch (error) {
        console.error('API move-price error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch price' }, { status: 500 });
    }
}
