import React from "react";
import Navbar from "./Navbar";
import FooterSection from "./Footer";

export default function Layout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <FooterSection />
        </>
    );
}