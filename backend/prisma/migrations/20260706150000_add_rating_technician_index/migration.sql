-- Add index on technician_id for Rating COUNT/AVG aggregation queries.
CREATE INDEX IF NOT EXISTS idx_ratings_technician_id ON ratings (technician_id);
