import { useEffect, useRef } from "react";
export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    done = useRef(false);
  useEffect(() => {
    ref.current?.showModal();
    return () => clearTimeout(timer.current);
  }, []);
  function close() {
    if (done.current) return;
    done.current = true;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    ref.current?.classList.add("is-closing");
    timer.current = setTimeout(onClose, 240);
  }
  return { ref, close };
}
