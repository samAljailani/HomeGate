import "@/styles/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import NavBar from "@/layouts/NavBar";
//import type { NavLinkItem } from "@packages/types/client/ui";
//import { Footer } from "@/components/Footer";

import { Home } from "@/pages/Home";
import { Admin } from "@/pages/Admin";
import { OAuthSignInPage } from "@/pages/SignIn";


function App() {
  //TODO: possible load from the 
  // const navLinks: Array<NavLinkItem> = [
  //   { to: "/", label: "Home" },
  //   { to: "/admin", label: "Admin" },
  //   { to: "/signin", label: "Sign In" },
  // ];

  return (
    <BrowserRouter>
      <div className="app">
        <NavBar/>

        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<OAuthSignInPage />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        {/* <Footer /> */}
      </div>
    </BrowserRouter>
  );
}

export default App;
