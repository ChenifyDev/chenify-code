import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "lowlight";

import { MathExtensions } from "@/lib/tiptap-math.ts";
import {
    Bold,
    Code,
    Heading1,
    Heading2,
    Heading3,
    Italic,
    List,
    ListOrdered,
    Redo2,
    RemoveFormatting,
    SeparatorHorizontal,
    Sigma,
    SquareCode,
    SquareSigma,
    Strikethrough,
    TextQuote,
    Undo2,
    type LucideIcon,
    CheckIcon,
    XIcon,
    Link,
} from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const extensions = [
    ...MathExtensions,
    StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
            openOnClick: false,
            autolink: true,
            validate: (url) => /^https?:\/\//.test(url),
        },
        codeBlock: false,
    }),
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: "auto" }),
    Placeholder.configure({ placeholder: "在这里写帖子…" }),
    Markdown.configure({
        markedOptions: {
            breaks: true,
        },
    }),
];

function ToolButton({
    icon: Icon,
    label,
    active,
    disabled,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        type="button"
                        variant={active ? "outline" : "ghost"}
                        size="icon-sm"
                        aria-label={label}
                        aria-pressed={active}
                        disabled={disabled}
                        onClick={onClick}
                    >
                        <Icon />
                    </Button>
                }
            />
            <TooltipContent>
                <p>{label}</p>
            </TooltipContent>
        </Tooltip>
    );
}

type inputDataType = {
    needInput: boolean;
    value: string;
    inputType: "block" | "line" | "link";
};

