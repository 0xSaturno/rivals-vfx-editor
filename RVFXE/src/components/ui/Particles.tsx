import { useMemo } from 'react';

const NUM_PARTICLES = 200;

export function Particles() {
  const particles = useMemo(() => {
    const arr: JSX.Element[] = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const size = Math.random() * 2.5 + 0.5;
      const duration = 5 + Math.random() * 10;
      const style: React.CSSProperties = {
        width: `${size}px`,
        height: `${size}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `-${Math.random() * duration}s`,
        animationDuration: `${duration}s`,
      };
      arr.push(<div key={i} className="particle" style={style}></div>);
    }
    return arr;
  }, []);

  return <div className="particles">{particles}</div>;
}
