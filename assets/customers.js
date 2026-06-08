import {
  fetchCustomers,
  fillVehicleTypes,
  formatDate,
  initFileClearButtons,
  initShell,
  normalizeRegNo,
  renderConfigWarning,
  requireSession,
  removeCustomerFiles,
  removeUploadedFile,
  statusClass,
  supabase,
  uploadFile,
  whatsappIcon
} from "./app.js";

document.body.insertAdjacentHTML("afterbegin", renderConfigWarning());
initShell("Customers");
initFileClearButtons();
const session = await requireSession();

const list = document.querySelector("[data-list]");
const details = document.querySelector("[data-details]");
const search = document.querySelector("[data-search]");
const customerForm = document.querySelector("#customerForm");
const saveMessage = document.querySelector("[data-save-message]");
let customers = [];
let selectedCustomer = null;

fillVehicleTypes(document.querySelector("#customer_vehicle_type"));

function fileState(customer) {
  const pdf = customer.invoice_pdf_url ? "Invoice PDF uploaded" : "Invoice PDF missing";
  const proofs = customer.proof_files?.length ? `${customer.proof_files.length} proof PDF uploaded` : "Proof PDFs missing";
  const images = customer.vehicle_image_urls?.length ? `${customer.vehicle_image_urls.length} image uploaded` : "Vehicle images missing";
  return `${pdf} · ${proofs} · ${images}`;
}

function renderList(items) {
  list.innerHTML = items.map((customer) => `
    <button class="customer-row as-button" data-reg="${customer.vehicle_reg_no}">
      <span>
        <strong>${customer.owner_name}</strong>
        <small>${customer.vehicle_reg_no} · ${customer.owner_mobile}</small>
      </span>
      <span class="${statusClass(customer.payment_status)}">${customer.payment_status}</span>
    </button>`).join("") || "<p class=\"muted\">No matching customers.</p>";
}

