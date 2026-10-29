interface ConfirmationModalInputs {
  title: string;
  subtitle: string;
  agreeBtnText: string;
  rejectBtnText: string;
}

/** Заголовок, сообщение и варианты действия окна подтверждения. */
export type ConfirmModalInputs = Partial<ConfirmationModalInputs>;
