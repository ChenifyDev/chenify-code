import { BlobDocStore } from "./doc";

type WithId = { id: number };

export class DataStore {
    constructor(private doc: BlobDocStore) {}

    read<T>(name: string): Promise<T[]> {
        return this.doc.read<T>(name);
    }

    write<T>(name: string, rows: T[]): Promise<void> {
        return this.doc.write(name, rows);
    }

    private async maxId<T extends WithId>(name: string): Promise<number> {
        const rows = await this.read<T>(name);
        return rows.reduce((max, row) => Math.max(max, row.id), 0);
    }

    async insert<T extends WithId>(name: string, row: Omit<T, "id">): Promise<T> {
        const rows = await this.read<T>(name);
        const id = (await this.maxId<T>(name)) + 1;
        const full = { ...row, id } as T;
        rows.push(full);
        await this.write(name, rows);
        return full;
    }

    async getById<T extends WithId>(name: string, id: number): Promise<T | undefined> {
        const rows = await this.read<T>(name);
        return rows.find((row) => row.id === id);
    }

    async append<T>(name: string, row: T): Promise<T> {
        const rows = await this.read<T>(name);
        rows.push(row);
        await this.write(name, rows);
        return row;
    }

    async updateById<T extends WithId>(name: string, id: number, patch: Partial<T>): Promise<T | undefined> {
        const rows = await this.read<T>(name);
        const index = rows.findIndex((row) => row.id === id);
        if (index < 0) return undefined;
        rows[index] = { ...rows[index], ...patch } as T;
        await this.write(name, rows);
        return rows[index];
    }

    async deleteWhere<T>(name: string, predicate: (row: T) => boolean): Promise<void> {
        const rows = await this.read<T>(name);
        const next = rows.filter((row) => !predicate(row));
        await this.write(name, next);
    }

    async removeById<T extends WithId>(name: string, id: number): Promise<void> {
        await this.deleteWhere<T>(name, (row) => row.id === id);
    }

    async insertIfAbsent<T extends { id: number }>(name: string, row: T): Promise<void> {
        const rows = await this.read<T>(name);
        if (rows.some((existing) => existing.id === row.id)) return;
        rows.push(row);
        await this.write(name, rows);
    }
}
