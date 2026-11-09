import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Label + control + hint + error, wired together with ids so screen readers
 * announce the hint and error with the control. Errors are text, not just a
 * red border.
 */
type FieldChrome = {
  label: string;
  hint?: string;
  error?: string;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
  className?: string;
};

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  className: string;
};

export function FormField({
  label,
  hint,
  error,
  hideLabel,
  required,
  className,
  id: idProp,
  children,
}: FieldChrome & {
  required?: boolean;
  id?: string;
  children: (control: ControlProps) => React.ReactNode;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={cn("text-body-sm font-medium", hideLabel && "sr-only")}>
        {label}
        {required && (
          <span className="text-muted">
            <span aria-hidden="true"> *</span>
            <span className="sr-only"> (required)</span>
          </span>
        )}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        className: cn(controlBase, error && "border-danger"),
      })}
      {hint && (
        <p id={hintId} className="caption text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const controlBase =
  "w-full min-h-12 rounded-field border border-line-strong bg-surface px-4 text-body text-ink " +
  "placeholder:text-muted/80 transition-colors duration-(--duration-fast) " +
  "hover:border-ink/50 focus-visible:border-ink focus-visible:outline-offset-0 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

type InputFieldProps = FieldChrome & Omit<React.ComponentProps<"input">, "className">;

export function InputField({ label, hint, error, hideLabel, className, id, ...input }: InputFieldProps) {
  return (
    <FormField {...{ label, hint, error, hideLabel, className, id }} required={input.required}>
      {(control) => <input {...input} {...control} />}
    </FormField>
  );
}

type TextareaFieldProps = FieldChrome & Omit<React.ComponentProps<"textarea">, "className">;

export function TextareaField({
  label,
  hint,
  error,
  hideLabel,
  className,
  id,
  rows = 5,
  ...textarea
}: TextareaFieldProps) {
  return (
    <FormField {...{ label, hint, error, hideLabel, className, id }} required={textarea.required}>
      {(control) => (
        <textarea
          rows={rows}
          {...textarea}
          {...control}
          className={cn(control.className, "min-h-32 py-3 leading-relaxed")}
        />
      )}
    </FormField>
  );
}

type SelectFieldProps = FieldChrome &
  Omit<React.ComponentProps<"select">, "className" | "children"> & {
    options: { value: string; label: string }[];
    /** First, empty option (e.g. "Choose a destination"). */
    placeholder?: string;
  };

export function SelectField({
  label,
  hint,
  error,
  hideLabel,
  className,
  id,
  options,
  placeholder,
  ...select
}: SelectFieldProps) {
  return (
    <FormField {...{ label, hint, error, hideLabel, className, id }} required={select.required}>
      {(control) => (
        <div className="relative">
          <select
            {...select}
            {...control}
            className={cn(control.className, "cursor-pointer appearance-none pr-11")}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            fill="none"
            className="pointer-events-none absolute right-4 top-1/2 size-3 -translate-y-1/2"
          >
            <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.25" />
          </svg>
        </div>
      )}
    </FormField>
  );
}
