import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_CONFIGURED } from "./config.js";

export const VEHICLE_TYPES = [
  "T-Board Vehicle Auto (Petrol)",
  "T-Board Vehicle Auto (Gas)",
  "T-Board Vehicle Auto (Diesel)",
  "T-Board Vehicle Taxi",
  "T-Board Vehicle Bus",
  "Own Board Vehicle (Two wheeler)",
  "Own Board Vehicle (Three wheeler)",
  "Own Board Vehicle (Four wheeler)"
];

export const supabase = APP_CONFIGURED ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export function getAnonKeyProjectRef() {
  try {
    const payload = SUPABASE_ANON_KEY.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.ref || "";
  } catch {
    return "";
  }
}

export function getUrlProjectRef() {
  try {
    return new URL(SUPABASE_URL).hostname.split(".")[0];
  } catch {
    return "";
  }
}

export function normalizeRegNo(value) {
  return (value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value) {
  if (!value) return "Not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function daysUntil(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}

export function expiryLabel(value) {
  const days = daysUntil(value);
  if (days === null) return "No expiry";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Ends today";
  if (days <= 7) return `${days} days left`;
  if (days <= 31) return `${Math.ceil(days / 7)} weeks left`;
  return `${Math.ceil(days / 30)} months left`;
}

export function whatsappUrl(number) {
  const digits = String(number || "").replace(/\D/g, "");
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

export function whatsappIcon(number, label = "Open WhatsApp chat") {
  return `<a class="wa-link" href="${whatsappUrl(number)}" target="_blank" rel="noreferrer" title="${label}" aria-label="${label}">
    <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3A12.9 12.9 0 0 0 5 22.7L3.6 29 10 27.5A13 13 0 1 0 16 3Zm0 2.4a10.6 10.6 0 0 1 9 16.2 10.5 10.5 0 0 1-13.8 3.5l-.5-.3-3.7.9.8-3.6-.3-.6A10.6 10.6 0 0 1 16 5.4Zm-4.5 5.2c-.2 0-.5.1-.8.4-.3.4-1 1-1 2.5s1 2.9 1.2 3.1c.2.2 2.1 3.4 5.2 4.6 2.6 1 3.1.8 3.7.8.6-.1 1.8-.8 2-1.5.3-.7.3-1.3.2-1.5l-.7-.4-2.1-1c-.3-.1-.6-.2-.8.2l-.9 1.1c-.2.3-.4.3-.8.1-.4-.2-1.4-.5-2.6-1.6-1-.9-1.7-2-1.9-2.4-.2-.3 0-.5.2-.7l.5-.6c.2-.2.2-.3.4-.6.1-.2 0-.5 0-.6l-1-2.4c-.3-.6-.5-.5-.8-.5h-.5Z"/></svg>
  </a>`;
}

export function statusClass(status) {
  return String(status || "Pending").toLowerCase() === "paid" ? "status paid" : "status pending";
}

export function requireConfigured() {
  if (APP_CONFIGURED && supabase) return true;
  const banner = document.querySelector("[data-config-warning]");
  if (banner) banner.hidden = false;
  return false;
}

export function requireMatchingSupabaseProject() {
  const urlRef = getUrlProjectRef();
  const keyRef = getAnonKeyProjectRef();
  return Boolean(urlRef && keyRef && urlRef === keyRef);
}

export async function requireSession() {
  if (!requireConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "login.html";
    return null;
  }
  return data.session;
}

export async function logout() {
  if (supabase) await supabase.auth.signOut();
  window.location.href = "login.html";
}

export function fillVehicleTypes(select) {
  select.innerHTML = VEHICLE_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("");
}

export async function uploadFile(bucket, file, prefix) {
  if (!file || !file.name || file.size === 0) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${prefix}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeUploadedFile(bucket, publicUrl) {
  if (!publicUrl) return;
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return;
    const filePath = decodeURIComponent(url.pathname.slice(index + marker.length));
    if (filePath) await supabase.storage.from(bucket).remove([filePath]);
  } catch {
    // External URLs from CSV imports cannot be removed from Supabase Storage.
  }
}

export async function removeCustomerFiles(customer) {
  await removeUploadedFile("insurance-invoices", customer.invoice_pdf_url);
  for (const proof of customer.proof_files || []) {
    await removeUploadedFile("customer-proofs", proof.url);
  }
  for (const imageUrl of customer.vehicle_image_urls || []) {
    await removeUploadedFile("vehicle-images", imageUrl);
  }
}

export async function fetchCustomers() {
  const { data, error } = await supabase
    .from("vehicle_insurances")
    .select("*")
    .order("insurance_expiry_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

export function renderConfigWarning() {
  const urlRef = getUrlProjectRef();
  const keyRef = getAnonKeyProjectRef();
  const mismatch = urlRef && keyRef && urlRef !== keyRef;
  return `<div class="config-warning" data-config-warning ${APP_CONFIGURED && !mismatch ? "hidden" : ""}>
    Supabase is not connected yet. Add your project URL and anon key in <strong>assets/config.js</strong>, then run <strong>supabase/schema.sql</strong> in Supabase SQL Editor.
    ${mismatch ? `<br><strong>Current issue:</strong> Project URL uses <strong>${urlRef}</strong>, but anon key belongs to <strong>${keyRef}</strong>. Copy the anon public key from the same Supabase project as the URL.` : ""}
  </div>`;
}

export function nav(active) {
  const items = [
    ["insurance.html", "Insurance"],
    ["dashboard.html", "Dashboard"],
    ["customers.html", "Customers"],
    ["settings.html", "Settings"]
  ];
  return `<nav class="top-nav">
    <a class="brand" href="insurance.html">InsureDesk</a>
    <div class="nav-links">${items.map(([href, label]) => `<a class="${active === label ? "active" : ""}" href="${href}">${label}</a>`).join("")}</div>
    <button class="icon-btn" data-logout title="Logout" aria-label="Logout">
      <svg viewBox="0 0 24 24"><path d="M10 17v-2h4V9h-4V7h6v10h-6Zm-2 4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4v2H8v14h4v2H8Zm9-5-1.4-1.4L18.2 12l-2.6-2.6L17 8l5 4-5 4Z"/></svg>
    </button>
  </nav>`;
}

export function initShell(active) {
  const shell = document.querySelector("[data-shell]");
  if (shell) shell.insertAdjacentHTML("afterbegin", nav(active));
  document.querySelector("[data-logout]")?.addEventListener("click", logout);
}

export function initFileClearButtons(root = document) {
  const syncFileRows = () => {
    root.querySelectorAll(".file-input-row input[type='file']").forEach((input) => {
      const row = input.closest(".file-input-row");
      const button = row?.querySelector("[data-clear-file]");
      if (button) button.hidden = !input.files?.length;
      row?.classList.toggle("has-file", Boolean(input.files?.length));
    });
  };

  root.querySelectorAll(".file-input-row input[type='file']").forEach((input) => {
    const row = input.closest(".file-input-row");
    const button = row?.querySelector("[data-clear-file]");
    if (button) button.hidden = !input.files?.length;
    row?.classList.toggle("has-file", Boolean(input.files?.length));
  });

  root.addEventListener("change", (event) => {
    const input = event.target.closest(".file-input-row input[type='file']");
    if (!input) return;
    const row = input.closest(".file-input-row");
    const button = row?.querySelector("[data-clear-file]");
    const hasFile = Boolean(input.files?.length);
    if (button) button.hidden = !hasFile;
    row?.classList.toggle("has-file", hasFile);
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-clear-file]");
    if (!button) return;
    const form = button.closest("form");
    const input = form?.elements?.[button.dataset.clearFile];
    if (input) {
      input.value = "";
      button.hidden = true;
      button.closest(".file-input-row")?.classList.remove("has-file");
    }
  });

  root.addEventListener("reset", () => {
    setTimeout(syncFileRows, 0);
  });
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
