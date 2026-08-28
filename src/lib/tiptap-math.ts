import { InputRule, PasteRule, mergeAttributes, Node, type NodeViewRendererProps } from "@tiptap/core";
import katex, { type KatexOptions } from "katex";
import "katex/dist/katex.min.css";

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        inlineMath: {
            insertInlineMath: (options: { latex: string; pos?: number }) => ReturnType;
            updateInlineMath: (options?: { latex?: string; pos?: number }) => ReturnType;
            deleteInlineMath: (options?: { pos?: number }) => ReturnType;
        };
        blockMath: {
            insertBlockMath: (options: { latex: string; pos?: number }) => ReturnType;
            updateBlockMath: (options?: { latex?: string; pos?: number }) => ReturnType;
            deleteBlockMath: (options?: { pos?: number }) => ReturnType;
        };
    }
}

const mathKatexOptions: KatexOptions = { throwOnError: false, strict: false };

export const BlockMath = Node.create({
    name: "blockMath",
    group: "block",
    atom: true,

    addOptions() {
        return { katexOptions: mathKatexOptions };
    },

    addAttributes() {
        return {
            latex: {
                default: "",
                parseHTML: (element) => element.getAttribute("data-latex"),
                renderHTML: (attributes) => ({ "data-latex": attributes.latex }),
            },
        };
    },

    addCommands() {
        return {
            insertBlockMath:
                (options) =>
                ({ editor, tr }) => {
                    const latex = options.latex;
                    const from = options.pos ?? editor.state.selection.from;
                    if (!latex) return false;
                    tr.replaceWith(from, from, this.type.create({ latex }));
                    return true;
                },
            updateBlockMath:
                (options) =>
                ({ editor, tr }) => {
                    const latex = options?.latex;
                    const pos = options?.pos ?? editor.state.selection.from;
                    const node = editor.state.doc.nodeAt(pos);
                    if (!node || node.type.name !== this.name) return false;
                    tr.setNodeMarkup(pos, this.type, { ...node.attrs, latex });
                    return true;
                },
            deleteBlockMath:
                (options) =>
                ({ editor, tr }) => {
                    const pos = options?.pos ?? editor.state.selection.from;
                    const node = editor.state.doc.nodeAt(pos);
                    if (!node || node.type.name !== this.name) return false;
                    tr.delete(pos, pos + node.nodeSize);
                    return true;
                },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-type="block-math"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ["div", mergeAttributes(HTMLAttributes, { "data-type": "block-math" })];
    },

    parseMarkdown: (token) => ({
        type: "blockMath",
        attrs: { latex: token.latex },
    }),

    renderMarkdown: (node: { attrs?: { latex?: string } }) => `$$${node.attrs?.latex || ""}$$`,

    markdownTokenizer: {
        name: "blockMath",
        level: "block",
        start: (src: string) => src.indexOf("$$"),
        tokenize: (src: string) => {
            const match = src.match(/^\$\$([\s\S]*?)\$\$/);
            if (!match) return undefined;
            const [fullMatch, latexRaw] = match;
            const latex = latexRaw.trim().replace(/^\$+/, "").replace(/\$+$/, "");
            return {
                type: "blockMath",
                raw: fullMatch,
                latex,
            };
        },
    },

    addInputRules() {
        return [
            new InputRule({
                find: /^\$\$(.+?)\$\$$/,
                handler: ({ state, range, match }) => {
                    let latex = match[1].trim();
                    latex = latex.replace(/^\$+/, "").replace(/\$+$/, "");
                    if (latex.length === 0) return null;

                    const { tr } = state;
                    const $from = state.doc.resolve(range.from);
                    const node = this.type.create({ latex });

                    const consumesHostTextblock =
                        $from.depth > 0 &&
                        $from.parent.isTextblock &&
                        range.from === $from.start() &&
                        range.to === $from.end();

                    const canReplaceHostTextblock =
                        consumesHostTextblock &&
                        $from.node(-1).canReplaceWith($from.index(-1), $from.indexAfter(-1), this.type);

                    const replacementRange = canReplaceHostTextblock
                        ? { from: $from.before(), to: $from.after() }
                        : range;

                    tr.replaceWith(replacementRange.from, replacementRange.to, node);
                },
            }),
        ];
    },

    addPasteRules() {
        return [
            new PasteRule({
                find: /\$\$((?:(?!\$\$).)+?)\$\$/gs,
                handler: ({ state, range, match }) => {
                    let latex = match[1].trim();
                    latex = latex.replace(/^\$+/, "").replace(/\$+$/, "");
                    if (!latex) return null;
                    state.tr.replaceWith(range.from, range.to, state.schema.nodes.blockMath.create({ latex }));
                },
            }),
        ];
    },

    addNodeView() {
        const { katexOptions } = this.options;
        return ({ node }: NodeViewRendererProps) => {
            const wrapper = document.createElement("div");
            const innerWrapper = document.createElement("div");
            wrapper.className = "tiptap-mathematics-render tiptap-mathematics-render--block";
            innerWrapper.className = "block-math-inner";
            wrapper.dataset.type = "block-math";
            wrapper.setAttribute("data-latex", node.attrs.latex);
            wrapper.appendChild(innerWrapper);

            const renderMath = () => {
                try {
                    katex.render(node.attrs.latex || "", innerWrapper, { ...katexOptions, displayMode: true });
                    wrapper.classList.remove("block-math-error");
                } catch {
                    wrapper.textContent = node.attrs.latex || "";
                    wrapper.classList.add("block-math-error");
                }
            };

            renderMath();
            return { dom: wrapper };
        };
    },
});

export const InlineMath = Node.create({
    name: "inlineMath",
    group: "inline",
    inline: true,
    atom: true,

    addOptions() {
        return { katexOptions: mathKatexOptions };
    },

    addAttributes() {
        return {
            latex: {
                default: "",
                parseHTML: (element) => element.getAttribute("data-latex"),
                renderHTML: (attributes) => ({ "data-latex": attributes.latex }),
            },
        };
    },

    addCommands() {
        return {
            insertInlineMath:
                (options) =>
                ({ editor, tr }) => {
                    const latex = options.latex;
                    const from = options.pos ?? editor.state.selection.from;
                    if (!latex) return false;
                    tr.replaceWith(from, from, this.type.create({ latex }));
                    return true;
                },
            updateInlineMath:
                (options) =>
                ({ editor, tr }) => {
                    const latex = options?.latex;
                    const pos = options?.pos ?? editor.state.selection.from;
                    const node = editor.state.doc.nodeAt(pos);
                    if (!node || node.type.name !== this.name) return false;
                    tr.setNodeMarkup(pos, this.type, { ...node.attrs, latex });
                    return true;
                },
            deleteInlineMath:
                (options) =>
                ({ editor, tr }) => {
                    const pos = options?.pos ?? editor.state.selection.from;
                    const node = editor.state.doc.nodeAt(pos);
                    if (!node || node.type.name !== this.name) return false;
                    tr.delete(pos, pos + node.nodeSize);
                    return true;
                },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-type="inline-math"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ["span", mergeAttributes(HTMLAttributes, { "data-type": "inline-math" })];
    },

    parseMarkdown: (token) => ({
        type: "inlineMath",
        attrs: { latex: token.latex },
    }),

    renderMarkdown: (node: { attrs?: { latex?: string } }) => `$${node.attrs?.latex || ""}$`,

    markdownTokenizer: {
        name: "inlineMath",
        level: "inline",
        start: (src: string) => src.indexOf("$"),
        tokenize: (src: string) => {
            const match = src.match(/^\$(?!\$)([^\s$\\]|\S[^$\n]*?[^\s$\\])\$(?![\d$])/);
            if (!match) return undefined;
            const [fullMatch, latexRaw] = match;
            const latex = latexRaw.trim().replace(/^\$+/, "").replace(/\$+$/, "");
            return {
                type: "inlineMath",
                raw: fullMatch,
                latex,
            };
        },
    },

    addInputRules() {
        return [
            new InputRule({
                find: /(?<!\\)(?<!\$)\$(?!\$)(?!\s)(.+?)(?<!\s)\$(?!\d)/,
                handler: ({ state, range, match }) => {
                    let latex = match[1].trim();
                    latex = latex.replace(/^\$+/, "").replace(/\$+$/, "");
                    if (latex.length === 0) return null;

                    state.tr.replaceWith(range.from, range.to, this.type.create({ latex }));
                },
            }),
        ];
    },

    addPasteRules() {
        return [
            new PasteRule({
                find: /(?<!\$)\$(?!\$)(?!\s)(.+?)(?<!\s)\$(?!\$)(?!\d)/g,
                handler: ({ state, range, match }) => {
                    let latex = match[1].trim();
                    latex = latex.replace(/^\$+/, "").replace(/\$+$/, "");
                    if (!latex) return null;
                    state.tr.replaceWith(range.from, range.to, state.schema.nodes.inlineMath.create({ latex }));
                },
            }),
        ];
    },

    addNodeView() {
        const { katexOptions } = this.options;
        return ({ node }: NodeViewRendererProps) => {
            const wrapper = document.createElement("span");
            wrapper.className = "tiptap-mathematics-render";
            wrapper.dataset.type = "inline-math";
            wrapper.setAttribute("data-latex", node.attrs.latex);

            const renderMath = () => {
                try {
                    katex.render(node.attrs.latex || "", wrapper, katexOptions);
                    wrapper.classList.remove("inline-math-error");
                } catch {
                    wrapper.textContent = node.attrs.latex || "";
                    wrapper.classList.add("inline-math-error");
                }
            };

            renderMath();
            return { dom: wrapper };
        };
    },
});

export const MathExtensions = [BlockMath, InlineMath];
