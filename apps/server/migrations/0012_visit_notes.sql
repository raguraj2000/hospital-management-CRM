-- Notes typed on the prescription screen were only ever saved when the visit
-- was marked as a multi-day follow-up (they went onto follow_up.notes); for a
-- plain walk-in visit they were collected and then silently dropped. Notes
-- belong to the visit itself.
ALTER TABLE visit_event ADD COLUMN notes TEXT;
