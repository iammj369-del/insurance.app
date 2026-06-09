import { daysUntil, expiryLabel, fetchAgents, fetchCustomers, formatDate, initShell, renderConfigWarning, requireSession, statusClass, supabase } from "./app.js";

document.body.insertAdjacentHTML("afterbegin", renderConfigWarning());
initShell("Dashboard");
const session = await requireSession();

const stats = document.querySelector("[data-stats]");
const alerts = document.querySelector("[data-alerts]");
const customersList = document.querySelector("[data-customers]");
const profileBubble = document.querySelector("[data-profile-bubble]");
let agents = [];

function agentFor(customer) {
  return agents.find((agent) => agent.id === customer.insurance_agent_id);
}

function countDue(customers, maxDays) {
  return customers.filter((customer) => {
    const days = daysUntil(customer.insurance_expiry_date);
    return days !== null && days <= maxDays;
  }).length;
}

function render(customers) {
  const paid = customers.filter((customer) => customer.payment_status === "Paid").length;
  const pending = customers.length - paid;
  stats.innerHTML = `
    <div class="stat"><span>Total customers</span><strong>${customers.length}</strong></div>
    <div class="stat success"><span>Paid</span><strong>${paid}</strong></div>
    <div class="stat danger"><span>Pending</span><strong>${pending}</strong></div>
    <div class="stat warn"><span>Ending in 30 days</span><strong>${countDue(customers, 30)}</strong></div>`;

  const urgent = customers.filter((customer) => {
    const days = daysUntil(customer.insurance_expiry_date);
    return days !== null && days <= 90;
  });

  alerts.innerHTML = urgent.length ? urgent.map((customer) => `
    <a class="alert-row" href="customers.html?reg=${customer.vehicle_reg_no}">
      <strong>${customer.owner_name}</strong>
      <span>${customer.vehicle_reg_no}</span>
      ${agentFor(customer) ? `<span>Agent: ${agentFor(customer).full_name}</span>` : ""}
      <em>${expiryLabel(customer.insurance_expiry_date)}</em>
    </a>`).join("") : "<p class=\"muted\">No insurance expiry alerts within the next few months.</p>";

  customersList.innerHTML = customers.map((customer) => `
    <a class="customer-row" href="customers.html?reg=${customer.vehicle_reg_no}">
      <span>
        <strong>${customer.owner_name}</strong>
        <small>${customer.vehicle_reg_no} · ${customer.vehicle_company_name} ${customer.vehicle_model_name}</small>
      </span>
      <span>${formatDate(customer.insurance_expiry_date)}</span>
      <span class="${statusClass(customer.payment_status)}">${customer.payment_status}</span>
    </a>`).join("") || "<p class=\"muted\">No customers added yet.</p>";
}

try {
  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("profile_picture_url")
    .eq("manager_id", session.user.id)
    .maybeSingle();
  if (profile?.profile_picture_url) {
    profileBubble.style.backgroundImage = `url("${profile.profile_picture_url}")`;
  }
  agents = await fetchAgents();
  render(await fetchCustomers());
} catch (error) {
  alerts.innerHTML = `<p class="error-text">${error.message}</p>`;
}
