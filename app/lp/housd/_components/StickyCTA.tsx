"use client";

import { useEffect, useState } from "react";

export function StickyCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-housd-line bg-white/95 backdrop-blur transition-transform duration-200 sm:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 text-sm">
          <div className="font-semibold text-housd-ink">Quote in 2 hours</div>
          <div className="text-xs text-slate-500">Free, no obligation</div>
        </div>
        <a
          href="#lead-form"
          className="rounded-md bg-housd-accent px-4 py-3 text-sm font-semibold text-white shadow"
        >
          Get my quote
        </a>
      </div>
    </div>
  );
}
