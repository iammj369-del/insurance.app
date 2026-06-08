import { initShell, renderConfigWarning, requireSession, supabase, uploadFile } from "./app.js";

document.body.insertAdjacentHTML("afterbegin", renderConfigWarning());
initShell("Settings");
const session = await requireSession();

const profileForm = document.querySelector("#profileForm");
const agentForm = document.querySelector("#agentForm");
const agentList = document.querySelector("[data-agents]");
const avatar = document.querySelector("[data-avatar]");
const avatarInput = document.querySelector("[data-avatar-input]");
const avatarTrigger = document.querySelector("[data-avatar-trigger]");
const profileMessage = document.querySelector("[data-profile-message]");
let currentProfile = null;

avatarTrigger?.addEventListener("click", () => {
  avatarInput?.click();
});

avatarInput?.addEventListener("change", () => {
  const file = avatarInput.files?.[0];
  if (!file) return;
  avatar.src = URL.createObjectURL(file);
});

async function loadProfile() {
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("manager_id", session.user.id)
    .maybeSingle();
  if (error) throw error;
  currentProfile = data;
  if (!data) return;
  profileForm.full_name.value = data.full_name || "";
  profileForm.mobile.value = data.mobile || "";
  profileForm.email.value = data.email || session.user.email || "";
  if (data.profile_picture_url) avatar.src = data.profile_picture_url;
}

async function loadAgents() {
  const { data, error } = await supabase
    .from("insurance_agents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  agentList.innerHTML = (data || []).map((agent) => `
    <div class="agent-row">
      <span><strong>${agent.full_name}</strong><small>${agent.mobile} · ${agent.email}</small></span>
      <button class="icon-btn danger" data-delete-agent="${agent.id}" title="Remove agent" aria-label="Remove agent">
        <svg viewBox="0 0 24 24"><path d="M7 21q-.8 0-1.4-.6Q5 19.8 5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .8-.6 1.4-.6.6-1.4.6H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9Z"/></svg>
      </button>
    </div>`).join("") || "<p class=\"muted\">No agents added yet.</p>";
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  profileMessage.textContent = "Saving profile...";
  const formData = new FormData(profileForm);
  try {
    const uploaded = await uploadFile("admin-profiles", formData.get("profile_picture"), session.user.id);
    const payload = {
      manager_id: session.user.id,
      full_name: formData.get("full_name"),
      mobile: formData.get("mobile"),
      email: formData.get("email") || session.user.email,
      profile_picture_url: uploaded || currentProfile?.profile_picture_url || null
    };
    const { data, error } = await supabase
      .from("admin_profiles")
      .upsert(payload, { onConflict: "manager_id" })
      .select()
      .single();
    if (error) throw error;
    currentProfile = data;
    if (data.profile_picture_url) avatar.src = data.profile_picture_url;
    profileMessage.textContent = "Profile saved.";
  } catch (error) {
    profileMessage.textContent = error.message;
  }
});

agentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(agentForm);
  const { error } = await supabase.from("insurance_agents").insert({
    manager_id: session.user.id,
    full_name: formData.get("full_name"),
    mobile: formData.get("mobile"),
    email: formData.get("email")
  });
  if (error) {
    alert(error.message);
    return;
  }
  agentForm.reset();
  await loadAgents();
});

agentList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-agent]");
  if (!button) return;
  const { error } = await supabase.from("insurance_agents").delete().eq("id", button.dataset.deleteAgent);
  if (error) {
    alert(error.message);
    return;
  }
  await loadAgents();
});

await loadProfile();
await loadAgents();
