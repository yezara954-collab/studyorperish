import draco from "./draco";
import harry from "./harry";
import ron from "./ron";
import hermione from "./hermione";
import type { CompanionId, Role } from "./types";

export const companionIds = ["draco", "harry", "ron", "hermione"] as const;
export const roles: Record<CompanionId, Role> = { draco, harry, ron, hermione };
