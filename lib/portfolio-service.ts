import { MovementIndexerClient } from "./movement-client";
import { MOVEMENT_NETWORKS } from "@/config/networks";
import { priceService } from "./price-service";
import { CANOPY_CONTRACTS } from "./movement-client";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

export interface PortfolioData {
    netWorth: number;
    moveBalance: number;
    moveValue: number;
    assets: Array<{
        name: string;
        symbol: string;
        balance: string;
        value: number;
        iconUri: string | null;
    }>;
    protocolPositions: Array<{
        protocol: string;
        type: string;
        symbol: string;
        amount: string;
        value: number;
    }>;
    totalProtocolValue: number;
}

const getSymbol = (type: string) => {
    if (type.includes("::aptos_coin::AptosCoin")) return "MOVE";
    if (type.includes("::usdc::USDC")) return "USDC.E";
    if (type.includes("::usdt::USDT")) return "USDT.E";
    return "MOVE"; // Fallback
};

export async function fetchPortfolio(address: string, indexerUrl: string, rpcUrl: string): Promise<PortfolioData> {
    const client = new MovementIndexerClient(indexerUrl);

    // Aptos Client for resources
    const config = new AptosConfig({
        network: Network.MAINNET,
        fullnode: rpcUrl
    });
    const aptos = new Aptos(config);

    // Fetch all in parallel
    const [moveResponse, allAssets, accountResources, ownedObjects] = await Promise.all([
        client.getMoveBalance(address),
        client.getFungibleAssetsFormatted(address),
        aptos.getAccountResources({ accountAddress: address }),
        client.getUserOwnedObjects(address)
    ]);

    // 1. Move Balance
    const moveAmount = Number(moveResponse?.balanceFormatted.replace(/,/g, '') || '0');
    const movePrice = await priceService.getPrice('MOVE');
    const moveValue = moveAmount * movePrice;

    // 2. Fungible Assets
    const assetsWithVals = await Promise.all(allAssets.map(async (asset) => {
        const price = await priceService.getPrice(asset.symbol);
        const amount = Number(asset.balanceFormatted.replace(/,/g, ''));
        const val = amount * price;
        return {
            ...asset,
            balance: asset.balanceFormatted,
            value: val
        };
    }));

    // 3. Protocol Positions
    const protocolPositions: any[] = [];

    if (accountResources) {
        accountResources.forEach(resource => {
            const type = resource.type;
            const data = resource.data as any;

            // Vaults
            if (type.includes(CANOPY_CONTRACTS.CORE_VAULTS)) {
                const amount = Number(data.value || 0) / 1e8;
                protocolPositions.push({
                    protocol: 'Canopy Core',
                    type: 'vault',
                    symbol: 'MOVE',
                    amount: amount.toString(),
                    value: amount * movePrice
                });
            }
            // Staking
            if (type.includes("multi_rewards::UserData") || type.includes("farming::Staker")) {
                const amount = (Number(data.amount || data.active_stake || 0)) / 1e8;
                protocolPositions.push({
                    protocol: 'Canopy Staking',
                    type: 'staking',
                    symbol: 'MOVE',
                    amount: amount.toString(),
                    value: amount * movePrice
                });
            }
        });
    }

    const totalProtocolValue = protocolPositions.reduce((acc, curr) => acc + curr.value, 0);
    const walletValue = moveValue + assetsWithVals.reduce((acc, curr) => acc + curr.value, 0);

    return {
        netWorth: walletValue + totalProtocolValue,
        moveBalance: moveAmount,
        moveValue: moveValue,
        assets: assetsWithVals,
        protocolPositions,
        totalProtocolValue
    };
}
