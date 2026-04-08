interface ConfirmationModalInputs {
  title: string;
  subtitle: string;
  agreeBtnText: string;
  rejectBtnText: string;
}

export type ConfirmModalInputs = Partial<ConfirmationModalInputs>;
