-- Backs the voice agent's `list_listings` tool (backend/app/services/listings_service.py).
-- Run this on a project that already has schema.sql + 001 + 002 applied.

create table if not exists listings (
    id text primary key,
    name text not null,
    location text not null,
    price numeric not null,
    price_display text not null,
    beds int not null,
    baths int not null,
    sqft int not null,
    property_type text not null,
    description text,
    badge text,
    status text not null default 'available', -- 'available' | 'under_offer' | 'sold'
    created_at timestamptz default now()
);

create index if not exists listings_status_idx on listings (status);

alter table listings enable row level security;
create policy "service role full access listings" on listings
    for all using (true) with check (true);

-- Seed the same approved inventory the dashboard's demo data uses
-- (frontend/lib/mock-data.ts), so both surfaces describe the same properties.
insert into listings (id, name, location, price, price_display, beds, baths, sqft, property_type, description, badge, status)
values
    ('klcc-residences-3br', 'KLCC Residences', 'Jalan Sultan Ismail, Kuala Lumpur', 780000, 'RM780,000', 3, 2, 1180, 'Condominium', 'High-floor city-view unit, 8 minutes from KLCC.', 'Best Match', 'available'),
    ('bukit-bintang-suite-3br', 'Bukit Bintang Suite', 'Bukit Bintang, Kuala Lumpur', 795000, 'RM795,000', 3, 2, 1120, 'Condominium', 'Walkable to retail, dining, and transit.', 'New Listing', 'available'),
    ('verde-mont-kiara-3br', 'Verde Mont Kiara', 'Mont Kiara, Kuala Lumpur', 1180000, 'RM1,180,000', 3, 2, 1250, 'Condominium', 'Low-density residence with garden views.', 'Premium', 'available'),
    ('bangsar-urban-loft', 'Bangsar Urban Loft', 'Bangsar, Kuala Lumpur', 920000, 'RM920,000', 2, 2, 980, 'Loft', 'Converted warehouse loft near Bangsar Village.', null, 'available'),
    ('setapak-family-residence', 'Setapak Family Residence', 'Setapak, Kuala Lumpur', 650000, 'RM650,000', 4, 3, 1400, 'Terrace house', 'Corner-lot terrace close to schools and the highway.', null, 'available'),
    ('cheras-starter-condo', 'Cheras Starter Condo', 'Cheras, Kuala Lumpur', 485000, 'RM485,000', 1, 1, 650, 'Condominium', 'Entry-level unit, good rental yield area.', null, 'available'),
    ('pj-garden-terrace', 'PJ Garden Terrace', 'Petaling Jaya, Selangor', 1050000, 'RM1,050,000', 4, 3, 1550, 'Terrace house', 'Renovated kitchen, private garden.', null, 'available'),
    ('cyberjaya-smart-suite', 'Cyberjaya Smart Suite', 'Cyberjaya, Selangor', 420000, 'RM420,000', 1, 1, 620, 'Condominium', 'Smart-home fittings, tech-park adjacent.', null, 'available'),
    ('shah-alam-family-residence', 'Shah Alam Family Residence', 'Shah Alam, Selangor', 880000, 'RM880,000', 4, 3, 1450, 'Terrace house', 'Gated community, playground access.', null, 'available')
on conflict (id) do nothing;
