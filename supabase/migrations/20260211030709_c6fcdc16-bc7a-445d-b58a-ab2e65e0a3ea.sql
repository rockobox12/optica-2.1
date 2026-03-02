
-- Table for logging duplicate detection events
CREATE TABLE public.duplicate_detection_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('DUPLICATE_SUGGESTED', 'DUPLICATE_IGNORED')),
  patient_id_new UUID REFERENCES public.patients(id),
  patient_id_matched UUID NOT NULL REFERENCES public.patients(id),
  score INTEGER NOT NULL,
  match_reasons TEXT[] NOT NULL DEFAULT '{}',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.duplicate_detection_events ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can insert, only admin can read
CREATE POLICY "Authenticated users can log duplicate events"
  ON public.duplicate_detection_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can view duplicate events"
  ON public.duplicate_detection_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index for queries
CREATE INDEX idx_duplicate_events_matched ON public.duplicate_detection_events(patient_id_matched);
CREATE INDEX idx_duplicate_events_created ON public.duplicate_detection_events(created_at DESC);
