"use client";

import { useState, useEffect } from "react";
import { addressBookDB, AddressEntry } from "@/lib/addressbook-db";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Copy, Check, Plus, Eye, X } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { MovementIndexerClient } from "@/lib/movement-client";
import { useNetwork } from "@/context/network-context";
import { MOVEMENT_NETWORKS } from "@/config/networks";
import { priceService } from "@/lib/price-service";

interface WalletDetails {
    address: string;
    username: string;
    moveBalance: string;
    netWorth: string;
    assets: Array<{
        name: string;
        symbol: string;
        balance: string;
        iconUri: string | null;
    }>;
}

export function AddressBook() {
    const { activeRpc } = useNetwork();
    const [addresses, setAddresses] = useState<AddressEntry[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [username, setUsername] = useState("");
    const [address, setAddress] = useState("");
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [viewingWallet, setViewingWallet] = useState<WalletDetails | null>(null);
    const [isLoadingWallet, setIsLoadingWallet] = useState(false);

    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        try {
            setIsLoading(true);
            setHasError(false);
            const data = await addressBookDB.getAllAddresses();
            setAddresses(data.sort((a, b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error("Failed to load addresses:", error);
            setHasError(true);
            toast.error("Failed to load address book");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!username.trim() || !address.trim()) {
            toast.error("Please fill in both username and address");
            return;
        }

        try {
            await addressBookDB.addAddress(username.trim(), address.trim());
            toast.success("Address added successfully");
            setUsername("");
            setAddress("");
            setIsAddModalOpen(false);
            setEditingId(null);
            loadAddresses();
        } catch (error) {
            console.error("Failed to add address:", error);
            toast.error("Failed to add address");
        }
    };

    const handleUpdate = async (id: number) => {
        if (!username.trim() || !address.trim()) {
            toast.error("Please fill in both username and address");
            return;
        }

        try {
            await addressBookDB.updateAddress(id, username.trim(), address.trim());
            toast.success("Address updated successfully");
            setUsername("");
            setAddress("");
            setIsAddModalOpen(false);
            setEditingId(null);
            loadAddresses();
        } catch (error) {
            console.error("Failed to update address:", error);
            toast.error("Failed to update address");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await addressBookDB.deleteAddress(id);
            toast.success("Address deleted");
            loadAddresses();
        } catch (error) {
            console.error("Failed to delete address:", error);
            toast.error("Failed to delete address");
        }
    };

    const handleEdit = (entry: AddressEntry) => {
        setEditingId(entry.id!);
        setUsername(entry.username);
        setAddress(entry.address);
        setIsAddModalOpen(true);
    };

    const handleView = async (entry: AddressEntry) => {
        setIsLoadingWallet(true);
        setIsViewModalOpen(true);
        setViewingWallet({
            address: entry.address,
            username: entry.username,
            moveBalance: "...",
            netWorth: "...",
            assets: []
        });

        try {
            const currentNetwork = Object.values(MOVEMENT_NETWORKS).find(net =>
                net.rpcEndpoints.some(rpc => rpc.url === activeRpc)
            ) || MOVEMENT_NETWORKS.mainnet;

            const client = new MovementIndexerClient(currentNetwork.indexerUrl);
            const [moveResponse, allAssets] = await Promise.all([
                client.getMoveBalance(entry.address),
                client.getFungibleAssetsFormatted(entry.address)
            ]);

            const assetsWithPrices = await Promise.all(allAssets.slice(0, 5).map(async (asset) => {
                const price = await priceService.getPrice(asset.symbol);
                const amount = Number(asset.balanceFormatted.replace(/,/g, ''));
                return {
                    ...asset,
                    value: amount * price
                };
            }));

            const totalValue = assetsWithPrices.reduce((acc, curr) => acc + curr.value, 0);
            const moveAmount = Number(moveResponse?.balanceFormatted.replace(/,/g, '') || '0');
            const movePrice = await priceService.getPrice('MOVE');
            const moveValue = moveAmount * movePrice;

            setViewingWallet({
                address: entry.address,
                username: entry.username,
                moveBalance: moveResponse?.balanceFormatted || "0.00",
                netWorth: priceService.formatCurrency(totalValue + moveValue),
                assets: assetsWithPrices.map(a => ({
                    name: a.name,
                    symbol: a.symbol,
                    balance: a.balanceFormatted,
                    iconUri: a.iconUri
                }))
            });
        } catch (error) {
            console.error("Failed to load wallet details:", error);
            toast.error("Failed to load wallet details");
        } finally {
            setIsLoadingWallet(false);
        }
    };

    const handleCopy = (address: string, id: number) => {
        navigator.clipboard.writeText(address);
        setCopiedId(id);
        toast.success("Address copied to clipboard");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCancel = () => {
        setIsAddModalOpen(false);
        setEditingId(null);
        setUsername("");
        setAddress("");
    };

    return (
        <div className="px-4 md:px-0 space-y-4">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-mono text-white">Address Book</h3>
                    <p className="text-sm text-muted-foreground font-mono mt-1">Save and manage your frequently used addresses</p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-white text-black rounded-none font-mono text-xs px-4 py-2 h-auto border-none hover:bg-white transition-none flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Address
                </Button>
            </div>

            {/* Add/Edit Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="bg-[#0c0d11] border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-mono">
                            {editingId ? "Edit Address" : "Add New Address"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div>
                            <label className="text-xs font-mono text-muted-foreground block mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                className="w-full bg-[#1a1b1f] border border-white/10 px-4 py-2 text-sm font-mono text-white placeholder:text-muted-foreground/40 focus:outline-none focus:border-white/20"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-mono text-muted-foreground block mb-2">
                                Wallet Address
                            </label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full bg-[#1a1b1f] border border-white/10 px-4 py-2 text-sm font-mono text-white placeholder:text-muted-foreground/40 focus:outline-none focus:border-white/20"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button
                                onClick={editingId ? () => handleUpdate(editingId) : handleAdd}
                                className="flex-1 bg-white text-black rounded-none font-mono text-xs px-4 py-2 h-auto border-none hover:bg-white transition-none"
                            >
                                {editingId ? "Update" : "Save"}
                            </Button>
                            <Button
                                onClick={handleCancel}
                                className="flex-1 bg-[#242424] text-white rounded-none font-mono text-xs px-4 py-2 h-auto border-none hover:bg-[#2a2a2a] transition-none"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Wallet Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="bg-[#0c0d11] border-white/10 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-mono">{viewingWallet?.username}</DialogTitle>
                    </DialogHeader>
                    {viewingWallet && (
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <p className="text-xs font-mono text-muted-foreground">Address</p>
                                <p className="text-sm font-mono text-white break-all">{viewingWallet.address}</p>
                            </div>

                            <div className="border-t border-white/10 pt-4 space-y-3">
                                <div>
                                    <p className="text-xs font-mono text-muted-foreground mb-1">Net Worth</p>
                                    <p className="text-2xl font-mono text-white font-bold">{viewingWallet.netWorth}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-mono text-muted-foreground mb-1">MOVE Balance</p>
                                    <p className="text-lg font-mono text-white">{viewingWallet.moveBalance} MOVE</p>
                                </div>
                            </div>

                            {viewingWallet.assets.length > 0 && (
                                <div className="border-t border-white/10 pt-4">
                                    <p className="text-xs font-mono text-muted-foreground mb-3">Top Assets</p>
                                    <div className="space-y-2">
                                        {viewingWallet.assets.map((asset, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-2">
                                                    {asset.iconUri ? (
                                                        <img src={asset.iconUri} alt={asset.symbol} className="w-6 h-6 rounded-full" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                                            <span className="text-xs font-mono text-white/40">{asset.symbol[0]}</span>
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-mono text-white">{asset.symbol}</span>
                                                </div>
                                                <span className="text-sm font-mono text-muted-foreground">{asset.balance}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isLoadingWallet && (
                                <div className="text-center py-4">
                                    <p className="text-sm font-mono text-muted-foreground">Loading wallet details...</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Loading State */}
            {isLoading && (
                <div className="border border-white/5 p-12 text-center">
                    <p className="text-sm text-muted-foreground font-mono">Loading addresses...</p>
                </div>
            )}

            {/* Error State */}
            {hasError && !isLoading && (
                <div className="border border-red-500/20 bg-red-500/5 p-12 text-center">
                    <p className="text-sm text-red-400 font-mono">Failed to load address book</p>
                    <Button
                        onClick={loadAddresses}
                        className="mt-4 bg-white text-black rounded-none font-mono text-xs px-4 py-2 h-auto border-none hover:bg-white transition-none"
                    >
                        Retry
                    </Button>
                </div>
            )}

            {/* Address Cards Grid */}
            {!isLoading && !hasError && addresses.length > 0 ? (

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

                    {addresses.map((entry) => (
                        <div
                            key={entry.id}
                            className="border border-white/5 bg-[#1a1b1f] p-4 hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="space-y-3">
                                {/* Username */}
                                <div>
                                    <p className="text-xs font-mono text-muted-foreground mb-1">Username</p>
                                    <p className="text-sm font-mono text-white">{entry.username}</p>
                                </div>

                                {/* Address */}
                                <div>
                                    <p className="text-xs font-mono text-muted-foreground mb-1">Address</p>
                                    <p className="text-sm font-mono text-white break-all">
                                        {entry.address.slice(0, 10)}...{entry.address.slice(-8)}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 pt-2 border-t border-white/5">
                                    <button
                                        onClick={() => handleView(entry)}
                                        className="p-2 hover:bg-white/10 rounded-sm transition-colors flex-1 flex items-center justify-center gap-1"
                                        title="View wallet"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-white/60" />
                                        <span className="text-xs font-mono text-white/60">View</span>
                                    </button>
                                    <button
                                        onClick={() => handleCopy(entry.address, entry.id!)}
                                        className="p-2 hover:bg-white/10 rounded-sm transition-colors"
                                        title="Copy address"
                                    >
                                        {copiedId === entry.id ? (
                                            <Check className="w-3.5 h-3.5 text-green-500" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5 text-white/60" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(entry)}
                                        className="p-2 hover:bg-white/10 rounded-sm transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(entry.id!)}
                                        className="p-2 hover:bg-white/10 rounded-sm transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-white/60 hover:text-red-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : !isLoading && !hasError ? (
                <div className="border border-white/5 p-12 text-center">
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground font-mono">No addresses saved yet</p>
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-white text-black rounded-none font-mono text-xs px-6 py-2 h-auto border-none hover:bg-white transition-none flex items-center gap-2 mx-auto"
                        >
                            <Plus className="w-4 h-4" />
                            Add Your First Address
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
