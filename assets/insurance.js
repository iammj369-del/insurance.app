import {
  fillVehicleTypes,
  fetchCustomers,
  formatDate,
  initFileClearButtons,
  initShell,
  money,
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
initShell("Insurance");
initFileClearButtons();

const session = await requireSession();
const vehicleType = document.querySelector("#vehicle_type");
const searchForm = document.querySelector("#searchForm");
const result = document.querySelector("#result");
const csvForm = document.querySelector("#csvForm");
const csvMessage = document.querySelector("[data-csv-message]");
const downloadCsv = document.querySelector("[data-download-csv]");
const customerForm = document.querySelector("#customerForm");
const saveMessage = document.querySelector("[data-save-message]");
let selectedCustomer = null;

const CSV_COLUMNS = [
  "vehicle_type",
  "owner_name",
  "finance_company_name",
  "owner_mobile",
  "vehicle_reg_no",
  "vehicle_company_name",
  "vehicle_model_name",
  "insurance_company_name",
  "fc_expiry_date",
  "insurance_expiry_date",
  "policy_issued_date",
  "permit_expiry_date",
  "invoice_amount",
  "payment_status",
  "invoice_pdf_url",
  "customer_proof_urls",
  "vehicle_image_urls"
];

fillVehicleTypes(vehicleType);
fillVehicleTypes(document.querySelector("#customer_vehicle_type"));

function proofList(customer) {
  const proofs = customer.proof_files || [];
  if (!proofs.length) return "<p class=\"muted\">No customer proof PDFs uploaded yet.</p>";
  return proofs.map((proof, index) => `<div class="file-row">
    <a href="${proof.url}" target="_blank" rel="noreferrer">${proof.name}</a>
    <button class="remove-file" type="button" data-remove-proof="${index}">Remove</button>
  </div>`).join("");
}

function imageGrid(customer) {
  const images = customer.vehicle_image_urls || [];
  if (!images.length) return "<p class=\"muted\">No vehicle proof images uploaded yet.</p>";
  return images.map((url, index) => `<div class="image-item">
    <a href="${url}" target="_blank" rel="noreferrer"><img src="${url}" alt="Vehicle proof image"></a>
    <button class="remove-file" type="button" data-remove-image="${index}">Remove</button>
  </div>`).join("");
}

function renderCustomer(customer) {
  selectedCustomer = customer;
  result.hidden = false;
  result.innerHTML = `<section class="result-header">
    <div>
      <p class="eyebrow">${customer.vehicle_type}</p>
      <h2>${customer.owner_name}</h2>
      <p>${customer.vehicle_reg_no} · ${customer.vehicle_company_name} ${customer.vehicle_model_name}</p>
    </div>
    <span class="${statusClass(customer.payment_status)}">${customer.payment_status}</span>
  </section>
  <section class="detail-grid">
    <div><span>Finance company</span><strong>${customer.finance_company_name || "Not set"}</strong></div>
    <div><span>Owner mobile</span><strong>${customer.owner_mobile || "Not set"} ${whatsappIcon(customer.owner_mobile)}</strong></div>
    <div><span>Insurance company</span><strong>${customer.insurance_company_name || "Not set"}</strong></div>
    <div><span>Invoice amount</span><strong>${money(customer.invoice_amount)}</strong></div>
    <div><span>Policy issued</span><strong>${formatDate(customer.policy_issued_date)}</strong></div>
    <div><span>Insurance expiry</span><strong>${formatDate(customer.insurance_expiry_date)}</strong></div>
    <div><span>FC expiry</span><strong>${formatDate(customer.fc_expiry_date)}</strong></div>
    <div><span>Permit expiry</span><strong>${formatDate(customer.permit_expiry_date)}</strong></div>
  </section>
  <section class="uploads-panel">
    <h3>Insurance invoice PDF</h3>
    ${customer.invoice_pdf_url ? `<div class="file-row"><a href="${customer.invoice_pdf_url}" target="_blank" rel="noreferrer">Open uploaded invoice PDF</a><button class="remove-file" type="button" data-remove-invoice>Remove</button></div>` : "<p class=\"muted\">Invoice PDF is not uploaded.</p>"}
  </section>
  <section class="uploads-panel">
    <h3>Customer proof PDFs</h3>
    ${proofList(customer)}
  </section>
  <section class="uploads-panel">
    <h3>Vehicle proof images</h3>
    <div class="image-grid">${imageGrid(customer)}</div>
  </section>
  <div class="action-row">
    <button class="btn danger" type="button" data-remove-customer>Remove Customer</button>
  </div>`;
}

async function updateSelectedUploads(patch) {
  if (!selectedCustomer) return;
  const { data, error } = await supabase
    .from("vehicle_insurances")
    .update(patch)
    .eq("id", selectedCustomer.id)
    .select()
    .single();
  if (error) throw error;
  renderCustomer(data);
}

result.addEventListener("click", async (event) => {
  if (!selectedCustomer) return;
  const invoiceButton = event.target.closest("[data-remove-invoice]");
  const proofButton = event.target.closest("[data-remove-proof]");
  const imageButton = event.target.closest("[data-remove-image]");
  const customerButton = event.target.closest("[data-remove-customer]");
  if (!invoiceButton && !proofButton && !imageButton && !customerButton) return;

  try {
    if (customerButton) {
      const confirmed = window.confirm(`Remove ${selectedCustomer.owner_name} and all linked uploads from this system?`);
      if (!confirmed) return;
      await removeCustomerFiles(selectedCustomer);
      const { error } = await supabase.from("vehicle_insurances").delete().eq("id", selectedCustomer.id);
      if (error) throw error;
      selectedCustomer = null;
      result.hidden = false;
      result.innerHTML = `<div class="empty-state"><h2>Customer removed</h2><p>The customer record and linked uploads were removed from this system.</p></div>`;
      return;
    }
    if (invoiceButton) {
      await removeUploadedFile("insurance-invoices", selectedCustomer.invoice_pdf_url);
      await updateSelectedUploads({ invoice_pdf_url: null });
      return;
    }
    if (proofButton) {
      const index = Number(proofButton.dataset.removeProof);
      const proofs = [...(selectedCustomer.proof_files || [])];
      const [removed] = proofs.splice(index, 1);
      await removeUploadedFile("customer-proofs", removed?.url);
      await updateSelectedUploads({ proof_files: proofs });
      return;
    }
    if (imageButton) {
      const index = Number(imageButton.dataset.removeImage);
      const images = [...(selectedCustomer.vehicle_image_urls || [])];
      const [removed] = images.splice(index, 1);
      await removeUploadedFile("vehicle-images", removed);
      await updateSelectedUploads({ vehicle_image_urls: images });
    }
  } catch (error) {
    alert(error.message);
  }
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!session) return;
  const regNo = normalizeRegNo(new FormData(searchForm).get("reg_no"));
  const customers = await fetchCustomers();
  const found = customers.find((item) => normalizeRegNo(item.vehicle_reg_no) === regNo);
  if (!found) {
    result.hidden = false;
    result.innerHTML = `<div class="empty-state"><h2>No record found</h2><p>Upload a CSV below or add this customer manually using the form.</p></div>`;
    customerForm.vehicle_reg_no.value = regNo;
    return;
  }
  renderCustomer(found);
});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function downloadFile(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function splitUrls(value) {
  return String(value || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function proofUrls(value) {
  return splitUrls(value).map((entry, index) => {
    const [name, url] = entry.includes("|") ? entry.split("|") : [`Proof ${index + 1}`, entry];
    return { name: name.trim() || `Proof ${index + 1}`, url: (url || "").trim() };
  }).filter((proof) => proof.url);
}

function rowToPayload(headers, row) {
  const record = Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]));
  const regNo = normalizeRegNo(record.vehicle_reg_no);
  if (!regNo) throw new Error("Every CSV row must include vehicle_reg_no.");
  return {
    manager_id: session.user.id,
    vehicle_type: record.vehicle_type,
    owner_name: record.owner_name,
    finance_company_name: record.finance_company_name,
    owner_mobile: record.owner_mobile,
    vehicle_reg_no: regNo,
    vehicle_company_name: record.vehicle_company_name,
    vehicle_model_name: record.vehicle_model_name,
    insurance_company_name: record.insurance_company_name,
    fc_expiry_date: record.fc_expiry_date || null,
    insurance_expiry_date: record.insurance_expiry_date || null,
    policy_issued_date: record.policy_issued_date || null,
    permit_expiry_date: record.permit_expiry_date || null,
    invoice_amount: Number(record.invoice_amount || 0),
    payment_status: record.payment_status === "Paid" ? "Paid" : "Pending",
    invoice_pdf_url: record.invoice_pdf_url || null,
    proof_files: proofUrls(record.customer_proof_urls),
    vehicle_image_urls: splitUrls(record.vehicle_image_urls)
  };
}

