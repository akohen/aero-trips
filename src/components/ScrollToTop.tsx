import { Fragment, ReactNode, useEffect } from "react";
import { useLocation } from "react-router";

export default function ScrollToTop({ children }:{children:ReactNode}) {
  const { pathname } = useLocation();

  useEffect(() => {
    // A link to an anchor (/confidentialite#suppression-du-compte) lands on it; sections that load later scroll themselves
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname]);

  return <Fragment>{children}</Fragment>;
}