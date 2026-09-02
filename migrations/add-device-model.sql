-- Add device_model column to track specific device (iPhone 15, Samsung Galaxy S24, etc.)
ALTER TABLE strata_sessions ADD COLUMN IF NOT EXISTS device_model TEXT;
ALTER TABLE strata_events ADD COLUMN IF NOT EXISTS device_model TEXT;
