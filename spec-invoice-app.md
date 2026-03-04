# 支払請求書登録アプリ — 開発仕様書

## 1. プロジェクト概要

### 1.1 コンセプト
建設業の中小企業における**支払請求書の現場別登録**を効率化するWebアプリケーション。
材料費・外注費の請求書データを手入力で登録し、会計ソフトへのCSVインポートや他ツールとの連携を行う。

### 1.2 課題背景
- 建設業の経理では、材料費・外注費の請求書を**現場別に分解して入力**する作業が最も負荷が高い
- 1枚の請求書に**複数の現場が混在する**ことが多い
- 請求書に現場名が書いてない、手書きで読みにくい等、**AIによる完全自動化は困難**
- よって「手入力をいかに楽にするか」が設計の核心

### 1.3 想定ユーザー
- **管理会計コンサルタント（開発者自身）**: 約20社の顧問先の経理処理で使用
- **顧問先の経理担当者**: ITリテラシーは高くない。直感的に迷わず使えるUIが必須

### 1.4 技術スタック
| 区分 | 技術 |
|------|------|
| フロントエンド | Next.js (App Router) |
| バックエンド | Next.js API Routes + Supabase |
| データベース | Supabase (PostgreSQL) |
| 認証 | Supabase Auth |
| ホスティング | Vercel |
| スタイリング | Tailwind CSS |

---

## 2. 画面構成

3つのメイン画面＋認証画面で構成する。

### 2.1 ログイン画面
- メールアドレス＋パスワードによるログイン
- 将来的にマジックリンク認証も検討

### 2.2 請求書入力画面（メイン）
最も使用頻度が高い画面。**速く・迷わず入力できること**が最優先。

#### ヘッダー部
| フィールド | 型 | 必須 | 備考 |
|-----------|------|:----:|------|
| 請求日 | date | ○ | デフォルト: 今日の日付 |
| 取引先 | select | ○ | マスタから選択。インクリメンタルサーチ対応 |
| 請求書番号 | text | — | 任意入力 |
| 摘要 | text | — | メモ欄 |

#### 明細行（複数追加可）
1枚の請求書に対して、現場ごとに行を追加する。

| フィールド | 型 | 必須 | 備考 |
|-----------|------|:----:|------|
| 現場名 | select | ○ | マスタから選択。インクリメンタルサーチ（サジェスト）対応 |
| 勘定科目 | select | ○ | マスタから選択（材料費・外注費・経費など） |
| 税抜金額 | number | ○ | 数値入力。カンマ表示 |
| 税率 | select | ○ | 10% / 8%（軽減税率） / 0%（非課税）。デフォルト: 10% |
| 消費税額 | number | — | 自動計算（税抜×税率、端数切捨て）。手動修正も可 |
| 税込金額 | number | — | 自動計算（税抜＋消費税）。読み取り専用 |

#### フッター部
- 税抜合計・消費税合計・税込合計を自動集計
- 「登録」ボタン

#### UX要件
- 行の追加/削除がワンクリックでできること
- Tab/Enterキーで次フィールドへ移動（キーボード操作重視）
- 登録完了後、フォームをリセットして連続入力できること
- 直前に登録した取引先・勘定科目をデフォルトにする（連続入力時の効率化）

### 2.3 データ一覧画面
登録済みの請求書データを検索・確認・CSV出力する画面。

#### 検索・フィルター
- キーワード検索（取引先名・現場名・摘要を横断検索）
- 期間指定（開始日〜終了日）
- 取引先でフィルター
- 現場名でフィルター

#### 一覧表示
- 請求日、取引先、現場名（バッジ表示）、税抜合計、税込合計
- 日付降順でソート
- 行クリックで詳細表示・編集可能

#### CSV出力
- BOM付きUTF-8（Excel文字化け防止）
- 出力カラム: 請求日, 取引先コード, 取引先名, 請求書番号, 現場コード, 現場名, 勘定科目コード, 勘定科目名, 税抜金額, 税率, 消費税額, 税込金額, 摘要
- 明細行単位で出力（1つの請求書の複数現場 → 複数行）
- フィルター適用後のデータのみ出力

### 2.4 マスタ管理画面
3種のマスタデータを管理する。

#### 取引先マスタ
| フィールド | 型 | 必須 | 備考 |
|-----------|------|:----:|------|
| 取引先コード | text | ○ | ユーザーが設定。会計ソフトのコードに合わせる想定 |
| 取引先名 | text | ○ | |
| フリガナ | text | — | 検索用 |

#### 現場マスタ
| フィールド | 型 | 必須 | 備考 |
|-----------|------|:----:|------|
| 現場コード | text | ○ | |
| 現場名 | text | ○ | |
| ステータス | select | ○ | 進行中 / 完了。完了した現場は入力画面のサジェストから除外 |

#### 勘定科目マスタ
| フィールド | 型 | 必須 | 備考 |
|-----------|------|:----:|------|
| 科目コード | text | ○ | 会計ソフトの勘定科目コードに合わせる |
| 科目名 | text | ○ | |
| 表示順 | number | — | 入力画面での表示順序 |

#### マスタ管理のUX
- 各マスタの一覧表示・新規追加・編集・削除
- CSVインポート機能（会計ソフトや既存Excelからマスタを一括登録）
- 削除時に関連データがある場合は警告を表示

---

## 3. データベース設計

### 3.1 テーブル一覧

