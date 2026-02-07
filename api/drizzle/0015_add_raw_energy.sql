-- Add raw_energy column for auto-calibrating energy normalization
-- raw_energy stores the pre-sigmoid weighted average (0-1) from Essentia analysis.
-- The final energy value is computed by applying a sigmoid centered on the
-- library's median raw_energy, ensuring good distribution regardless of genre mix.

ALTER TABLE "dj_analysis" ADD COLUMN "raw_energy" real;
