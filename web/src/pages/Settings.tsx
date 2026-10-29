import { useState } from "react";
import { Button, Field, FormError, Input, PageHeader, Select } from "../components/ui";
import type { User } from "../data/types";
import { api, errorText } from "../lib/api";
import { useAuth, useMe } from "../lib/auth";
import { formatPhone } from "../lib/time";

const YEARS = [2023, 2024, 2025, 2026, 2027, 2028];

export function Settings() {
  const me = useMe();
  const { setUser } = useAuth();
  const team = me.role !== "candidate";
  const [form, setForm] = useState({
    name: me.name,
    college: me.college,
    grad_year: String(me.grad_year ?? 2026),
    city: me.city,
    linkedin: me.linkedin,
    title: me.title,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSaved(false);
    setForm({ ...form, [k]: e.target.value });
  };
  const years = form.grad_year && !YEARS.includes(Number(form.grad_year)) ? [...YEARS, Number(form.grad_year)] : YEARS;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Your profile" sub={team ? "Candidates see your name and title." : "This fills in every application for you."} />
      <form
        className="mt-8 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          setSaved(false);
          const body = team
            ? { name: form.name.trim(), title: form.title.trim() }
            : { name: form.name.trim(), college: form.college.trim(), grad_year: Number(form.grad_year), city: form.city.trim(), linkedin: form.linkedin.trim() };
          try {
            setUser(await api.patch<User>("/api/auth/me", body));
            setSaved(true);
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Full name">
          <Input value={form.name} onChange={set("name")} autoComplete="name" required />
        </Field>
        {team ? (
          <Field label="Job title">
            <Input value={form.title} onChange={set("title")} autoComplete="organization-title" />
          </Field>
        ) : (
          <>
            <Field label="College or current company">
              <Input value={form.college} onChange={set("college")} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Graduation year">
                <Select value={form.grad_year} onChange={set("grad_year")}>
                  {years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </Select>
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={set("city")} autoComplete="address-level2" required />
              </Field>
            </div>
            <Field label="LinkedIn or portfolio" optional>
              <Input value={form.linkedin} onChange={set("linkedin")} />
            </Field>
          </>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" hint="Verified">
            <Input value={me.email} readOnly />
          </Field>
          <Field label="Phone" hint="Verified">
            <Input value={formatPhone(me.phone)} readOnly className="tnum" />
          </Field>
        </div>
        <FormError>{error}</FormError>
        <div className="flex items-center gap-4 border-t border-grey-200 pt-6">
          <Button disabled={busy}>{busy ? "Saving" : "Save changes"}</Button>
          {saved && (
            <span className="text-[14px] text-grey-600" role="status">
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
