# CHANGELOG — Arkandia

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
