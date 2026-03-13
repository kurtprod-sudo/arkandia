# CHANGELOG — Arkandia

## [Design System v2] — Março 2026

### Refatoração visual completa
- Tipografia: substituídas Cinzel Decorative + Crimson Pro + Inter por
  Cormorant Garamond (display) + Libre Baskerville (body) + Rajdhani (data)
- Paleta: consolidada em variáveis CSS --ark-* e --text-*
  Cores principais: #6e160f (vermelho heráldico) e #d3a539 (dourado)
- Portrait: moldura heráldica PNG com área interior mapeada em pixels exatos
  Upload funcional via Supabase Storage (bucket `portraits`)
- HUD do personagem: 3 camadas (Arquétipo com losangos / Classe+Status / Metadados)
- Section headers: ícone SVG temático + título Cormorant dourado + linha dissolvida
- Atributos: nomes em maiúsculo + sigla (ABR) em Rajdhani
- Barras: HP vermelho, Éter cinza/branco, XP dourado
- Animações: shimmer-name, glow-breathe, rune-pulse, bar-reveal

### Arquivos modificados
- app/layout.tsx — novas fontes next/font
- tailwind.config.ts — fontFamily atualizado
- app/globals.css — paleta e classes completas v2
- components/character/CharacterSheet.tsx — layout ficha completo
- components/character/PortraitUpload.tsx — upload com preview
- app/character/uploadPortrait.ts — Server Action upload
- components/ui/ArkPortraitParticles.tsx — novo componente
- supabase/migrations/002_portrait_storage.sql — bucket + RLS + avatar_url

### Removido
- Classes antigas: glow-wine, glow-bronze, shimmer genérico, pulse-glow,
  particle-float, bronze-*, wine-*
- Fontes: Cinzel Decorative, Crimson Pro, Inter

---

## [Fase 1] — Março 2026

### O que foi construído
- Setup completo: Next.js 14 (App Router), Supabase, TypeScript, Tailwind, Vercel
- Sistema de autenticação (Supabase Auth) com registro e login
- Criação de personagem com escolha de profissão ("Forja do Destino")
- Ficha privada do personagem com todos os atributos do Core Ruleset
- Ficha pública (Nome, Level, Sociedade, Título, Status)
- Painel GM com controle de atributos, carteira e status de qualquer personagem
- Feed de eventos em tempo real no painel GM
- Jornal do mundo no dashboard
- Design system completo (paleta vinho/bronze, fontes Cinzel/Crimson Pro/Inter, componentes Ark*)

### Decisões importantes
- 1 conta = 1 personagem (a conta É o personagem, sem alts)
- Morte permanente removida — consequências graduais no lugar
- Produção passiva calculada on-demand via timestamp (não background job)
- Sistema de turnos assíncrono para combate (não realtime)
- Toda ação relevante gera registro na tabela events (alimenta jornal e histórico)
- GM solo com override total via painel administrativo

### Schema do banco (tabelas criadas)
profiles, characters, character_attributes, character_wallet, professions, 
archetypes, classes, skills, societies, society_members, events

---

## [Próximas fases planejadas]
- Fase 2: territórios, facções NPC, relacionamento jogador ↔ facção, mapa político
- Fase 3: inventário, crafting, mercado, produção passiva
- Fase 4: PvP em turnos com animações, sistema de guerra com fases
- Fase 5: classes, profissões, skills, expedições idle, dungeons em grupo
- Fase 6: ações narrativas diárias, jornal via IA (Claude API), histórico de personagem
- Fase 7: cash shop, integração PIX
