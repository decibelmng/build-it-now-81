
-- Delete duplicate purchase_appraisal valuations, keeping only the earliest one per property
DELETE FROM public.property_valuations
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY property_id, valuation_type 
      ORDER BY created_at ASC
    ) AS rn
    FROM public.property_valuations
    WHERE valuation_type = 'purchase_appraisal'
  ) ranked
  WHERE rn > 1
);
