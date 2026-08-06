import { createBrowserRouter } from "react-router-dom";

import NotFound from "../pages/NotFound";
import App from "@/App.tsx";
import Layout from "@/components/Layout";
import Login from "@/pages/login.tsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            {
                index: true,
                element: <App />,
            },
            {
                path: "login",
                element: <Login />,
            },
        ],
    },
    {
        path: "*",
        element: <NotFound />,
    },
]);

export default router;
