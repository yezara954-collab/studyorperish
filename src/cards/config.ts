import type { MessageKey } from "../i18n";

export const rarities = ["common", "rare", "legendary"] as const;
export const series = ["A", "B", "C", "D", "L"] as const;
export type Rarity = (typeof rarities)[number];
type Series = (typeof series)[number];

export const cardRules = {
  reviewsPerBox: 100,
  odds: { common: 60, rare: 30, legendary: 10 },
  animation: {
    breakMs: 340,
    riseMs: 680,
    suspenseMs: 460,
    flipMs: { common: 480, rare: 680, legendary: 1080 },
    reducedMs: 180,
    swipeDistance: 30,
    maxTilt: 13,
    particles: { common: 0, rare: 16, legendary: 25 },
  },
  audio: {
    tear: { path: "", duration: 0.26, volume: 0.16 },
    reveal: { path: "", duration: 0.5, volume: 0.12 },
  },
} as const;

type Card = {
  id: string;
  series: Series;
  rarity: Rarity;
  title: MessageKey;
  word: string;
  meaning: MessageKey;
  poster: string;
  video: string;
  accent: string;
  artDirection: string;
};

const rows = [
  ["01", "A", "common", "luggage", "猫跳上装满书的行李箱，尾巴摆动、锁扣闪光"],
  ["02", "A", "common", "voyage", "猫趴在舷窗边看地图，云朵缓缓飘过"],
  ["03", "A", "common", "stamp", "猫给信盖章，邮戳落下、墨迹晕开"],
  ["04", "A", "common", "atlas", "猫埋头在巨大地图册里，书页翻动"],
  ["05", "A", "rare", "altitude", "猫坐热气球飘在书塔上方，气球轻晃"],
  ["06", "A", "rare", "snapshot", "猫给星空拍照，闪光灯一闪"],
  ["07", "A", "rare", "departure", "夜行列车，蒸汽冒出、车窗亮灯"],
  ["08", "B", "common", "brew", "女孩端着茶壶托盘，热气升腾、眨眼"],
  ["09", "B", "common", "recipe", "南瓜派托盘，热气和香味小星星"],
  ["10", "B", "common", "stack", "松饼叠起，黄油慢慢融化"],
  ["11", "B", "common", "whisper", "女孩食指抵唇，眨眼"],
  ["12", "B", "rare", "fizz", "药剂汽水机，气泡不断上升"],
  ["13", "B", "rare", "midnight", "月下端着热可可，星星闪烁"],
  ["14", "B", "rare", "order", "托盘上的魔法书，书页自己翻动"],
  ["15", "C", "common", "garland", "两位天使挂彩带，彩带轻轻摆动"],
  ["16", "C", "common", "flicker", "天使举蜡烛，火苗摇曳"],
  ["17", "C", "common", "frost", "雪夜小镇，雪花飘落"],
  ["18", "C", "common", "drowsy", "天使在云朵上睡着，起伏呼吸"],
  ["19", "C", "rare", "constellation", "天使连星星，连线逐条画出"],
  ["20", "C", "rare", "parcel", "猫头鹰送包裹，翅膀扇动"],
  ["21", "D", "common", "herb", "女孩和猫采草药，叶子摇动"],
  ["22", "D", "common", "sip", "茶杯里冒出闪光星星"],
  ["23", "D", "common", "familiar", "黑猫走过，尾巴摆动"],
  ["24", "D", "common", "sweep", "扫帚靠墙，其中一把悬空漂浮"],
  ["25", "D", "rare", "sprout", "盆栽曼德拉草，叶子扭动、冒出小哭泡"],
  ["26", "D", "rare", "bloom", "花环里的花依次绽放"],
  ["27", "L", "legendary", "smug", "Draco 复古肖像，眨眼、金边星屑"],
  ["28", "L", "legendary", "persevere", "Harry 复古肖像，眨眼、金边星屑"],
  ["29", "L", "legendary", "appetite", "Ron 复古肖像，眨眼、金边星屑"],
  ["30", "L", "legendary", "diligent", "Hermione 复古肖像，眨眼、金边星屑"],
] as const;

export const cards: readonly Card[] = rows.map(
  ([id, series, rarity, word, artDirection]) => ({
    id,
    series,
    rarity,
    word,
    artDirection,
    title: `cardTitle${id}`,
    meaning: `cardMeaning${id}`,
    poster: `./cards/${id}/poster.webp`,
    video: `./cards/${id}/loop.mp4`,
    accent: `var(--cards-accent-${series.toLowerCase()})`,
  }),
);
export type { Card };
export const cardsById = new Map(cards.map((card) => [card.id, card]));
