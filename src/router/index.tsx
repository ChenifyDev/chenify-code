import { createBrowserRouter } from "react-router-dom";

import NotFound from "../pages/NotFound";
import App from "@/App.tsx";
import Layout from "@/components/layout/Layout.tsx";
import Explore from "@/pages/explore.tsx";
import Drafts from "@/pages/drafts.tsx";
import Login from "@/pages/login.tsx";
import Post from "@/pages/post.tsx";
import Profile from "@/pages/profile.tsx";
import Write from "@/pages/write.tsx";

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
            {
                path: "explore",
                element: <Explore />,
            },
            {
                path: "drafts",
                element: <Drafts />,
            },
            {
                path: "write",
                element: <Write />,
            },
            {
                path: "users/:id",
                element: <Profile />,
            },
            {
                path: "posts/:id",
                element: <Post />,
            },
        ],
    },
    {
        path: "*",
        element: <NotFound />,
    },
]);

export default router;
