const clean = (value) => String(value ?? "").trim();

export function evaluateTestIntake(input) {
  const name = clean(input.name);
  const rawPhone = clean(input.phone);
  const service = clean(input.service);
  const errors = [];
  if (!name) errors.push("name");
  if (!rawPhone) errors.push("phone");
  if (!service) errors.push("service");
  if (input.consent !== true) errors.push("consent");
  if (errors.length) return { ok: false, errors };

  const digits = rawPhone.replace(/\D/g, "");
  const phone = digits.length === 10 ? `+1${digits}` : digits.startsWith("1") && digits.length === 11 ? `+${digits}` : `+${digits}`;
  const urgency = clean(input.urgency).toLowerCase() || "routine";
  const humanNeeded = urgency === "urgent" || /\b(human|person|complaint|cancel|damage|emergency|urgent)\b/i.test(service);

  return {
    ok: true,
    lead: {
      mode: "TEST_ONLY",
      name,
      phone,
      service,
      urgency,
      humanNeeded,
    },
  };
}
