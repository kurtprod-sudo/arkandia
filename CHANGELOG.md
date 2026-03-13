# CHANGELOG — Arkandia

## [Redesign — Game Design Completo] — Março 2026

### Game Design
- Criado GDD_Mundo.md v1.1 — lore completo, cosmologia, 5 macrorregiões, 15 nações, territórios, facções, figuras lendárias, Imperadores, Conselho dos Anciões, Armas Ancestrais, Monólitos
- Criado GDD_Personagem.md v1.0 — 6 raças jogáveis, 11 classes (por arma), atributos, progressão, ressonância com level próprio, skills, building de 6 slots, 3 categorias de maestria, 3 moedas
- Criado GDD_Sistemas.md v1.0 — combate PvP/PvE em turnos, guerra de territórios idle, expedições (3 tipos), economia player-driven, daily tasks, engajamento e retenção
- Criado GDD_Narrativa.md v1.0 — Gazeta do Horizonte (persona Mara Voss), 6 contextos de IA, conduta e restrições da IA, painel GM narrativo, glossário canônico, diretrizes de estilo

### Decisões de redesign
- **Profissões removidas** — crafting e comércio são features de menu, não identidade de personagem
- **Raças jogáveis definidas:** Humano, Elfo, Anão, Draconiano, Meio-Gigante, Melfork
- **11 Classes por arma** (não por arquétipo mágico): Lanceiro, Espadachim, Lutador, Bardo, Atirador, Arqueiro, Assassino, Druida, Destruidor, Escudeiro, Mago
- **Ressonância** escolhida na Criação → agora é revelada por evento narrativo no Nível 5
- **Classe** no Nível 10 → agora escolhida na Criação do personagem
- **Skills não sobem de nível** — escalam pelos atributos do personagem
- **Building:** limite de 6 slots entre ativas, passivas e reativas
- **3 categorias de Maestria:** Prestígio (Pergaminho + Essência), Ressonância (Essência), Lendária (Gema, esgotável)
- **Avatar visual** 2.5D gerado por IA com estilo Fate/One Piece definido
- **Cenários Sociais** — instâncias de RP no site como substituto visual ao Habbo

### Pendente (próximas fases)
- GDD_Sociedades.md — a criar antes da Fase 12 de implementação
- Refatoração do banco: migração 002 (sistema de personagem)
- Refatoração da criação de personagem (Raça + Classe substituem Profissão)

---

## [Design System v3] — Março 2026

### Mudança filosófica de paleta
- Texto principal: `#F0E6D3` → `#ffffff` (branco puro)
- Texto secundário/labels: tons bronze → rgba branco com opacidade
- Dourado restrito: reservado para nome do personagem, arquétipo, itens lendários
- Superfícies: sólidas → glassmorphism (`backdrop-filter: blur`) como padrão
- Borders: dourado dim → crimson rgba como padrão de interface

### Migração tipográfica
- Removidas: Cormorant Garamond, Libre Baskerville, Rajdhani (Google Fonts)
- Adicionada: Intelo (fonte local, `public/fonts/`, 16 arquivos)
- Variável única `--font-intelo` reconecta `--font-display`, `--font-body`, `--font-data`

### Componentes atualizados
- ArkInput — paleta crimson/branco, border focus crimson
- ArkButton — variante primary crimson puro, secondary transparente com border crimson
- ArkCard — glassmorphism como padrão, borda dourada apenas na variante `legendary`

### Novas variáveis CSS
- `--ark-surface`, `--ark-surface-raised`, `--ark-surface-solid`
- `--ark-border`, `--ark-border-bright`, `--ark-border-gold`
- `--ark-blur`, `--ark-blur-sm`
- `--text-error: #ff6b6b`

### Arquivos modificados
- app/layout.tsx — localFont Intelo substituindo Google Fonts
- app/globals.css — paleta v3, classes atualizadas, regra canônica documentada
- tailwind.config.ts — tokens atualizados, fallback sans-serif, token error adicionado
- components/ui/ArkInput.tsx — paleta crimson/branco
- components/ui/ArkButton.tsx — variantes primary e secondary
- components/ui/ArkCard.tsx — glassmorphism como padrão

---

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
