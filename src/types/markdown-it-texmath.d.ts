declare module "markdown-it-texmath" {
    import type MarkdownIt from "markdown-it";

    interface TexmathOptions {
        engine: unknown;
        delimiters?: string | string[];
        katexOptions?: Record<string, unknown>;
    }

    function texmath(md: MarkdownIt, options: TexmathOptions): void;
    export default texmath;
}