```sql
-- 組織（マルチテナント用）
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザーと組織の紐付け
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 取引先マスタ
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  furigana TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- 現場マスタ
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- 勘定科目マスタ
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- 請求書ヘッダー
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  invoice_date DATE NOT NULL,
  invoice_number TEXT,
  note TEXT,
  total_excl_tax BIGINT NOT NULL DEFAULT 0,  -- 税抜合計（円単位、整数）
  total_tax BIGINT NOT NULL DEFAULT 0,        -- 消費税合計
  total_incl_tax BIGINT NOT NULL DEFAULT 0,   -- 税込合計
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 請求書明細行
CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  account_id UUID REFERENCES accounts(id),
  amount_excl_tax BIGINT NOT NULL,   -- 税抜金額（円単位、整数）
  tax_rate NUMERIC(4,2) NOT NULL DEFAULT 0.10,
  tax_amount BIGINT NOT NULL,         -- 消費税額
  amount_incl_tax BIGINT NOT NULL,    -- 税込金額
  line_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Row Level Security (RLS)
すべてのテーブルにRLSを適用し、`organization_id`でデータを分離する。

```sql
-- 例: vendorsテーブルのRLSポリシー
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org vendors"
  ON vendors FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org vendors"
  ON vendors FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE, DELETE も同様のポリシーを適用
-- 他のテーブル（sites, accounts, invoices, invoice_lines）も同じパターン
```

### 3.3 金額の取り扱い
- すべての金額は**BIGINT（整数・円単位）**で保存
- 浮動小数点による誤差を防ぐ
- 消費税計算: `tax_amount = FLOOR(amount_excl_tax * tax_rate)`（端数切捨て）
- フロントエンドでの表示時にカンマ区切りフォーマット

---

## 4. ビジネスロジック

### 4.1 消費税計算
```
消費税額 = floor(税抜金額 × 税率)
税込金額 = 税抜金額 + 消費税額
```

税率の選択肢:
| 表示名 | 値 |
|--------|------|
| 10% | 0.10 |
| 8%（軽減税率） | 0.08 |
| 0%（非課税） | 0.00 |

### 4.2 合計計算
ヘッダーの合計は明細行の合計を集計:
```
税抜合計 = Σ 各明細の税抜金額
消費税合計 = Σ 各明細の消費税額
税込合計 = 税抜合計 + 消費税合計
```

### 4.3 CSV出力フォーマット
- エンコーディング: UTF-8 with BOM（`\uFEFF`）
- 区切り文字: カンマ
- 各フィールドをダブルクォートで囲む
- 明細行単位で1行（1請求書に3現場 → 3行出力）

出力カラム順:
```
請求日, 取引先コード, 取引先名, 請求書番号, 現場コード, 現場名,
勘定科目コード, 勘定科目名, 税抜金額, 税率, 消費税額, 税込金額, 摘要
```

### 4.4 現場サジェストのロジック
- ステータスが「進行中（active）」の現場のみサジェスト表示
- 入力文字列で現場コード・現場名を前方一致＋部分一致で検索
- 最近使用した現場を優先表示（直近の入力履歴を参照）

---

## 5. 認証・マルチテナント設計

### 5.1 認証フロー
1. Supabase Authのメール＋パスワード認証
2. 新規ユーザー登録時に`organizations`と`organization_members`を自動作成
3. コンサルタントが顧問先ごとにorganizationを作成し、経理担当者を招待

### 5.2 データ分離
- すべてのデータテーブルに`organization_id`を持たせる
- RLSにより、ユーザーは所属organizationのデータのみアクセス可能
- コンサルタントは複数のorganizationに所属可能（各顧問先のデータにアクセス）

### 5.3 権限モデル
| ロール | できること |
|--------|-----------|
| owner | 全操作 + メンバー招待/削除 + マスタCSVインポート |
| member | 請求書入力 + データ閲覧 + CSV出力 + マスタ閲覧 |

---

## 6. UI/UXデザイン方針

### 6.1 デザインコンセプト
- **シンプルで温かみのある配色**: 自然な緑（`#5B7A5E`）をプライマリカラーに
- 経理担当者が「怖くない」と感じる柔らかいUI
- 情報密度は高めだが整理されている（一画面で全体が見渡せる）

### 6.2 レスポンシブ対応
- デスクトップ最優先（経理作業はPCが基本）
- タブレット対応はセカンダリ
- スマホ対応は最低限（閲覧のみ）

### 6.3 入力画面のキーボード操作
- Tab: 次のフィールドへ
- Shift+Tab: 前のフィールドへ
- Enter: セレクトボックスを確定して次へ
- Ctrl+Enter: 請求書を登録

---

## 7. 将来的な拡張（Phase 2以降）

以下は初期リリースには含めないが、将来対応を想定して設計に織り込んでおく。

- **Lark連携**: マスタデータの同期、入力データのLarkテーブルへの書き出し
- **請求書画像のアップロード**: 入力時に原本画像を添付して保存
- **OCR補助**: アップロード画像からのテキスト抽出（候補提示のみ、自動入力はしない）
- **承認ワークフロー**: 入力 → 確認 → 承認のステータス管理
- **会計ソフト別のCSVテンプレート**: 弥生会計・freee・マネーフォワード等のインポート形式に対応
- **ダッシュボード**: 月別・現場別・取引先別の集計グラフ

---

## 8. 開発の進め方

### Phase 1（MVP）
1. Supabaseプロジェクト作成・テーブル作成・RLS設定
2. 認証画面（ログイン/サインアップ）
3. マスタ管理画面（取引先・現場・勘定科目のCRUD）
4. 請求書入力画面（ヘッダー＋明細行、税計算）
5. データ一覧画面（検索・フィルター・CSV出力）
6. Vercelにデプロイ

### 開発時の注意事項
- TypeScriptを使用すること
- Supabaseのクライアントは`@supabase/ssr`を使用（App Router対応）
- Server Componentsをベースに、入力フォーム等のインタラクティブ部分のみClient Components
- エラーハンドリングを丁寧に（特にDB操作周り）
- ローディング状態・空状態のUIを必ず用意する
