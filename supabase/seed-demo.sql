-- =============================================================
-- デモ用サンプルデータ投入スクリプト
-- Supabase SQL Editor で実行してください
-- =============================================================
-- ログイン中ユーザーの organization_id を自動取得
-- =============================================================

DO $$
DECLARE
  v_org_id   uuid;
  v_user_id  uuid;

  -- 取引先ID
  v_vendor_aozora   uuid;
  v_vendor_daichi   uuid;
  v_vendor_minato   uuid;
  v_vendor_hikari   uuid;
  v_vendor_sakura   uuid;

  -- 現場ID
  v_site_fujimidai  uuid;
  v_site_aoba       uuid;
  v_site_himawari   uuid;
  v_site_sakura_cc  uuid;
  v_site_umikaze    uuid;

  -- 勘定科目ID
  v_acc_material    uuid;
  v_acc_outsource   uuid;
  v_acc_expense     uuid;
  v_acc_temporary   uuid;

  -- 請求書ID
  v_inv1  uuid;
  v_inv2  uuid;
  v_inv3  uuid;

BEGIN
  -- =============================================
  -- 1. organization_id / user_id を取得
  -- =============================================
  SELECT om.organization_id, om.user_id
    INTO v_org_id, v_user_id
    FROM organization_members om
   LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_members にレコードがありません。先にログインしてください。';
  END IF;

  RAISE NOTICE 'organization_id = %', v_org_id;
  RAISE NOTICE 'user_id         = %', v_user_id;

  -- =============================================
  -- 2. 取引先マスタ（5件）
  -- =============================================
  INSERT INTO vendors (organization_id, code, name, furigana)
  VALUES (v_org_id, 'Y001', '（株）青空建材',     'アオゾラケンザイ')
  RETURNING id INTO v_vendor_aozora;

  INSERT INTO vendors (organization_id, code, name, furigana)
  VALUES (v_org_id, 'T001', '大地工業（株）',     'ダイチコウギョウ')
  RETURNING id INTO v_vendor_daichi;

  INSERT INTO vendors (organization_id, code, name, furigana)
  VALUES (v_org_id, 'S001', '（有）みなと設備',   'ミナトセツビ')
  RETURNING id INTO v_vendor_minato;

  INSERT INTO vendors (organization_id, code, name, furigana)
  VALUES (v_org_id, 'M001', 'ひかり電機（株）',   'ヒカリデンキ')
  RETURNING id INTO v_vendor_hikari;

  INSERT INTO vendors (organization_id, code, name, furigana)
  VALUES (v_org_id, 'K001', '（株）さくら塗装',   'サクラトソウ')
  RETURNING id INTO v_vendor_sakura;

  -- =============================================
  -- 3. 現場マスタ（5件）
  -- =============================================
  INSERT INTO sites (organization_id, code, name, status)
  VALUES (v_org_id, 'A-001', '富士見台ハイツ新築工事',             'active')
  RETURNING id INTO v_site_fujimidai;

  INSERT INTO sites (organization_id, code, name, status)
  VALUES (v_org_id, 'B-001', 'あおば駅前ビル改修工事',             'active')
  RETURNING id INTO v_site_aoba;

  INSERT INTO sites (organization_id, code, name, status)
  VALUES (v_org_id, 'C-001', 'ひまわりマンション外壁塗装工事',     'active')
  RETURNING id INTO v_site_himawari;

  INSERT INTO sites (organization_id, code, name, status)
  VALUES (v_org_id, 'D-001', 'さくら市民センター空調設備工事',     'active')
  RETURNING id INTO v_site_sakura_cc;

  INSERT INTO sites (organization_id, code, name, status)
  VALUES (v_org_id, 'E-001', '海風テラス内装リノベーション工事',   'active')
  RETURNING id INTO v_site_umikaze;

  -- =============================================
  -- 4. 勘定科目マスタ（4件）
  -- =============================================
  INSERT INTO accounts (organization_id, code, name, display_order)
  VALUES (v_org_id, '501', '材料費', 1)
  RETURNING id INTO v_acc_material;

  INSERT INTO accounts (organization_id, code, name, display_order)
  VALUES (v_org_id, '511', '外注費', 2)
  RETURNING id INTO v_acc_outsource;

  INSERT INTO accounts (organization_id, code, name, display_order)
  VALUES (v_org_id, '521', '経費',   3)
  RETURNING id INTO v_acc_expense;

  INSERT INTO accounts (organization_id, code, name, display_order)
  VALUES (v_org_id, '531', '仮設費', 4)
  RETURNING id INTO v_acc_temporary;

  -- =============================================
  -- 5. 請求書1: 青空建材 / 2026-02-28 / AZ-2026-031
  --    明細2行: 285,000 + 142,000 = 427,000 (税抜)
  --    消費税: 28,500 + 14,200 = 42,700
  --    税込合計: 469,700
  -- =============================================
  INSERT INTO invoices (
    organization_id, vendor_id, invoice_date, invoice_number,
    total_excl_tax, total_tax, total_incl_tax,
    created_by, updated_by
  ) VALUES (
    v_org_id, v_vendor_aozora, '2026-02-28', 'AZ-2026-031',
    427000, 42700, 469700,
    v_user_id, v_user_id
  ) RETURNING id INTO v_inv1;

  -- 明細行1: 富士見台ハイツ / 材料費 / 285,000
  INSERT INTO invoice_lines (
    invoice_id, site_id, account_id,
    amount_excl_tax, tax_rate, tax_amount, amount_incl_tax, line_order
  ) VALUES (
    v_inv1, v_site_fujimidai, v_acc_material,
    285000, 0.10, 28500, 313500, 0
  );

  -- 明細行2: あおば駅前ビル / 材料費 / 142,000
  INSERT INTO invoice_lines (
    invoice_id, site_id, account_id,
    amount_excl_tax, tax_rate, tax_amount, amount_incl_tax, line_order
  ) VALUES (
    v_inv1, v_site_aoba, v_acc_material,
    142000, 0.10, 14200, 156200, 1
  );

  -- =============================================
  -- 6. 請求書2: 大地工業 / 2026-03-01 / DC-2026-015
  --    明細3行: 580,000 + 320,000 + 195,000 = 1,095,000 (税抜)
  --    消費税: 58,000 + 32,000 + 19,500 = 109,500
  --    税込合計: 1,204,500
  -- =============================================
  INSERT INTO invoices (
    organization_id, vendor_id, invoice_date, invoice_number,
    total_excl_tax, total_tax, total_incl_tax,
    created_by, updated_by
  ) VALUES (
    v_org_id, v_vendor_daichi, '2026-03-01', 'DC-2026-015',
    1095000, 109500, 1204500,
    v_user_id, v_user_id
  ) RETURNING id INTO v_inv2;

  -- 明細行1: 富士見台ハイツ / 外注費 / 580,000
  INSERT INTO invoice_lines (
    invoice_id, site_id, account_id,
    amount_excl_tax, tax_rate, tax_amount, amount_incl_tax, line_order
  ) VALUES (
    v_inv2, v_site_fujimidai, v_acc_outsource,
    580000, 0.10, 58000, 638000, 0
  );

  -- 明細行2: ひまわりマンション / 外注費 / 320,000
  INSERT INTO invoice_lines (
    invoice_id, site_id, account_id,
    amount_excl_tax, tax_rate, tax_amount, amount_incl_tax, line_order
  ) VALUES (
    v_inv2, v_site_himawari, v_acc_outsource,
    320000, 0.10, 32000, 352000, 1
  );

  -- 明細行3: さくら市民センター / 外注費 / 195,000
  INSERT INTO invoice_lines (
    invoice_id, site_id, account_id,
    amount_excl_tax, tax_rate, tax_amount, amount_incl_tax, line_order
  ) VALUES (
    v_inv2, v_site_sakura_cc, v_acc_outsource,
    195000, 0.10, 19500, 214500, 2
  );

  -- =============================================
  -- 7. 請求書3: みなと設備 / 2026-03-03 / MN-2026-008
  --    明細2行: 467,000 + 83,000 = 550,000 (税抜)
  --    消費税: 46,700 + 8,300 = 55,000
  --    税込合計: 605,000
  -- =============================================
  INSERT INTO invoices (
    organization_id, vendor_id, invoice_date, invoice_number,
    total_excl_tax, total_tax, total_incl_tax,
    created_by, updated_by
  ) VALUES (
    v_org_id, v_vendor_minato, '2026-03-03', 'MN-2026-008',
    550000, 55000, 605000,
    v_user_id, v_user_id
  ) RETURNING id INTO v_inv3;

  -- 明細行1: さくら市民センター / 材料費 / 467,000
  INSERT INTO invoice_lines (
    invoice_id, site_id, account_id,
    amount_excl_tax, tax_rate, tax_amount, amount_incl_tax, line_order
  ) VALUES (
    v_inv3, v_site_sakura_cc, v_acc_material,
    467000, 0.10, 46700, 513700, 0
  );

  -- 明細行2: 海風テラス / 経費 / 83,000
  INSERT INTO invoice_lines (
    invoice_id, site_id, account_id,
    amount_excl_tax, tax_rate, tax_amount, amount_incl_tax, line_order
  ) VALUES (
    v_inv3, v_site_umikaze, v_acc_expense,
    83000, 0.10, 8300, 91300, 1
  );

  -- =============================================
  -- 完了
  -- =============================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'デモデータの投入が完了しました';
  RAISE NOTICE '  取引先:   5件';
  RAISE NOTICE '  現場:     5件';
  RAISE NOTICE '  勘定科目: 4件';
  RAISE NOTICE '  請求書:   3件（明細 計7行）';
  RAISE NOTICE '========================================';

END $$;
