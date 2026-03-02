
-- 1) Add profit snapshot columns to sale_items
ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_amount NUMERIC GENERATED ALWAYS AS ((unit_price * quantity) - (unit_cost * quantity)) STORED;

-- 2) Add total_profit to sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS total_profit NUMERIC DEFAULT 0;

-- 3) Trigger to auto-calculate total_profit when sale_items change
CREATE OR REPLACE FUNCTION public.update_sale_total_profit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE sales
  SET total_profit = (
    SELECT COALESCE(SUM(profit_amount), 0)
    FROM sale_items
    WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
  )
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_sale_total_profit ON public.sale_items;
CREATE TRIGGER trg_update_sale_total_profit
AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.update_sale_total_profit();

-- 4) Backfill existing sale_items with cost from products
UPDATE public.sale_items si
SET unit_cost = COALESCE(p.cost_price, 0)
FROM public.products p
WHERE si.product_code = p.sku
  AND si.unit_cost = 0;

-- 5) Backfill total_profit on existing sales
UPDATE public.sales s
SET total_profit = (
  SELECT COALESCE(SUM(profit_amount), 0)
  FROM public.sale_items si
  WHERE si.sale_id = s.id
);