function renderDetails(customer) {
  selectedCustomer = customer;
  const proofFiles = customer.proof_files || [];
  const images = customer.vehicle_image_urls || [];
  details.hidden = false;
  details.innerHTML = `
    <div class="result-header">
      <div>
        <p class="eyebrow">Complete customer details</p>
        <h2>${customer.owner_name}</h2>
        <p>${customer.vehicle_reg_no} · ${customer.vehicle_type}</p>
      </div>
      <span class="${statusClass(customer.payment_status)}">${customer.payment_status}</span>
    </div>
    <div class="detail-grid">
      <div><span>Owner mobile</span><strong>${customer.owner_mobile} ${whatsappIcon(customer.owner_mobile)}</strong></div>
      <div><span>Finance company</span><strong>${customer.finance_company_name || "Not set"}</strong></div>
      <div><span>Vehicle model</span><strong>${customer.vehicle_company_name} ${customer.vehicle_model_name}</strong></div>
      <div><span>Insurance company</span><strong>${customer.insurance_company_name || "Not set"}</strong></div>
      <div><span>Policy issued date</span><strong>${formatDate(customer.policy_issued_date)}</strong></div>
      <div><span>Insurance expiry date</span><strong>${formatDate(customer.insurance_expiry_date)}</strong></div>
      <div><span>FC expiry date</span><strong>${formatDate(customer.fc_expiry_date)}</strong></div>
      <div><span>Permit expiry date</span><strong>${formatDate(customer.permit_expiry_date)}</strong></div>
      <div class="wide-detail"><span>Upload status</span><strong>${fileState(customer)}</strong></div>
    </div>
    <div class="action-row">
      <button class="btn secondary" data-toggle-status>${customer.payment_status === "Paid" ? "Mark Pending" : "Mark Paid"}</button>
      <button class="btn danger" type="button" data-remove-customer>Remove Customer</button>
      ${customer.invoice_pdf_url ? `<a class="btn primary" href="${customer.invoice_pdf_url}" target="_blank" rel="noreferrer">View Invoice PDF</a><button class="btn danger" type="button" data-remove-invoice>Remove Invoice PDF</button>` : ""}
    </div>
    <section class="uploads-panel">
      <h3>Customer government ID proof PDFs</h3>
      ${proofFiles.length ? proofFiles.map((proof, index) => `<div class="file-row"><a href="${proof.url}" target="_blank" rel="noreferrer">${proof.name}</a><button class="remove-file" type="button" data-remove-proof="${index}">Remove</button></div>`).join("") : "<p class=\"muted\">No Aadhar, PAN or other ID proof PDFs uploaded.</p>"}
    </section>
    <section class="uploads-panel">
      <h3>Vehicle proof images</h3>
      <div class="image-grid">${images.length ? images.map((url, index) => `<div class="image-item"><a href="${url}" target="_blank" rel="noreferrer"><img src="${url}" alt="Vehicle proof"></a><button class="remove-file" type="button" data-remove-image="${index}">Remove</button></div>`).join("") : "<p class=\"muted\">No images uploaded.</p>"}</div>
    </section>`;

  details.querySelector("[data-toggle-status]")?.addEventListener("click", async () => {
    const payment_status = customer.payment_status === "Paid" ? "Pending" : "Paid";
    const { data, error } = await supabase
      .from("vehicle_insurances")
      .update({ payment_status })
      .eq("id", customer.id)
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    customers = customers.map((item) => item.id === data.id ? data : item);
    renderList(customers);
    renderDetails(data);
  });

  details.querySelector("[data-remove-invoice]")?.addEventListener("click", async () => {
    try {
      await removeUploadedFile("insurance-invoices", customer.invoice_pdf_url);
      await updateCustomerUploads(customer.id, { invoice_pdf_url: null });
    } catch (error) {
      alert(error.message);
    }
  });

  details.querySelector("[data-remove-customer]")?.addEventListener("click", async () => {
    const confirmed = window.confirm(`Remove ${customer.owner_name} and all linked uploads from this system?`);
    if (!confirmed) return;
    try {
      await removeCustomerFiles(customer);
      const { error } = await supabase.from("vehicle_insurances").delete().eq("id", customer.id);
      if (error) throw error;
      customers = customers.filter((item) => item.id !== customer.id);
      selectedCustomer = null;
      details.hidden = true;
      details.innerHTML = "";
      customerForm.reset();
      renderList(customers);
      saveMessage.textContent = "Customer removed.";
    } catch (error) {
      alert(error.message);
    }
  });

  details.querySelectorAll("[data-remove-proof]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const proofs = [...(customer.proof_files || [])];
        const [removed] = proofs.splice(Number(button.dataset.removeProof), 1);
        await removeUploadedFile("customer-proofs", removed?.url);
        await updateCustomerUploads(customer.id, { proof_files: proofs });
      } catch (error) {
        alert(error.message);
      }
    });
  });

  details.querySelectorAll("[data-remove-image]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const images = [...(customer.vehicle_image_urls || [])];
        const [removed] = images.splice(Number(button.dataset.removeImage), 1);
        await removeUploadedFile("vehicle-images", removed);
        await updateCustomerUploads(customer.id, { vehicle_image_urls: images });
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

async function updateCustomerUploads(id, patch) {
  const { data, error } = await supabase
    .from("vehicle_insurances")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  customers = customers.map((item) => item.id === data.id ? data : item);
  selectedCustomer = data;
  renderList(customers);
  renderDetails(data);
  fillCustomerForm(data);
}

function fillCustomerForm(customer) {
  customerForm.vehicle_type.value = customer.vehicle_type || "";
  customerForm.owner_name.value = customer.owner_name || "";
  customerForm.finance_company_name.value = customer.finance_company_name || "";
  customerForm.owner_mobile.value = customer.owner_mobile || "";
  customerForm.vehicle_reg_no.value = customer.vehicle_reg_no || "";
  customerForm.vehicle_company_name.value = customer.vehicle_company_name || "";
  customerForm.vehicle_model_name.value = customer.vehicle_model_name || "";
  customerForm.insurance_company_name.value = customer.insurance_company_name || "";
  customerForm.fc_expiry_date.value = customer.fc_expiry_date || "";
  customerForm.insurance_expiry_date.value = customer.insurance_expiry_date || "";
  customerForm.policy_issued_date.value = customer.policy_issued_date || "";
  customerForm.permit_expiry_date.value = customer.permit_expiry_date || "";
  customerForm.invoice_amount.value = customer.invoice_amount || "";
  customerForm.payment_status.value = customer.payment_status || "Pending";
}

list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-reg]");
  if (!button) return;
  const customer = customers.find((item) => item.vehicle_reg_no === button.dataset.reg);
  if (customer) {
    renderDetails(customer);
    fillCustomerForm(customer);
  }
});

customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!session) return;
  saveMessage.textContent = "Saving customer data...";
  const formData = new FormData(customerForm);
  const regNo = normalizeRegNo(formData.get("vehicle_reg_no"));
  const existing = customers.find((item) => normalizeRegNo(item.vehicle_reg_no) === regNo);
  const prefix = `${session.user.id}/${regNo || "vehicle"}`;
  if (customerForm.customer_proofs.files.length > 8) {
    saveMessage.textContent = "Upload a maximum of 8 customer proof PDFs at a time.";
    return;
  }

  try {
    const invoicePdf = await uploadFile("insurance-invoices", formData.get("invoice_pdf"), prefix);
    const proofFiles = [];
    for (const file of customerForm.customer_proofs.files) {
      const url = await uploadFile("customer-proofs", file, prefix);
      if (url) proofFiles.push({ name: file.name, url });
    }
    const vehicleImages = [];
    for (const file of customerForm.vehicle_images.files) {
      const url = await uploadFile("vehicle-images", file, prefix);
      if (url) vehicleImages.push(url);
    }

    const payload = {
      manager_id: session.user.id,
      vehicle_type: formData.get("vehicle_type"),
      owner_name: formData.get("owner_name"),
      finance_company_name: formData.get("finance_company_name"),
      owner_mobile: formData.get("owner_mobile"),
      vehicle_reg_no: regNo,
      vehicle_model_name: formData.get("vehicle_model_name"),
      vehicle_company_name: formData.get("vehicle_company_name"),
      insurance_company_name: formData.get("insurance_company_name"),
      fc_expiry_date: formData.get("fc_expiry_date") || null,
      insurance_expiry_date: formData.get("insurance_expiry_date") || null,
      policy_issued_date: formData.get("policy_issued_date") || null,
      permit_expiry_date: formData.get("permit_expiry_date") || null,
      invoice_amount: Number(formData.get("invoice_amount") || 0),
      payment_status: formData.get("payment_status")
    };

    if (invoicePdf) payload.invoice_pdf_url = invoicePdf;
    if (proofFiles.length) payload.proof_files = [...(existing?.proof_files || selectedCustomer?.proof_files || []), ...proofFiles];
    if (vehicleImages.length) payload.vehicle_image_urls = [...(existing?.vehicle_image_urls || selectedCustomer?.vehicle_image_urls || []), ...vehicleImages];

    const { data, error } = await supabase
      .from("vehicle_insurances")
      .upsert(payload, { onConflict: "manager_id,vehicle_reg_no" })
      .select()
      .single();
    if (error) throw error;

    customers = customers.some((item) => item.id === data.id)
      ? customers.map((item) => item.id === data.id ? data : item)
      : [data, ...customers];
    selectedCustomer = data;
    renderList(customers);
    renderDetails(data);
    fillCustomerForm(data);
    saveMessage.textContent = "Customer and insurance details saved.";
  } catch (error) {
    saveMessage.textContent = error.message;
  }
});

search.addEventListener("input", () => {
  const term = search.value.toLowerCase();
  renderList(customers.filter((customer) =>
    customer.owner_name.toLowerCase().includes(term) ||
    customer.vehicle_reg_no.toLowerCase().includes(term) ||
    customer.owner_mobile.toLowerCase().includes(term)
  ));
});

customers = await fetchCustomers();
renderList(customers);

const targetReg = new URLSearchParams(window.location.search).get("reg");
if (targetReg) {
  const customer = customers.find((item) => item.vehicle_reg_no === targetReg);
  if (customer) {
    renderDetails(customer);
    fillCustomerForm(customer);
  }
}
