import { useEffect, useRef, useState, type ReactNode } from "react";
export default function AutoMenu({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);
  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setClosing(false);
  }
  function close(delay = 0) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!ref.current?.open) return;
      setClosing(true);
      timer.current = setTimeout(() => {
        if (ref.current) ref.current.open = false;
        setClosing(false);
      }, 180);
    }, delay);
  }
  function open() {
    cancel();
    document
      .querySelectorAll<HTMLDetailsElement>(".auto-menu[open]")
      .forEach((x) => {
        if (x !== ref.current) x.open = false;
      });
    if (ref.current) ref.current.open = true;
  }
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <details
      ref={ref}
      className={`${className} auto-menu ${closing ? "is-closing" : ""}`}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") open();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") close(120);
      }}
      onFocus={() => cancel()}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
      onClick={(e) => {
        const summary = (e.target as HTMLElement).closest("summary");
        if (summary) {
          e.preventDefault();
          if (e.detail === 0 && ref.current?.open) close();
          else if (
            e.nativeEvent instanceof MouseEvent &&
            matchMedia("(hover:none)").matches &&
            ref.current?.open
          )
            close();
          else open();
        }
      }}
    >
      {children}
    </details>
  );
}
