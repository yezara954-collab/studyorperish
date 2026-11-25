import { expressions, type Role } from "./types";

export default {
  id: "hermione",
  displayName: "hermioneName",
  personality: ["hermionePersonality"],
  centerBehavior: "quiz",
  dragFace: "surprised",
  expressions,
  sprite: null,
  animation: {},
  expressionSprites: {},
  lines: {
    arrive: ["hermione_arrive0", "companionAlt_arrive"],
    clicked: ["hermione_clicked0", "companionAlt_clicked"],
    reading: ["hermione_reading0", "companionAlt_reading"],
    sleeping: ["hermione_sleeping0", "companionAlt_sleeping"],
    tauntCenter: ["hermione_tauntCenter0", "hermione_tauntCenter1"],
    dragged: ["hermione_dragged0", "companionAlt_dragged"],
    returned: ["hermione_returned0", "companionAlt_returned"],
    quidditch: ["hermione_quidditch0", "companionAlt_quidditch"],
    praise: ["hermione_praise0", "companionAlt_praise"],
    chineseConfirm: ["hermione_chineseConfirm0", "companionConfirmAlt"],
    breakReminder: ["hermione_breakReminder0", "companionAlt_breakReminder"],
  },
} satisfies Role;