export default function EditorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const prevValueRef = useRef(value);
    const [inputData, setInputData] = useState<inputDataType>({
        needInput: false,
        value: "",
        inputType: "block",
    });

    const editor = useEditor({
        extensions,
        content: value,
        contentType: "markdown",
        onUpdate: ({ editor: e }) => {
            const markdown = e.getMarkdown();
            prevValueRef.current = markdown;
            onChange(markdown);
        },
    });

    useEffect(() => {
        if (!editor) return;
        if (value === prevValueRef.current) return;
        prevValueRef.current = value;
        if (editor.getMarkdown() !== value) {
            editor.commands.setContent(value || "", { contentType: "markdown" });
        }
    }, [value, editor]);

    const toolbar = useEditorState({
        editor,
        selector: ({ editor: e }) => {
            if (!e) return null;
            return {
                bold: e.isActive("bold"),
                italic: e.isActive("italic"),
                strike: e.isActive("strike"),
                code: e.isActive("code"),
                codeBlock: e.isActive("codeBlock"),
                bulletList: e.isActive("bulletList"),
                orderedList: e.isActive("orderedList"),
                blockquote: e.isActive("blockquote"),
                heading1: e.isActive("heading", { level: 1 }),
                heading2: e.isActive("heading", { level: 2 }),
                heading3: e.isActive("heading", { level: 3 }),
                link: e.isActive("link"),
                canUndo: e.can().undo(),
                canRedo: e.can().redo(),
            };
        },
    });

    if (!editor) {
        return <div className="min-h-[calc(50vh+40px)]" />;
    }

    const insertMath = () => {
        const block = inputData.inputType === "block";
        const latex = inputData.value;
        if (!latex) {
            toast.warning("请输入LaTeX公式");
            return;
        }
        if (block) {
            editor.chain().focus().insertBlockMath({ latex }).run();
        } else {
            editor.chain().focus().insertInlineMath({ latex }).run();
        }
        setInputData({
            value: "",
            needInput: false,
            inputType: "block",
        });
    };

    const insertLink = () => {
        const url = inputData.value;
        if (!url) {
            toast.warning("请输入链接 URL");
            return;
        }
        editor.chain().focus().toggleLink({ href: url }).run();
        setInputData({
            value: "",
            needInput: false,
            inputType: "block",
        });
    };

    const group = "flex items-center gap-0.5 border-r border-border/60 pr-0.5 last:border-r-0";

    return (
        <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                <div className={group}>
                    <ToolButton
                        icon={Undo2}
                        label="撤销"
                        disabled={!toolbar?.canUndo}
                        onClick={() => editor.chain().focus().undo().run()}
                    />
                    <ToolButton
                        icon={Redo2}
                        label="重做"
                        disabled={!toolbar?.canRedo}
                        onClick={() => editor.chain().focus().redo().run()}
                    />
                </div>
                <div className={group}>
                    <ToolButton
                        icon={Heading1}
                        label="一级标题"
                        active={toolbar?.heading1}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    />
                    <ToolButton
                        icon={Heading2}
                        label="二级标题"
                        active={toolbar?.heading2}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    />
                    <ToolButton
                        icon={Heading3}
                        label="三级标题"
                        active={toolbar?.heading3}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    />
                </div>
                <div className={group}>
                    <ToolButton
                        icon={Bold}
                        label="加粗"
                        active={toolbar?.bold}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                    />
                    <ToolButton
                        icon={Italic}
                        label="斜体"
                        active={toolbar?.italic}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                    />
                    <ToolButton
                        icon={Strikethrough}
                        label="删除线"
                        active={toolbar?.strike}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                    />
                    <ToolButton
                        icon={Link}
                        label="插入链接"
                        active={toolbar?.link}
                        onClick={() => setInputData({ needInput: true, value: "", inputType: "link" })}
                    />
                </div>
                <div className={group}>
                    <ToolButton
                        icon={Sigma}
                        label="行内公式"
                        onClick={() => setInputData({ inputType: "line", value: "", needInput: true })}
                    />
                    <ToolButton
                        icon={SquareSigma}
                        label="块级公式"
                        onClick={() => setInputData({ inputType: "block", value: "", needInput: true })}
                    />
                </div>
                <div className={group}>
                    <ToolButton
                        icon={TextQuote}
                        label="引用"
                        active={toolbar?.blockquote}
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    />
                    <ToolButton
                        icon={List}
                        label="无序列表"
                        active={toolbar?.bulletList}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                    />
                    <ToolButton
                        icon={ListOrdered}
                        label="有序列表"
                        active={toolbar?.orderedList}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    />
                    <ToolButton
                        icon={SquareCode}
                        label="代码块"
                        active={toolbar?.codeBlock}
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    />
                </div>
                <div className={group}>
                    <ToolButton
                        icon={Code}
                        label="行内代码"
                        active={toolbar?.code}
                        onClick={() => editor.chain().focus().toggleCode().run()}
                    />
                    <ToolButton
                        icon={SeparatorHorizontal}
                        label="分隔线"
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    />
                    <ToolButton
                        icon={RemoveFormatting}
                        label="清除格式"
                        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                    />
                </div>
                {inputData.needInput && (
                    <div className={cn(group, "flex gap-2")}>
                        <Input
                            placeholder={
                                inputData.inputType === "link"
                                    ? "输入链接 URL"
                                    : inputData.inputType === "block"
                                      ? "输入块级公式的 LaTeX（无需 $$）"
                                      : "输入行内公式的 LaTeX（无需 $）"
                            }
                            value={inputData.value}
                            onChange={(e) =>
                                setInputData({
                                    ...inputData,
                                    value: e.target.value,
                                })
                            }
                        />
                        <Button
                            size={"icon-sm"}
                            variant={"outline"}
                            onClick={inputData.inputType === "link" ? insertLink : insertMath}
                        >
                            <CheckIcon />
                        </Button>
                        <Button
                            size={"icon-sm"}
                            variant={"outline"}
                            onClick={() => setInputData({ needInput: false, value: "", inputType: "block" })}
                        >
                            <XIcon />
                        </Button>
                    </div>
                )}
            </div>

            <div
                className={cn(
                    "markdown-body overflow-hidden rounded-lg border border-border",
                    "focus-within:border-ring",
                )}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
