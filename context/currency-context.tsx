"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { priceService } from "@/lib/price-service";

export type Currency = "USD" | "EUR" | "GBP" | "MOVE";

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>("USD");

    useEffect(() => {
        const savedCurrency = localStorage.getItem("preferredCurrency") as Currency;
        if (savedCurrency && ["USD", "EUR", "GBP", "MOVE"].includes(savedCurrency)) {
            setCurrencyState(savedCurrency);
            priceService.setCurrency(savedCurrency);
        }
    }, []);


    const setCurrency = (curr: Currency) => {
        setCurrencyState(curr);
        localStorage.setItem("preferredCurrency", curr);
        priceService.setCurrency(curr);
    };


    return (
        <CurrencyContext.Provider value={{ currency, setCurrency }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error("useCurrency must be used within a CurrencyProvider");
    }
    return context;
}
