import { Fragment, ReactElement, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop({ children }:{children:ReactElement}) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return <Fragment>{children}</Fragment>;
}