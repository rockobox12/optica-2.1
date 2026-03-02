-- Cash registers (caja) table
CREATE TABLE public.cash_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id),
  opened_by UUID NOT NULL,
  closed_by UUID,
  opening_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closing_date TIMESTAMP WITH TIME ZONE,
  opening_amount NUMERIC NOT NULL DEFAULT 0,
  closing_amount NUMERIC,
  expected_amount NUMERIC,
  difference NUMERIC,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cash counts (arqueos) table
CREATE TABLE public.cash_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  counted_by UUID NOT NULL,
  count_type TEXT NOT NULL DEFAULT 'partial' CHECK (count_type IN ('partial', 'closing')),
  count_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Denomination breakdown
  bills_1000 INTEGER DEFAULT 0,
  bills_500 INTEGER DEFAULT 0,
  bills_200 INTEGER DEFAULT 0,
  bills_100 INTEGER DEFAULT 0,
  bills_50 INTEGER DEFAULT 0,
  bills_20 INTEGER DEFAULT 0,
  coins_20 INTEGER DEFAULT 0,
  coins_10 INTEGER DEFAULT 0,
  coins_5 INTEGER DEFAULT 0,
  coins_2 INTEGER DEFAULT 0,
  coins_1 INTEGER DEFAULT 0,
  coins_50c INTEGER DEFAULT 0,
  total_counted NUMERIC NOT NULL DEFAULT 0,
  expected_amount NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id),
  cash_register_id UUID REFERENCES public.cash_registers(id),
  expense_number TEXT NOT NULL,
  expense_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer', 'check')),
  vendor TEXT,
  invoice_number TEXT,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID,
  created_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bank accounts table
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings', 'credit')),
  clabe TEXT,
  currency TEXT NOT NULL DEFAULT 'MXN',
  current_balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bank transactions table
CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee', 'interest', 'adjustment')),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount NUMERIC NOT NULL,
  reference TEXT,
  description TEXT,
  cash_register_id UUID REFERENCES public.cash_registers(id),
  sale_id UUID REFERENCES public.sales(id),
  reconciled BOOLEAN NOT NULL DEFAULT false,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reconciled_by UUID,
  created_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cash movements table (for tracking all cash in/out)
CREATE TABLE public.cash_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'expense', 'deposit', 'withdrawal', 'adjustment', 'opening', 'closing')),
  amount NUMERIC NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to generate expense number
CREATE OR REPLACE FUNCTION public.generate_expense_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := to_char(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(expense_number FROM 5) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.expenses
  WHERE expense_number LIKE 'GTO' || year_suffix || '%';
  
  new_number := 'GTO' || year_suffix || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to calculate cash register expected amount
CREATE OR REPLACE FUNCTION public.calculate_cash_register_expected(p_cash_register_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_opening_amount NUMERIC;
  v_cash_sales NUMERIC;
  v_cash_expenses NUMERIC;
  v_deposits NUMERIC;
  v_withdrawals NUMERIC;
BEGIN
  -- Get opening amount
  SELECT opening_amount INTO v_opening_amount
  FROM public.cash_registers WHERE id = p_cash_register_id;
  
  -- Get cash sales
  SELECT COALESCE(SUM(amount), 0) INTO v_cash_sales
  FROM public.cash_movements
  WHERE cash_register_id = p_cash_register_id AND movement_type = 'sale';
  
  -- Get cash expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_cash_expenses
  FROM public.cash_movements
  WHERE cash_register_id = p_cash_register_id AND movement_type = 'expense';
  
  -- Get deposits (cash out to bank)
  SELECT COALESCE(SUM(amount), 0) INTO v_deposits
  FROM public.cash_movements
  WHERE cash_register_id = p_cash_register_id AND movement_type = 'deposit';
  
  -- Get withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_withdrawals
  FROM public.cash_movements
  WHERE cash_register_id = p_cash_register_id AND movement_type = 'withdrawal';
  
  RETURN v_opening_amount + v_cash_sales - v_cash_expenses - v_deposits + v_withdrawals;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enable RLS
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_registers
CREATE POLICY "Authenticated users can view cash registers" ON public.cash_registers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create cash registers" ON public.cash_registers FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update cash registers" ON public.cash_registers FOR UPDATE USING (true);

-- RLS Policies for cash_counts
CREATE POLICY "Authenticated users can view cash counts" ON public.cash_counts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create cash counts" ON public.cash_counts FOR INSERT WITH CHECK (true);

-- RLS Policies for expenses
CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create expenses" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for bank_accounts
CREATE POLICY "Authenticated users can view bank accounts" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "Admins can manage bank accounts" ON public.bank_accounts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for bank_transactions
CREATE POLICY "Authenticated users can view bank transactions" ON public.bank_transactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create bank transactions" ON public.bank_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage bank transactions" ON public.bank_transactions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for cash_movements
CREATE POLICY "Authenticated users can view cash movements" ON public.cash_movements FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create cash movements" ON public.cash_movements FOR INSERT WITH CHECK (true);