function recordsToCsv(records) {
  const rows = records.map((record) => [
    record.vehicle_type,
    record.owner_name,
    record.finance_company_name,
    record.owner_mobile,
    record.vehicle_reg_no,
    record.vehicle_company_name,
    record.vehicle_model_name,
    record.insurance_company_name,
    record.fc_expiry_date,
    record.insurance_expiry_date,
    record.policy_issued_date,
    record.permit_expiry_date,
    record.invoice_amount,
    record.payment_status,
    record.invoice_pdf_url,
    (record.proof_files || []).map((proof) => `${proof.name}|${proof.url}`).join(";"),
    (record.vehicle_image_urls || []).join(";")
  ]);
  return [CSV_COLUMNS, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

csvForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!session) return;
  const file = csvForm.csv_file.files?.[0];
  if (!file) return;
  csvMessage.textContent = "Uploading CSV records...";

  try {
    const rows = parseCsv(await file.text());
    const headers = rows.shift()?.map((header) => header.trim()) || [];
    const missing = CSV_COLUMNS.filter((column) => !headers.includes(column));
    if (missing.length) throw new Error(`CSV missing columns: ${missing.join(", ")}`);
    const payload = rows.map((row) => rowToPayload(headers, row));
    if (!payload.length) throw new Error("CSV has no data rows.");
    const { error } = await supabase
      .from("vehicle_insurances")
      .upsert(payload, { onConflict: "manager_id,vehicle_reg_no" });
    if (error) throw error;

    csvForm.reset();
    csvMessage.textContent = `${payload.length} records uploaded. Search a registration number to view the imported details.`;
  } catch (error) {
    csvMessage.textContent = error.message;
  }
});

customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!session) return;
  saveMessage.textContent = "Saving customer data...";
  const formData = new FormData(customerForm);
  const regNo = normalizeRegNo(formData.get("vehicle_reg_no"));
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
    if (proofFiles.length) payload.proof_files = [...(selectedCustomer?.proof_files || []), ...proofFiles];
    if (vehicleImages.length) payload.vehicle_image_urls = [...(selectedCustomer?.vehicle_image_urls || []), ...vehicleImages];

    const { data, error } = await supabase
      .from("vehicle_insurances")
      .upsert(payload, { onConflict: "manager_id,vehicle_reg_no" })
      .select()
      .single();
    if (error) throw error;

    saveMessage.textContent = "Customer and insurance details saved.";
    customerForm.reset();
    renderCustomer(data);
  } catch (error) {
    saveMessage.textContent = error.message;
  }
});

downloadCsv.addEventListener("click", async () => {
  if (!session) return;
  csvMessage.textContent = "Preparing current CSV...";
  try {
    const records = await fetchCustomers();
    downloadFile(`insurance-records-${new Date().toISOString().slice(0, 10)}.csv`, recordsToCsv(records));
    csvMessage.textContent = "Current CSV downloaded.";
  } catch (error) {
    csvMessage.textContent = error.message;
  }
});
