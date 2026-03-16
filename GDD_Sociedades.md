# GDD_Sociedades — Arkandia: Sociedades e Guildas
> Versão 1.1 — Março 2026
> Documento de referência canônico para o sistema de Sociedades de Arkandia.
> Sociedades são as organizações de jogadores — equivalentes a guildas, mas com identidade narrativa e mecânica próprias.
> Referência cruzada: GDD_Sistemas §2 (guerra), GDD_Mundo §8 (facções NPC), GDD_Personagem §12 (ficha).

---

## 1. O que é uma Sociedade

Uma Sociedade é uma organização permanente de jogadores com identidade própria no mundo de Arkandia. Não é apenas um grupo — é uma entidade que existe no mundo, com nome, bandeira, reputação, territórios e história.

Sociedades são o único meio de declarar guerra e controlar territórios. Personagens solo podem participar de guerras como mercenários, mas não podem possuir territórios nem declarar conflitos.

**Narrativamente:** Sociedades existem como forças reconhecidas em Ellia. O Jornal do Mundo as menciona. As facções NPC as tratam como atores políticos. O Conselho dos Anciões as monitora.

---

## 2. Criação de uma Sociedade

**Requisitos para fundar:**
- Personagem fundador deve estar no nível 10 ou acima
- Custo de fundação em Libras (valor definido em seed SQL)
- Nome único no servidor
- Mínimo de 1 membro fundador (o próprio)

**O que é definido na criação:**
- Nome da Sociedade
- Descrição/manifesto (texto narrativo — aparece na ficha pública da Sociedade)
- Emblema (cosmético — selecionado de catálogo ou customizado via Gemas)

---

## 3. Hierarquia Interna

| Cargo | Quem ocupa | Permissões |
|---|---|---|
| **Líder** | Fundador ou eleito por votação interna | Todas as permissões. Transfere liderança, dissolve a Sociedade |
| **General** | Nomeado pelo Líder (máximo 2) | Declara guerra, define estratégia de batalha, convida aliados, gerencia cofre |
| **Membro** | Qualquer jogador aceito | Participa de guerras, coleta produção (se autorizado), acessa chat da Sociedade |

**Transferência de liderança:**
- Líder pode transferir voluntariamente para qualquer membro
- Se Líder ficar inativo por período definido (valor em seed SQL), General mais antigo assume automaticamente

---

## 4. Membros

**Limite de membros:** definido pelo nível da Sociedade (valor em seed SQL por nível)

**Entrar em uma Sociedade:**
- Por convite do Líder ou General
- Por candidatura aberta (se a Sociedade estiver com recrutamento ativo)
- Um personagem só pode pertencer a uma Sociedade por vez

**Sair de uma Sociedade:**
- Voluntariamente a qualquer momento
- Por expulsão pelo Líder ou General
- Saída durante guerra ativa tem penalidade de reputação interna (narrativa — sem impacto mecânico direto)

---

## 5. Nível de Sociedade

Sociedades têm nível próprio que cresce com atividade:

**O que aumenta o nível:**
- Territórios controlados
- Guerras vencidas
- Membros ativos (expedições, daily tasks completadas)
- Reinvestimento no cofre

**O que o nível desbloqueia:**
- Limite maior de membros
- Acesso a tropas de nível maior para recrutamento
- Nível máximo de reinvestimento de território
- Cosméticos exclusivos de Sociedade (emblema expandido, cenário social privado)

---

## 6. Cofre da Sociedade

O cofre armazena Libras da Sociedade — separado da carteira individual dos membros.

**Entradas no cofre:**
- Impostos sobre produção passiva de territórios (percentual configurado pelo Líder)
- Doações voluntárias de membros
- Recompensas de guerras vencidas (saque de território)

**Saídas do cofre:**
- Recrutamento de tropas para guerras (custo debitado automaticamente)
- Declaração de guerra (taxa de declaração)
- Reinvestimento em territórios
- Qualquer gasto autorizado pelo General

**Acesso ao cofre:** apenas Líder e Generais podem movimentar o cofre

---

## 7. Reputação da Sociedade

Sociedades acumulam reputação com facções NPC da mesma forma que personagens individuais — mas em escala de organização.

**Como a reputação de Sociedade é calculada:**
- Média ponderada das ações dos membros em missões de facção
- Eventos de guerra que envolvem facções NPC
- Decisões do Líder/General em eventos narrativos

**Impacto:**
- Sociedades com reputação alta com certas facções têm acesso a missões de guerra especiais
- Sociedades com reputação hostil com uma facção sofrem penalidades em territórios dessa facção

---

## 8. Dissolução de Sociedade

**Condições de dissolução:**
- Líder dissolve voluntariamente
- Sociedade fica sem membros por período definido (valor em seed SQL)
- GM dissolve manualmente (para moderação)

**O que acontece ao dissolver:**
- Territórios controlados ficam sem dono (disputáveis imediatamente, sem safezone)
- Cofre é distribuído igualmente entre os membros ativos na data de dissolução
- Tropas são perdidas
- Histórico de guerra da Sociedade é preservado no arquivo do mundo
- Membros ficam sem Sociedade e podem fundar ou entrar em outra imediatamente

---

## 9. Diretrizes de Implementação

**Tabelas do banco (criadas na Fase 12):**
- `societies` — dados da Sociedade (nome, descrição, nível, treasury_libras, leader_id)
- `society_roles` — membros com cargo (society_id, character_id, role)
- `society_reputation` — reputação da Sociedade com facções NPC

**Lógica em `/lib/game/`:**
- Criação, entrada, saída e dissolução → `/lib/game/societies.ts`
- Cofre e impostos → parte de `/lib/game/economy.ts`
- Reputação de Sociedade → extensão de `/lib/game/reputation.ts`

**Regras invioláveis:**
- Um personagem não pode pertencer a mais de uma Sociedade simultaneamente — validado no servidor
- Apenas Sociedades podem declarar guerra — validado em `/lib/game/war.ts`
- Dissolução transfere territórios para sem-dono atomicamente — nunca deixar território em estado indefinido
- Cofre não pode ficar negativo — bloquear operação se saldo insuficiente

---

## 10. Missões Coletivas de Sociedade

### Filosofia

Missões coletivas existem para criar engajamento de grupo sem exigir horário combinado. Cada membro contribui no seu próprio ritmo durante a semana.

### Estrutura

- 3 missões ativas por Sociedade por semana
- Renovam segunda-feira à meia-noite
- Progresso visível para todos os membros em tempo real

### Tipos de missão coletiva

| Tipo | Exemplo |
|---|---|
| Expedições | "Membros completam 30 expedições" |
| Combate | "Membros vencem 20 duelos ranqueados" |
| Recrutamento | "Sociedade recruta 50 tropas" |
| Hunting | "Membros acumulam 500 kills em zonas" |
| Crafting | "Membros produzem 15 itens" |
| Economia | "Cofre da Sociedade recebe 2.000 Libras" |

### Recompensas

- Cofre da Sociedade recebe bônus de Libras ao completar
- Todos os membros que contribuíram recebem XP
- Missões especiais podem conceder item exclusivo ao cofre

### Missões definidas pelo GM

O GM pode criar missões coletivas especiais para eventos específicos (ex: "durante o Torneio, Sociedades completam missões de guerra especiais").

---

*Fim do GDD_Sociedades v1.1*
*Documentos relacionados: GDD_Mundo.md | GDD_Personagem.md | GDD_Sistemas.md*
