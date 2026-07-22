import Footer from "../components/Footer";
import Header from "../components/Header";
import { type PropsWithChildren } from "react";

function MainLayout({ children }: PropsWithChildren) {
    return <>
        <Header />
            {children}
        <Footer />
    </>
}

export default MainLayout;