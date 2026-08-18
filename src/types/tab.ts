export interface TabData<T> {
    items: T[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    hidden: boolean;
    error: string | null;
    initialized: boolean;
    load: (reset?: boolean) => Promise<void>;
    updateItems: (updater: (items: T[]) => T[]) => void;
}
