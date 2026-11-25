import React from "react";
const icons: Record<string, string> = {
  book: "M3 5Q7 3 12 6Q17 3 21 5V19Q17 17 12 20Q7 17 3 19ZM12 6V20",
  bin: "M4 6H20M9 6V3H15V6M6 7L7 21H17L18 7M10 10V17M14 10V17",
  settings: "M3 6H9M13 6H21M3 17H14M18 17H21M9 3V9M16 14V20",
  plus: "M12 4V20M4 12H20",
  feather: "M3 21Q8 12 20 3Q23 12 12 17L7 17M8 16L16 8",
  moon: "M19 16A8 8 0 0 1 8 4A9 9 0 1 0 19 16",
  close: "M5 5L19 19M19 5L5 19",
};
export function Icon({ n }: { n: string }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d={icons[n]} />
    </svg>
  );
}
function sprig(x: number, y: number, len: number, angle: number) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${len / 100})`}>
      <path d="M0 0Q8 -48 0 -100" />
      {Array.from({ length: 10 }, (_, i) => {
        const h = 9 * i + 6,
          w = 21 * Math.sin((Math.PI * (i + 1)) / 12);
        return [-1, 1].map((s) => (
          <g
            key={s + "-" + i}
            transform={`translate(${3 * Math.sin(h / 32)} ${-h}) scale(${s} 1)`}
          >
            <path
              d={`M0 0Q${w * 0.35} -13 ${w} -20Q${w * 0.85} -8 0 0ZM1 -1L${w - 2} -18`}
            />
          </g>
        ));
      })}
    </g>
  );
}
export function Plate({ type = 0 }: { type?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 160"
      className="plate"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
    >
      {type % 3 === 0 ? (
        <>
          {sprig(92, 149, 132, 12)}
          {sprig(93, 148, 100, -31)}
          {sprig(94, 149, 87, 52)}
          {sprig(90, 148, 65, -58)}
        </>
      ) : type % 3 === 1 ? (
        <g transform="translate(100 78)">
          <circle r="60" />
          <circle r="55" />
          <circle r="43" strokeDasharray="2 5" />
          <ellipse rx="68" ry="19" transform="rotate(-32)" />
          <ellipse rx="63" ry="25" transform="rotate(50)" />
          <path d="M0 -42L7 -8L35 0L8 7L0 45L-7 8L-36 0L-8 -7Z" />
          <circle r="8" />
          {Array.from({ length: 36 }, (_, i) => (
            <path key={i} transform={"rotate(" + i * 10 + ")"} d="M0 -60v4" />
          ))}
        </g>
      ) : (
        <g transform="translate(100 83)">
          {[-1, 1].map((s) => (
            <g key={s} transform={`scale(${s} 1)`}>
              <path d="M0 -9Q20 -40 81 -53Q74 -17 48 1Q63 13 46 42Q22 52 2 12ZM1 -9Q22 -16 81 -53M2 -8Q43 -8 69 -36M3 0L48 1M3 6Q29 9 46 42M3 8Q17 33 38 44" />
              <ellipse
                cx="47"
                cy="-22"
                rx="9"
                ry="5"
                transform="rotate(-24 47 -22)"
              />
              <circle cx="32" cy="20" r="5" />
              <path d="M0 -11Q9 -37 22 -37M0 -9Q8 -34 23 -35" />
            </g>
          ))}
          <ellipse rx="4" ry="26" />
        </g>
      )}
    </svg>
  );
}
export function Flourish() {
  return (
    <svg
      viewBox="0 0 340 160"
      aria-hidden="true"
      className="flourish"
      fill="none"
      stroke="currentColor"
      strokeWidth=".9"
    >
      <g opacity=".6">
        <path d="M0 143Q120 131 338 147M50 148Q200 137 320 151" />
        {sprig(255, 137, 113, -52)}
        {sprig(250, 135, 115, 14)}
        {sprig(244, 136, 98, 53)}
      </g>
      <g transform="translate(60 5)">
        <path d="M35 109v-7q0 -8 8 -10v-9h24v9q10 3 10 10v28q-22 9 -42 0ZM41 81h28v5H41zM40 108q14 4 31 0v18q-16 6 -31 0z" />
        <path d="M52 83Q76 26 131 3Q125 26 111 38L99 41L102 44Q80 65 63 67ZM53 83Q84 40 129 6" />
        {Array.from({ length: 10 }, (_, i) => (
          <path
            key={i}
            d={`M${65 + i * 5.5} ${64 - i * 5.1}l5 -13m-5 13l13 -5`}
          />
        ))}
      </g>
    </svg>
  );
}
