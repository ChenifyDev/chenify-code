import { encode, decode } from "@msgpack/msgpack";

export interface AssetInfo {
    id: string;
    name: string;
    type: string;
    md5ext?: string;
    assetId?: string;
    value?: string;
    children?: AssetInfo[];
    disabled?: boolean;
    path?: string;
}

export interface FileEntry {
    path: string;
    content: string;
}

export interface LintIssue {
    line: number;
    column?: number | null;
    code?: string | null;
    message: string;
    severity: string;
}

export interface DangerItem {
    label: string;
    hint: string;
    line: number;
    code: string;
}

export type S2CMessage =
    | { kind: "output"; data: string }
    | { kind: "backspace"; cells: number }
    | { kind: "runInfo"; info: string }
    | { kind: "compileFail"; info: string }
    | {
          kind: "signal";
          signalKind: string;
          host?: string;
          reason?: string;
          changed?: unknown;
      }
    | { kind: "assets"; state: string }
    | {
          kind: "dangerConfirm";
          count: number;
          timeoutSecs: number;
          items: DangerItem[];
      }
    | { kind: "lint"; diagnostics: LintIssue[] };

export function encodeC2S(payload: unknown): ArrayBuffer {
    const bytes = encode(payload as never);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function decodeS2C(data: ArrayBuffer): S2CMessage {
    const result = decode(data) as unknown as Record<string, unknown>;
    return result as S2CMessage;
}

export const PORT_PAIRS: ReadonlyArray<readonly [number, number]> = [
    [55820, 55821],
    [55825, 55826],
    [55830, 55831],
    [55835, 55836],
];
