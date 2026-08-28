import { request } from "./http";

export function listTags(): Promise<string[]> {
    return request<string[]>("/tags");
}