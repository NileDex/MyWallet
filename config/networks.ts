export interface RpcEndpoint {
    name: string;
    url: string;
    latency?: string;
    status?: "orange" | "pink" | "yellow" | "transparent";
}

export const MOVEMENT_NETWORKS = {
    mainnet: {
        chainId: 126,
        name: "Movement Mainnet",
        rpcEndpoints: [
            {
                name: "Movement RPC Pool 1",
                url: "https://mainnet.movementnetwork.xyz/v1",
                status: "orange"
            },
            {
                name: "Sentio Mainnet RPC",
                url: "https://rpc.sentio.xyz/movement/v1",
                status: "pink"
            },
            {
                name: "Lava RPC Mainnet",
                url: "https://movement.lava.build/",
                status: "yellow"
            }
        ] as RpcEndpoint[],
        indexerUrl: "https://indexer.mainnet.movementnetwork.xyz/v1/graphql",
        explorers: [
            {
                name: "Movement Explorer",
                url: "https://explorer.movementnetwork.xyz/"
            },
            {
                name: "Movement Labs Explorer",
                url: "https://explorer.movementlabs.xyz/#/?network=local"
            }
        ]
    },
    testnet: {
        chainId: 30732,
        name: "Movement Testnet",
        rpcEndpoints: [
            {
                name: "Movement Testnet RPC",
                url: "https://testnet.movementnetwork.xyz/v1",
                status: "orange"
            }
        ] as RpcEndpoint[],
        indexerUrl: "https://indexer.testnet.movementnetwork.xyz/v1/graphql",
        explorers: [
            {
                name: "Movement Testnet Explorer",
                url: "https://explorer.testnet.movementnetwork.xyz/"
            }
        ]
    }
};

export const DEFAULT_RPC = MOVEMENT_NETWORKS.mainnet.rpcEndpoints[0].url;
