-- ============================================
-- 003 のトリガー修正: RLS回避 + search_path 明示指定
-- ============================================

-- 既存のトリガーと関数を削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 関数を再作成（search_path を明示 + SECURITY DEFINER）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- 組織を作成
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.email))
  RETURNING id INTO new_org_id;

  -- ユーザーを owner として紐付け
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- トリガーを再作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 関数の所有者を postgres に確実に設定（RLSバイパス）
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
