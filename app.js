import { evaluateTestIntake } from "./intake.mjs";

const form = document.querySelector("#test-intake");
const result = document.querySelector("#intake-result");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const outcome = evaluateTestIntake({
    name: data.get("name"),
    phone: data.get("phone"),
    service: data.get("service"),
    urgency: data.get("urgency"),
    consent: data.get("consent") === "on",
  });

  if (!outcome.ok) {
    result.textContent = `Complete: ${outcome.errors.join(", ")}.`;
    result.dataset.state = "error";
    return;
  }

  sessionStorage.setItem("galor-receptionist-test-intake", JSON.stringify(outcome.lead));
  result.dataset.state = "success";
  result.textContent = outcome.lead.humanNeeded
    ? "Test captured. Preview outcome: HUMAN NEEDED. No text was sent."
    : "Test captured. Preview outcome: LEAD INTAKE. No data was sent.";
  form.reset();
});
