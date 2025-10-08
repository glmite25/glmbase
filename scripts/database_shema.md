profiles
id — uuid (PK)
email — text (unique, check: email regex)
full_name — text
phone — text (check: E.164-ish)
address — text
church_unit — text
assigned_pastor — text
genotype — text
role — app_role (enum: user, admin, superuser) — default 'user'
created_at — timestamptz — default timezone('utc', now())
updated_at — timestamptz — default timezone('utc', now())
date_of_birth — date
gender — varchar (check: male/female/other)
marital_status — varchar (check: single/married/divorced/widowed)
occupation — varchar
emergency_contact_name — varchar
emergency_contact_phone — varchar
emergency_contact_relationship — varchar
city — varchar
state — varchar
postal_code — varchar
country — varchar — default 'Nigeria'
bio — text
profile_image_url — text
join_date — date — default CURRENT_DATE
baptism_date — date
baptism_location — varchar
is_baptized — boolean — default false
membership_status — varchar — default 'active' (allowed values: active, inactive, suspended, transferred)
preferred_contact_method — varchar — default 'email' (allowed: email, phone, sms, whatsapp)
skills_talents — text[] (array)
interests — text[] (array) Primary key: id Foreign key: public.profiles.id → auth.users.id
user_roles
id — uuid (PK) — default gen_random_uuid()
user_id — uuid (FK → auth.users.id)
role — app_role (enum: user, admin, superuser) — default 'user'
created_at — timestamptz — default now()
Primary key: id

members
id — uuid (PK) — default extensions.uuid_generate_v4()
fullname — text (check: min length 2)
email — text (unique, check: email regex)
phone — text (nullable)
address — text
category — member_category (enum: Members, Pastors, Workers, Visitors, Partners, MINT) — default 'Members'
title — text
assignedto — uuid
churchunit — text
churchunits — text[] (array)
auxanogroup — text
joindate — date — default CURRENT_DATE
notes — text
isactive — boolean — default true (check not null)
userid — uuid
created_at — timestamptz — default now()
updated_at — timestamptz — default now()
user_id — uuid
date_of_birth — date
gender — varchar (check: male/female/other)
created_by — uuid
updated_by — uuid
role — app_role (default 'user')
genotype — varchar (check allowed genotypes; comment: Blood genotype from profiles table) Primary key: id Numerous FK constraints referencing members, auth.users, church_units, auxano_groups, attendance, pastoral_care.
church_units
id — uuid (PK) — default extensions.uuid_generate_v4()
name — text (unique)
description — text
leader_id — uuid
parent_unit_id — uuid
is_active — boolean — default true
created_at — timestamptz — default now()
updated_at — timestamptz — default now() Primary key: id FKs: leader_id → public.members.id, parent_unit_id → public.church_units.id
auxano_groups
id — uuid (PK) — default extensions.uuid_generate_v4()
name — text (unique)
description — text
leader_id — uuid
meeting_day — text
meeting_time — time
is_active — boolean — default true
created_at — timestamptz — default now()
updated_at — timestamptz — default now() Primary key: id FK: leader_id → public.members.id
pastoral_care
id — uuid (PK) — default extensions.uuid_generate_v4()
member_id — uuid
pastor_id — uuid
care_type — text
date_of_care — date — default CURRENT_DATE
notes — text
follow_up_required — boolean — default false
follow_up_date — date
status — text — default 'completed'
created_at — timestamptz — default now()
updated_at — timestamptz — default now() Primary key: id FKs: pastor_id → public.members.id, member_id → public.members.id
attendance
id — uuid (PK) — default extensions.uuid_generate_v4()
member_id — uuid
service_date — date
service_type — text
church_unit — text
present — boolean — default true
recorded_by — uuid
notes — text
created_at — timestamptz — default now() Primary key: id FKs: recorded_by → public.members.id, member_id → public.members.id
migrations
id — integer (PK) — default nextval('migrations_id_seq')
name — text (unique)
applied_at — timestamptz — default now()
description — text Primary key: id
members_enhanced
id — uuid (PK) — default gen_random_uuid()
user_id — uuid (nullable) — FK → auth.users.id (comment: nullable for members without auth accounts)
email — varchar (unique, email check) (comment: primary email)
fullname — varchar
phone — varchar (nullable, E.164 check)
address — text
genotype — varchar (nullable, genotype check) (comment: Blood genotype)
date_of_birth — date (check: <= current_date - 1 year)
gender — varchar (check: male/female/other)
marital_status — varchar (check allowed)
occupation — varchar
emergency_contact_name — varchar
emergency_contact_phone — varchar
emergency_contact_relationship — varchar
city — varchar
state — varchar
postal_code — varchar
country — varchar — default 'Nigeria'
category — varchar — default 'Members'
title — text
assignedto — uuid (comment: self-referencing FK to assigned pastor/leader)
churchunit — text
churchunits — text[] (comment: array for multiple units)
auxanogroup — text
joindate — date — default CURRENT_DATE (check <= CURRENT_DATE)
notes — text
isactive — boolean — default true (comment: soft delete flag)
baptism_date — date (check <= CURRENT_DATE)
baptism_location — varchar
is_baptized — boolean — default false
membership_status — varchar — default 'active' (check allowed)
preferred_contact_method — varchar — default 'email' (check allowed)
skills_talents — text[]
interests — text[]
bio — text
profile_image_url — text
role — varchar — default 'user' (comment: application role)
created_at — timestamptz — default now()
updated_at — timestamptz — default now() Primary key: id FKs: assignedto → members_enhanced.id, user_id → auth.users.id
profiles_backup
id — uuid
email — text
full_name — text
phone — text
address — text
church_unit — text
assigned_pastor — text
genotype — text
role — app_role (enum)
created_at — timestamptz
updated_at — timestamptz
date_of_birth — date
gender — varchar
marital_status — varchar
occupation — varchar
emergency_contact_name — varchar
emergency_contact_phone — varchar
emergency_contact_relationship — varchar
city — varchar
state — varchar
postal_code — varchar
country — varchar
bio — text
profile_image_url — text
join_date — date
baptism_date — date
baptism_location — varchar
is_baptized — boolean
membership_status — varchar
preferred_contact_method — varchar
skills_talents — text[]
interests — text[] (No primary key)
profiles_new
id — uuid (PK) — FK → auth.users.id (comment: direct reference)
email — varchar (unique) (comment: user email)
full_name — varchar (nullable) (comment: display name)
created_at — timestamptz — default now()
updated_at — timestamptz — default now() Primary key: id
sync_error_log
id — uuid (PK) — default gen_random_uuid()
operation_type — text
error_message — text
affected_record_id — uuid
affected_email — text
error_timestamp — timestamptz — default now()
resolved — boolean — default false Primary key: id Comment: Log for synchronization errors
consolidation_log
id — uuid (PK) — default gen_random_uuid()
operation_timestamp — timestamptz — default now()
created_at — timestamptz — default now()
operation_type — text
records_affected — integer — default 0
conflicts_resolved — integer — default 0
status — text
details — jsonb
error_message — text
execution_time_ms — integer
created_by — text — default 'system' Primary key: id Comment: Tracks consolidation operations for audit