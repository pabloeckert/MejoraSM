import { readFile } from "node:fs/promises";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function uploadAndProcess(filePath, fileName, mimeType) {
  const buf = await readFile(filePath);
  const storagePath = `test-${Date.now()}-${fileName}`;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/vault/${storagePath}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": mimeType, "x-upsert": "true" },
    body: buf,
  });
  if (!uploadRes.ok) throw new Error(`Upload falló: ${uploadRes.status} ${await uploadRes.text()}`);

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ title: `[TEST EXTRACCION] ${fileName}`, file_path: storagePath, file_type: mimeType }),
  });
  if (!insertRes.ok) throw new Error(`Insert falló: ${insertRes.status} ${await insertRes.text()}`);
  const [doc] = await insertRes.json();
  console.log(`Documento creado: ${doc.id} (${fileName})`);

  const processRes = await fetch(`${SUPABASE_URL}/functions/v1/vault-process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "process", documentId: doc.id }),
  });
  console.log(`vault-process (${fileName}):`, processRes.status, await processRes.text());

  const finalRes = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?id=eq.${doc.id}&select=id,content,processing_status,processing_error,word_count`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  console.log(`Estado final (${fileName}):`, JSON.stringify(await finalRes.json(), null, 2));
  return doc.id;
}

const pdfId = await uploadAndProcess("test-real.pdf", "test-real.pdf", "application/pdf");
const docxId = await uploadAndProcess(
  "test-real.docx",
  "test-real.docx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
);
console.log("IDS_PARA_LIMPIAR:", pdfId, docxId);
