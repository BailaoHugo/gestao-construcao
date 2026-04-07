import { pool } from "@/lib/db";
import { tocFetch } from "@/lib/toconline";
export const dynamic = "force-dynamic";

export async function GET() {
  // Get a real document ID from our DB that has toconline_id
  let docId = '3108';
  try {
    const r = await pool.query(`SELECT toconline_id FROM despesas WHERE toconline_id IS NOT NULL ORDER BY data_despesa DESC LIMIT 1`);
    if (r.rows[0]?.toconline_id) docId = r.rows[0].toconline_id;
  } catch (_) {}

  const tests: Record<string, unknown> = { docId };

  // Test 1: single document to see full structure
  try {
    const raw = await tocFetch<unknown>(`/commercial_purchases_documents/${docId}`);
    const item = (raw as { data?: unknown }).data ?? raw;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = item as any;
    tests['single_doc_keys'] = Object.keys(a?.attributes ?? a ?? {});
    tests['single_doc_relationships'] = Object.keys(a?.relationships ?? {});
  } catch (e) {
    tests['single_doc_error'] = (e as Error).message.slice(0, 300);
  }

  // Test 2: attachments sub-endpoint
  try {
    const raw = await tocFetch<unknown>(`/commercial_purchases_documents/${docId}/attachments`);
    tests['attachments_endpoint'] = raw;
  } catch (e) {
    tests['attachments_error'] = (e as Error).message.slice(0, 300);
  }

  // Test 3: file_records endpoint
  try {
    const raw = await tocFetch<unknown>(`/file_records?filter="purchases_document_id=${docId}"`);
    tests['file_records'] = raw;
  } catch (e) {
    tests['file_records_error'] = (e as Error).message.slice(0, 300);
  }

  // Test 4: document with include=file_records
  try {
    const raw = await tocFetch<unknown>(`/commercial_purchases_documents/${docId}?include=file_records`);
    tests['doc_with_files'] = raw;
  } catch (e) {
    tests['doc_with_files_error'] = (e as Error).message.slice(0, 300);
  }

  return Response.json(tests);
}
