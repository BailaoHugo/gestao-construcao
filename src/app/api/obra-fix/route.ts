import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'fix2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  const report: Record<string, unknown> = {};

  try {
    await client.query('BEGIN');

    // ── 1. APAGAR duplicados VDA/06396 (manter o mais antigo) ──
    const del1 = await client.query(`
      DELETE FROM despesas WHERE id IN (
        'daa5e2da-2433-448e-a815-4d3b87a65b17',
        '2e966b8a-e524-4330-a2bb-b81f639a090d'
      )
    `);
    report['del_vda06396'] = del1.rowCount + ' linhas apagadas';

    // ── 2. APAGAR duplicados LIGHTHOUSE FC vs VDA ──
    const del2 = await client.query(`
      DELETE FROM despesas WHERE id IN (
        'bc9f6c8f-8b72-4bd0-95aa-d821ccb2b192',
        '59132117-de45-4542-9fa9-b3eba90a0572',
        '0d2add33-5305-481e-9016-e1c6798ce76e',
        'fd1766fd-f056-4629-95f6-adb27246363c',
        'b34f21d5-b93d-4f02-839b-56ba973c2cac'
      )
    `);
    report['del_lighthouse_fc'] = del2.rowCount + ' duplicados LIGHTHOUSE FC apagados';

    // ── 3. APAGAR duplicados EDIMEL FC vs FR ──
    const del3 = await client.query(`
      DELETE FROM despesas WHERE id IN (
        'c815c0f6-4ecd-4862-8e28-0bf55dfb8eee',
        'b26c9dce-a535-40a0-a115-e24dfd0a1b47',
        '610527c1-97e2-4907-91e2-c61d8326df47',
        'd9f4f79f-6bd8-4a0d-9dd8-9c864373e09c',
        'd9d73a17-a415-4cc6-9cfb-b828a174a697',
        '9b0085f6-7baf-4f09-9bfc-d7e3ab6530db'
      )
    `);
    report['del_edimel_fc'] = del3.rowCount + ' duplicados EDIMEL FC apagados';

    // ── 4. APAGAR duplicado XIMINO FC ──
    const del4 = await client.query(`
      DELETE FROM despesas WHERE id = 'dd5ebe81-bfd2-4d15-bd9e-333bd31c82e5'
    `);
    report['del_ximino_fc'] = del4.rowCount + ' duplicado XIMINO FC apagado';

    // ── 5. CORRIGIR Solid Projects → fornecedor real + subempreitada ──
    // FR ATSIRE01FR/7 — NIF 228172489 — Serviços de limpezas
    const upd1 = await client.query(`
      UPDATE despesas
      SET fornecedor = 'Empresa de Limpezas (NIF 228172489)',
          tipo = 'subempreitada'
      WHERE id = 'f656a622-f58a-4f3d-9d2d-41f553aaa92d'
    `);
    report['fix_limpezas'] = upd1.rowCount + ' linha actualizada (limpezas → subempreitada)';

    // CFA 2026/12 — João M.G.Ribeiro — NIF 170518965
    const upd2 = await client.query(`
      UPDATE despesas
      SET fornecedor = 'João M.G.Ribeiro',
          tipo = 'subempreitada'
      WHERE id = '36a46aeb-a9a0-4678-a24b-9513600316d0'
    `);
    report['fix_ribeiro'] = upd2.rowCount + ' linha actualizada (Ribeiro → subempreitada)';

    // ── 6. Já scannadas como subempreitada mas tipo errado ──
    // Sofisticação Presente FR SerieA/93 (800€) ficou como 'outros'
    const upd3 = await client.query(`
      UPDATE despesas
      SET tipo = 'subempreitada'
      WHERE id = 'edd95da1-c4f9-4dd8-afaf-95ae0f3855dd'
      AND tipo != 'subempreitada'
    `);
    report['fix_sofisticacao_93'] = upd3.rowCount + ' linha actualizada (Sofisticação FR93 → subempreitada)';

    await client.query('COMMIT');

    // ── 7. Contar resultado final ──
    const { rows } = await client.query(`
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN tipo='materiais' OR tipo='equipamentos' THEN valor_sem_iva ELSE 0 END)::float AS materiais,
        SUM(CASE WHEN tipo='subempreitada' THEN valor_sem_iva ELSE 0 END)::float AS subempreitadas,
        SUM(CASE WHEN tipo='outros' THEN valor_sem_iva ELSE 0 END)::float AS outros,
        SUM(valor_sem_iva)::float AS total_valor
      FROM despesas d
      JOIN obras o ON o.id = d.centro_custo_id
      WHERE o.code = '123'
    `);
    report['resultado_final'] = rows[0];

    // Incertezas a verificar manualmente
    report['para_verificar_manualmente'] = [
      { id: 'a1f2b556', ref: 'FT 20260175901/002791', fornecedor: 'LEROY MERLIN?', valor: 42.78, nota: 'Pode ser duplicado de FC 2026/47 BCM Bricolage - verificar' },
      { id: '3a4943a2', ref: 'FT 20260175601/001140', fornecedor: 'LEROY MERLIN', data: '2023-02-26', nota: 'Data 2023 suspeita - pode ser 2026-02-26 e duplicado de FC 2026/20' },
      { id: '47893741', ref: '2023/95', fornecedor: 'EXMOD S.R 5', valor: 200, nota: 'Data 2023 - confirmar se pertence a esta obra' },
      { id: 'c9d2faaa', ref: 'FT 20260725701/000241', fornecedor: 'LEROY MERLIN TELHEIRAS', data: '2023-08-12', nota: 'Data 2023 suspeita - confirmar' },
      { id: '64923330', ref: null, fornecedor: 'SOC. COMERCIAL LADAL', data: '2023-04-13', nota: 'Data 2023 suspeita' },
      { id: '11042813', ref: 'VDA/06819', fornecedor: 'LIGHTHOUSE LDA', data: '2023-04-10', nota: 'Data 2023 suspeita' },
      { id: 'aabb400a', ref: 'FT 20260176201/005817', fornecedor: 'LEROY MERLIN ALTA LISBOA', data: '2023-04-08', nota: 'Data 2023 suspeita' },
      { id: '2beb74f8', ref: 'VDA/06753', fornecedor: 'LIGHTHOUSE LDA', data: '2023-03-30', nota: 'Data 2023 suspeita' },
    ];

    return NextResponse.json(report);

  } catch (e) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    client.release();
  }
}
