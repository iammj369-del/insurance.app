<<<<<<< HEAD
# InsureDesk Vehicle Insurance Manager

This is a Supabase-backed admin web app for vehicle insurance handling.

## Pages

- `register.html` - admin registration
- `login.html` - admin login and password recovery
- `insurance.html` - vehicle type selector, registration-number search, customer details, manual customer upload, invoice/proof/image uploads, CSV import, CSV export and CSV template download
- `dashboard.html` - paid/pending counts and expiry notifications for days, weeks and months
- `customers.html` - complete owner/customer details, upload status, WhatsApp chat link, proof images and PDFs
- `settings.html` - admin profile picture/details and scalable insurance-agent add/remove management

## Supabase setup

1. Create a free Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run `supabase/schema.sql`.
4. Open Supabase Project Settings, then API.
5. Copy the Project URL and public anon key.
6. Paste them into `assets/config.js`.

Do not place the `service_role` key in this app. Browser apps must use only the public anon key with Row Level Security.

## Where uploads are stored

Uploads are stored in Supabase Storage buckets:

- `insurance-invoices` stores customer insurance invoice PDFs.
- `customer-proofs` stores Aadhar, PAN and other government ID proof PDFs.
- `vehicle-images` stores vehicle proof images.
- `admin-profiles` stores admin profile pictures.

The public URL of each uploaded file is saved in Supabase database rows:

- `vehicle_insurances.invoice_pdf_url`
- `vehicle_insurances.proof_files`
- `vehicle_insurances.vehicle_image_urls`
- `admin_profiles.profile_picture_url`

## CSV import and export

Use `insurance.html` to upload company records as a `.csv` file. The app updates existing rows by `vehicle_reg_no`, so uploading a corrected CSV modifies the matching customer records.

The current CSV can be downloaded anytime from the same page. It exports the latest Supabase records, including updated payment statuses and edited records.

Required CSV columns:

```text
vehicle_type,owner_name,finance_company_name,owner_mobile,vehicle_reg_no,vehicle_company_name,vehicle_model_name,insurance_company_name,fc_expiry_date,insurance_expiry_date,policy_issued_date,permit_expiry_date,invoice_amount,payment_status,invoice_pdf_url,customer_proof_urls,vehicle_image_urls
```

Use `;` to separate multiple proof or image URLs. For customer proof PDFs, use `Name|URL`, for example:

```text
Aadhar|https://example.com/aadhar.pdf;PAN|https://example.com/pan.pdf
```

## Local run

```powershell
npm start
```

Open `http://localhost:8080/register.html`.

## Deploy

This is a static app and can deploy to Netlify or Vercel.

Netlify:
- Build command: leave empty
- Publish directory: `.`

Vercel:
- Framework preset: Other
- Build command: leave empty
- Output directory: `.`

## Mobile app support

The app includes `manifest.webmanifest` and `sw.js`, so after deployment it can be installed on Android/Chrome or added to the iPhone home screen from the browser share menu.

Customer proof uploads support up to 8 PDF files per save.
=======
# insuredesk
>>>>>>> 68ee3893a00b009a2fbcf078688f085d7988ac54
