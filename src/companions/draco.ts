import { expressions, type Role } from "./types";

export default {
  id: "draco",
  displayName: "dracoName",
  personality: ["dracoPersonality"],
  centerBehavior: "taunt",
  dragFace: "tsundere",
  expressions,
  sprite: null,
  animation: {},
  expressionSprites: {},
  lines: {
    arrive: ["draco_arrive0", "draco_arrive1"],
    clicked: ["draco_clicked0", "draco_clicked1"],
    reading: ["draco_reading0", "draco_reading1"],
    sleeping: ["draco_sleeping0", "draco_sleeping1"],
    tauntCenter: ["draco_tauntCenter0", "draco_tauntCenter1"],
    dragged: ["draco_dragged0", "draco_dragged1"],
    returned: ["draco_returned0", "draco_returned1"],
    quidditch: ["draco_quidditch0", "draco_quidditch1"],
    praise: ["draco_praise0", "draco_praise1"],
    chineseConfirm: ["draco_chineseConfirm0", "draco_chineseConfirm1"],
    breakReminder: ["draco_breakReminder0", "draco_breakReminder1"],
  },
} satisfies Role;
