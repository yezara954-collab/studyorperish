import { expressions, type Role } from "./types";

export default {
  id: "harry",
  displayName: "harryName",
  personality: ["harryPersonality"],
  centerBehavior: "bet",
  dragFace: "surprised",
  expressions,
  sprite: null,
  animation: {},
  expressionSprites: {},
  lines: {
    arrive: ["harry_arrive0", "companionAlt_arrive"],
    clicked: ["harry_clicked0", "companionAlt_clicked"],
    reading: ["harry_reading0", "companionAlt_reading"],
    sleeping: ["harry_sleeping0", "companionAlt_sleeping"],
    tauntCenter: ["harry_tauntCenter0", "harry_tauntCenter1"],
    dragged: ["harry_dragged0", "companionAlt_dragged"],
    returned: ["harry_returned0", "companionAlt_returned"],
    quidditch: ["harry_quidditch0", "companionAlt_quidditch"],
    praise: ["harry_praise0", "companionAlt_praise"],
    chineseConfirm: ["harry_chineseConfirm0", "companionConfirmAlt"],
    breakReminder: ["harry_breakReminder0", "companionAlt_breakReminder"],
  },
} satisfies Role;
