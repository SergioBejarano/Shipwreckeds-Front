import { useEffect } from 'react';
import barcoSrc from '../../assets/barco.png';

export function useBarcoImage(ref: React.RefObject<HTMLImageElement | null>) {
  useEffect(() => {
    const img = new Image();
    img.src = barcoSrc;
    ref.current = img;
    return () => { ref.current = null; };
  }, [ref]);
}
