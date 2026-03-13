-- =============================================================================
-- Arkandia — Migration 002: Portrait Storage
-- Executar no SQL Editor do Dashboard do Supabase
-- =============================================================================

-- Bucket público para portraits de personagem
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portraits',
  'portraits',
  true,
  2097152,  -- 2MB máximo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- RLS: qualquer um pode ver (bucket público)
create policy "Portraits são públicos"
  on storage.objects for select
  using ( bucket_id = 'portraits' );

-- RLS: jogador só faz upload na própria pasta (user_id/portrait.*)
create policy "Jogador faz upload do próprio portrait"
  on storage.objects for insert
  with check (
    bucket_id = 'portraits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS: jogador só atualiza o próprio portrait
create policy "Jogador atualiza o próprio portrait"
  on storage.objects for update
  using (
    bucket_id = 'portraits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS: jogador só deleta o próprio portrait
create policy "Jogador deleta o próprio portrait"
  on storage.objects for delete
  using (
    bucket_id = 'portraits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Adicionar coluna avatar_url na tabela characters (se não existir)
alter table characters
  add column if not exists avatar_url text default null;
