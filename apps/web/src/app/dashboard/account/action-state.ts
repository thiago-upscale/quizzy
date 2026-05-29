export type AccountActionState = {
  message?: string;
  previewUrl?: string;
  status: "idle" | "success" | "error";
};

export const accountInitialState: AccountActionState = { status: "idle" };
