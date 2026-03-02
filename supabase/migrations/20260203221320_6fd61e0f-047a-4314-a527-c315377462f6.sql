-- Create enum for authorization action types
CREATE TYPE authorization_action_type AS ENUM (
  'CHANGE_PRICE',
  'APPLY_DISCOUNT',
  'EDIT_USER',
  'DELETE_USER',
  'EDIT_PATIENT',
  'DELETE_PATIENT',
  'EDIT_PRODUCT',
  'DELETE_PRODUCT',
  'INVENTORY_ADJUSTMENT',
  'CHANGE_CREDIT_SETTINGS',
  'CHANGE_CONFIG'
);

-- Create enum for authorization request status
CREATE TYPE authorization_request_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED'
);

-- Create the admin_authorization_requests table
CREATE TABLE public.admin_authorization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by_user_id UUID NOT NULL,
  requested_by_role TEXT NOT NULL,
  action_type authorization_action_type NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_description TEXT,
  action_data JSONB,
  comment TEXT,
  status authorization_request_status NOT NULL DEFAULT 'PENDING',
  admin_comment TEXT,
  approved_by_user_id UUID,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_authorization_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON public.admin_authorization_requests FOR SELECT
  USING (requested_by_user_id = auth.uid());

-- Policy: Admins can view all requests
CREATE POLICY "Admins can view all requests"
  ON public.admin_authorization_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Authenticated users can create requests
CREATE POLICY "Users can create requests"
  ON public.admin_authorization_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by_user_id);

-- Policy: Only admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests"
  ON public.admin_authorization_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_auth_requests_status ON public.admin_authorization_requests(status);
CREATE INDEX idx_auth_requests_user ON public.admin_authorization_requests(requested_by_user_id);
CREATE INDEX idx_auth_requests_pending ON public.admin_authorization_requests(status, created_at) WHERE status = 'PENDING';

-- Create unique index to prevent duplicate pending requests
CREATE UNIQUE INDEX idx_unique_pending_request 
  ON public.admin_authorization_requests(requested_by_user_id, action_type, resource_type, resource_id)
  WHERE status = 'PENDING';

-- Create trigger to update updated_at
CREATE TRIGGER update_auth_requests_updated_at
  BEFORE UPDATE ON public.admin_authorization_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user can perform action or needs authorization
CREATE OR REPLACE FUNCTION public.check_action_authorization(
  p_user_id UUID,
  p_action_type authorization_action_type,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_authorized BOOLEAN,
  pending_request_id UUID,
  approved_request_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_pending_id UUID;
  v_approved_id UUID;
BEGIN
  -- Check if user is admin (admins are always authorized)
  v_is_admin := has_role(p_user_id, 'admin'::app_role);
  
  IF v_is_admin THEN
    RETURN QUERY SELECT true, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check for pending request
  SELECT id INTO v_pending_id
  FROM admin_authorization_requests
  WHERE requested_by_user_id = p_user_id
    AND action_type = p_action_type
    AND resource_type = p_resource_type
    AND (resource_id = p_resource_id OR (resource_id IS NULL AND p_resource_id IS NULL))
    AND status = 'PENDING'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  
  -- Check for approved but not executed request
  SELECT id INTO v_approved_id
  FROM admin_authorization_requests
  WHERE requested_by_user_id = p_user_id
    AND action_type = p_action_type
    AND resource_type = p_resource_type
    AND (resource_id = p_resource_id OR (resource_id IS NULL AND p_resource_id IS NULL))
    AND status = 'APPROVED'
    AND executed_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  
  RETURN QUERY SELECT 
    (v_approved_id IS NOT NULL),
    v_pending_id,
    v_approved_id;
END;
$$;

-- Function to mark request as executed
CREATE OR REPLACE FUNCTION public.mark_authorization_executed(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_authorization_requests
  SET executed_at = now(), updated_at = now()
  WHERE id = p_request_id
    AND status = 'APPROVED'
    AND executed_at IS NULL
    AND requested_by_user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to get pending requests count for admin dashboard
CREATE OR REPLACE FUNCTION public.get_pending_auth_requests_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM admin_authorization_requests
  WHERE status = 'PENDING'
    AND (expires_at IS NULL OR expires_at > now());
$$;