export type ActionState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export const initialActionState: ActionState = { ok: false };
