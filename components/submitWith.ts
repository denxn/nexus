import { startTransition, type FormEvent } from "react";

/**
 * Submits a form through `onSubmit` instead of its `action` prop.
 * With `action`, React resets the form after the action finishes, even when validation failed. Controlled
 * radios and selects whose state did not change then fall back to their first option in the DOM while the
 * screen still shows the user's choice, so the next submit posts the wrong value (a Sleep entry saved as Study).
 * Calling the action manually inside a transition keeps the form exactly as the user left it.
 */
export function submitWith(formAction: (payload: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
}
