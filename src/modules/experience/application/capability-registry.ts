import {
  CAPABILITY_ACTIONS,
  type CapabilityAction,
} from "../domain/experience";

export type NavigationCapability = Readonly<{
  href: `/${string}`;
  kind: "navigate";
  label: string;
}>;

const capabilityRegistry: Readonly<
  Record<CapabilityAction, NavigationCapability>
> = {
  ENTER_SALOON: {
    href: "/saloon",
    kind: "navigate",
    label: "进入酒吧大厅",
  },
  OPEN_LIBRARY: {
    href: "/library",
    kind: "navigate",
    label: "前往资料库",
  },
  RETURN_EXTERIOR: {
    href: "/",
    kind: "navigate",
    label: "回到酒吧门外",
  },
};

export function isCapabilityAction(value: string): value is CapabilityAction {
  return CAPABILITY_ACTIONS.includes(value as CapabilityAction);
}

export function resolveCapability(action: CapabilityAction) {
  return capabilityRegistry[action];
}

export function listCapabilities() {
  return CAPABILITY_ACTIONS.map((action) => ({
    action,
    ...capabilityRegistry[action],
  }));
}
