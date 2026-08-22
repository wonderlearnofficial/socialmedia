-- Chosen colours for companies and projects.
--
-- Until now a colour was derived from the name at render time. That works
-- without any setup, but it's not editable — and people want their own client
-- to be their own colour. The column is nullable on purpose: an empty value
-- keeps the derived colour, so nothing has to be filled in before the tracker
-- looks right, and existing rows are unaffected.
--
-- Run this once in the Supabase SQL Editor.

alter table companies add column if not exists color text;
alter table projects add column if not exists color text;

-- Only 6-digit hex. The value is written straight into a style attribute, so
-- constraining the shape here keeps anything else out of the DOM.
alter table companies drop constraint if exists companies_color_hex;
alter table companies add constraint companies_color_hex
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

alter table projects drop constraint if exists projects_color_hex;
alter table projects add constraint projects_color_hex
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
