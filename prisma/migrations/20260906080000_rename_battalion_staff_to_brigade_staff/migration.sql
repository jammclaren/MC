-- Renames the BATTALION_STAFF role to BRIGADE_STAFF, preserving any
-- existing rows using it (this enum was added only one migration ago and
-- already had a real account on it, so a plain schema rename would have
-- silently orphaned that row).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BRIGADE_STAFF';
