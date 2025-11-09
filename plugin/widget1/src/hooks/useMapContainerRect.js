import { useEffect, useState } from "react";

export default function useMapContainerRect(trigger) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let resizeObserver;

    const updateRect = () => {
      const element = document.getElementById("map");
      if (!element) {
        setRect((prev) => (prev ? null : prev));
        return;
      }

      const { width, left } = element.getBoundingClientRect();
      setRect((prev) => {
        if (!prev || prev.width !== width || prev.left !== left) {
          return { width, left };
        }
        return prev;
      });
    };

    const handleResize = () => {
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(updateRect);
      } else {
        updateRect();
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const element = document.getElementById("map");
    if (element && typeof window.ResizeObserver === "function") {
      resizeObserver = new window.ResizeObserver(handleResize);
      resizeObserver.observe(element);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [trigger]);

  return rect;
}
