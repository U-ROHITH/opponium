import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type Variant = "primary" | "secondary" | "ghost" | "danger";

const btn: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-grey-800",
  secondary: "bg-paper text-ink border border-grey-300 hover:border-ink",
  ghost: "text-ink hover:bg-grey-100",
  danger: "bg-paper text-bad border border-grey-300 hover:border-bad",
};

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full h-10 px-5 text-[14px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";

export function Button({ variant = "primary", className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={cx(btnBase, btn[variant], className)} {...rest} />;
}

export function ButtonLink({ to, variant = "primary", className, children }: { to: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={cx(btnBase, btn[variant], className)}>
      {children}
    </Link>
  );
}

export function Field({ label, hint, children, optional }: { label: string; hint?: string; optional?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[13px] font-medium text-grey-800">
        {label}
        {optional && <span className="font-normal text-grey-500">Optional</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1.5 block text-[13px] text-grey-500">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-md border border-grey-300 bg-paper px-3 text-[15px] text-ink placeholder:text-grey-400 hover:border-grey-400 focus:border-ink focus:outline-none read-only:bg-grey-50 read-only:text-grey-600";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputBase, "h-10", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputBase, "py-2.5 min-h-24", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputBase, "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M3 4.5l3 3 3-3%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%221.5%22/></svg>')] bg-[right_12px_center] bg-no-repeat pr-9", className)} {...rest}>
      {children}
    </select>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cx("border-grey-200", className)} />;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold">{title}</h1>
        {sub && <p className="mt-1 text-grey-600">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Initials({ name, size = 32 }: { name: string; size?: number }) {
  const init = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-grey-300 bg-grey-50 font-medium text-grey-700"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {init}
    </span>
  );
}

export function CompanyMark({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-ink font-display font-semibold text-paper"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name[0]}
    </span>
  );
}
