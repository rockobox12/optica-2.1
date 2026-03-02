-- Create appointment status enum
CREATE TYPE appointment_status AS ENUM (
  'scheduled',      -- Agendada
  'confirmed',      -- Confirmada
  'waiting',        -- En sala de espera
  'in_progress',    -- En consulta
  'completed',      -- Completada
  'cancelled',      -- Cancelada
  'no_show'         -- No se presentó
);

-- Create appointment type enum
CREATE TYPE appointment_type AS ENUM (
  'exam',           -- Examen visual
  'follow_up',      -- Seguimiento
  'contact_lens',   -- Lentes de contacto
  'emergency',      -- Urgencia
  'other'           -- Otro
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  appointment_type appointment_type NOT NULL DEFAULT 'exam',
  status appointment_status NOT NULL DEFAULT 'scheduled',
  reason TEXT,
  notes TEXT,
  -- For walk-in patients without full registration
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  -- Booking info
  booked_by UUID,
  booking_source TEXT NOT NULL DEFAULT 'reception', -- 'reception', 'online', 'phone'
  -- Timestamps
  confirmed_at TIMESTAMP WITH TIME ZONE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  -- Reminders
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointment reminders table for tracking
CREATE TABLE public.appointment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create waiting room table for real-time flow control
CREATE TABLE public.waiting_room (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  patient_id UUID REFERENCES public.patients(id),
  patient_name TEXT NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  called_at TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 0, -- Higher = more priority
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'called', 'in_consultation', 'completed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctor schedule table for availability
CREATE TABLE public.doctor_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INTEGER NOT NULL DEFAULT 30, -- minutes
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, branch_id, day_of_week)
);

-- Create blocked time slots for vacations, breaks, etc.
CREATE TABLE public.blocked_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Authenticated users can view appointments"
  ON public.appointments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments"
  ON public.appointments FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete appointments"
  ON public.appointments FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for reminders
CREATE POLICY "Authenticated users can manage reminders"
  ON public.appointment_reminders FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for waiting room
CREATE POLICY "Authenticated users can manage waiting room"
  ON public.waiting_room FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for doctor schedules
CREATE POLICY "Authenticated users can view schedules"
  ON public.doctor_schedules FOR SELECT
  USING (true);

CREATE POLICY "Admins and doctors can manage schedules"
  ON public.doctor_schedules FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'doctor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'doctor'));

-- RLS Policies for blocked slots
CREATE POLICY "Authenticated users can view blocked slots"
  ON public.blocked_slots FOR SELECT
  USING (true);

CREATE POLICY "Admins and doctors can manage blocked slots"
  ON public.blocked_slots FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'doctor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'doctor'));

-- Create indexes for performance
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_branch ON public.appointments(branch_id);
CREATE INDEX idx_waiting_room_branch ON public.waiting_room(branch_id);
CREATE INDEX idx_waiting_room_status ON public.waiting_room(status);

-- Create trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_schedules_updated_at
  BEFORE UPDATE ON public.doctor_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get available time slots for a doctor on a specific date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_doctor_id UUID,
  p_branch_id UUID,
  p_date DATE
)
RETURNS TABLE(slot_time TIME, slot_end TIME) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_schedule RECORD;
  v_slot_time TIME;
  v_slot_duration INTERVAL;
BEGIN
  -- Get day of week (0=Sunday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get doctor schedule for this day
  SELECT * INTO v_schedule
  FROM doctor_schedules
  WHERE doctor_id = p_doctor_id
    AND (branch_id = p_branch_id OR branch_id IS NULL)
    AND day_of_week = v_day_of_week
    AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_slot_duration := (v_schedule.slot_duration || ' minutes')::INTERVAL;
  v_slot_time := v_schedule.start_time;
  
  WHILE v_slot_time + v_slot_duration <= v_schedule.end_time LOOP
    -- Check if slot is not blocked
    IF NOT EXISTS (
      SELECT 1 FROM blocked_slots
      WHERE doctor_id = p_doctor_id
        AND (branch_id = p_branch_id OR branch_id IS NULL)
        AND p_date + v_slot_time >= start_datetime
        AND p_date + v_slot_time < end_datetime
    ) 
    -- Check if slot is not already booked
    AND NOT EXISTS (
      SELECT 1 FROM appointments
      WHERE doctor_id = p_doctor_id
        AND appointment_date = p_date
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (start_time <= v_slot_time AND end_time > v_slot_time)
          OR (start_time < v_slot_time + v_slot_duration AND end_time >= v_slot_time + v_slot_duration)
          OR (start_time >= v_slot_time AND end_time <= v_slot_time + v_slot_duration)
        )
    ) THEN
      slot_time := v_slot_time;
      slot_end := v_slot_time + v_slot_duration;
      RETURN NEXT;
    END IF;
    
    v_slot_time := v_slot_time + v_slot_duration;
  END LOOP;
END;
$$;

-- Enable realtime for waiting room
ALTER PUBLICATION supabase_realtime ADD TABLE public.waiting_room;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;