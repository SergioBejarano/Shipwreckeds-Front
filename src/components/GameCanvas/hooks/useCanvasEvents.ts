import { useEffect, type MutableRefObject, type RefObject } from 'react';

export function useCanvasEvents(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  handleEliminationClick: (event: MouseEvent) => void,
  handleMouseMove: (event: MouseEvent) => void,
  cursorRef: MutableRefObject<{ x: number; y: number } | null> | null
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const onMouseLeave = () => {
      if (cursorRef) {
        cursorRef.current = null;
      }
    };

    canvas.addEventListener('click', handleEliminationClick as any);
    canvas.addEventListener('mousemove', handleMouseMove as any);
    canvas.addEventListener('mouseleave', onMouseLeave);

    return () => {
      canvas.removeEventListener('click', handleEliminationClick as any);
      canvas.removeEventListener('mousemove', handleMouseMove as any);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [canvasRef, handleEliminationClick, handleMouseMove, cursorRef]);
}
