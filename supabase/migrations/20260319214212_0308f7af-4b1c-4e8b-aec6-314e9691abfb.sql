-- Remove duplicate purchase_appraisal valuations, keeping only the oldest one per property
DELETE FROM public.property_valuations
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY property_id, valuation_type, valuation_date, value
      ORDER BY created_at ASC
    ) AS rn
    FROM public.property_valuations
  ) ranked
  WHERE rn > 1
);