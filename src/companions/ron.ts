import { expressions, type Role } from "./types";

export default {
  id: "ron",
  displayName: "ronName",
  personality: ["ronPersonality"],
  centerBehavior: "beg",
  dragFace: "embarrassed",
  expressions,
  sprite: null,
  animation: {},
  expressionSprites: {},
  lines: {
    arrive: ["ron_arrive0", "companionAlt_arrive"],
    clicked: ["ron_clicked0", "companionAlt_clicked"],
    reading: ["ron_reading0", "companionAlt_reading"],
    sleeping: ["ron_sleeping0", "companionAlt_sleeping"],
    tauntCenter: ["ron_tauntCenter0", "ron_tauntCenter1"],
    dragged: ["ron_dragged0", "companionAlt_dragged"],
    returned: ["ron_returned0", "companionAlt_returned"],
    quidditch: ["ron_quidditch0", "companionAlt_quidditch"],
    praise: ["ron_praise0", "companionAlt_praise"],
    chineseConfirm: ["ron_chineseConfirm0", "companionConfirmAlt"],
    breakReminder: ["ron_breakReminder0", "companionAlt_breakReminder"],
  },
} satisfies Role;
