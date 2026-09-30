import { createRuntime } from "./runtime.js";
import { Orchestrator } from "./orchestrator.js";

const runtime = createRuntime();
const orchestrator = new Orchestrator({ runtime });

const result = await orchestrator.runNewLead({
  tenantId: "demo-hvac",
  channel: "PHONE",
  name: "Demo Customer",
  phone: "+13095550100",
  service: "Upstairs AC stopped cooling",
  preferredSlot: "2026-10-01T10:00:00-05:00"
});

console.log(JSON.stringify({
  finalState: result.workflow.state,
  verifiedAction: result.action?.verification,
  auditEvents: runtime.eventStore.forWorkflow(result.workflow.workflowId)
}, null, 2));
