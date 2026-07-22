import { type PropsWithChildren } from "react";
import Footer from "../components/Footer";
import HomeHeader from "../components/HomeHeader";

function HomeLayout({ children }: PropsWithChildren) {
    return <>
        <HomeHeader />
            {children}
        <Footer />
    </>
}

export default HomeLayout;