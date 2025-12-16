import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AppPage from "./pages/AppPage";
import LoginPage from "./pages/LoginPage";
import MarketingPage from "./pages/MarketingPage";
import NotFoundPage from "./pages/NotFoundPage";
import SignupPage from "./pages/SignupPage";

function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}

export default function App() {
    return (
        <BrowserRouter>
            {/* <UnderConstruction /> */}

            <ScrollToTop />
            <Layout>
                <Routes>
                    <Route path="/" element={<MarketingPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/app"
                        element={
                            <ProtectedRoute>
                                <AppPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}
