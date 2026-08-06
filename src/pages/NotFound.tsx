import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";

export default function NotFound() {
    const nav = useNavigate();
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
            <h1 className="text-8xl font-bold text-blue-500">404</h1>
            <p className="text-slate-500 mt-3">页面未找到</p>
            <div className="flex gap-3 mt-6">
                <Button onClick={() => nav("/")}>回到首页</Button>
                <Button onClick={() => nav(-1)}>返回上一页</Button>
            </div>
        </div>
    );
}
