import { getMyCoins } from "@/lib/api";
import { create } from "zustand";

interface CoinsState {
    balance: number | null;
    checkedToday: boolean | null;
    fetchBalance: () => Promise<void>;
    setBalance: (balance: number | null) => void;
    addBalance: (delta: number) => void;
    setCheckedToday: (checkedToday: boolean | null) => void;
}

export const useCoinsStore = create<CoinsState>((set) => ({
    balance: null,
    checkedToday: null,
    setBalance: (balance) => set({ balance }),
    addBalance: (delta) => set((s) => ({ balance: s.balance == null ? null : s.balance + delta })),
    setCheckedToday: (checkedToday) => set({ checkedToday }),
    fetchBalance: async () => {
        try {
            const { balance } = await getMyCoins();
            set({ balance });
        } catch {
            set({ balance: null });
        }
    },
}));