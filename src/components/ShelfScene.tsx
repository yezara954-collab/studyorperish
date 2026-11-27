import { useEffect, useRef } from "react";
export const shelfAsset = (name: string) => import.meta.env.BASE_URL + "assets/shelf/" + name;
export const bindings = ["green","olive","blue","brown","plum","teal","maroon","slate"] as const;
export function ShelfScene({meter}: {meter:boolean}) {
  const scene = useRef<HTMLDivElement>(null);
  const output = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    const pause = () => { if(scene.current) scene.current.dataset.paused=String(document.hidden); };
    pause(); document.addEventListener("visibilitychange",pause);
    return () => document.removeEventListener("visibilitychange",pause);
  },[]);
  useEffect(() => {
    if (!meter) return;
    let request=0, start=performance.now(), frames=0;
    function measure(now:number) {
      frames++;
      if(now-start>=1000){if(output.current) output.current.value=Math.round(frames*1000/(now-start))+" FPS"; frames=0;start=now;}
      request=requestAnimationFrame(measure);
    }
    request=requestAnimationFrame(measure);
    return () => cancelAnimationFrame(request);
  },[meter]);
  return <div ref={scene} className="shelf-scene" aria-hidden="true">
    <div className="shelf-sky">{Array.from({length:10},(_,i)=><i key={i} style={{left:(i*31%99)+"%",top:(i*17%89)+"%",animationDelay:-i*.93+"s"}}/>)}</div>
    <div className="shelf-castle"><i/></div>
    <div className="shelf-owl"><span><i/><b/></span></div><div className="shelf-left-prop"/><div className="shelf-right-prop"/>
    {meter && <output ref={output} className="shelf-meter"/>}
  </div>;
}
