# GDD_Balanceamento — Arkandia: Números e Fórmulas
> Versão 1.1 — Março 2026
> Documento canônico de todos os valores numéricos do Arkandia.
> Os GDDs de design (GDD_Personagem, GDD_Sistemas) descrevem **o quê** e **por quê**.
> Este documento descreve **quanto** — os números exatos que tornam o design real.
> Toda lógica em /lib/game e toda seed SQL devem ser consistentes com este documento.
> Ao criar conteúdo (skills, itens, maestrias), consulte este documento para garantir
> que os valores estejam dentro dos ranges calibrados.

---

## ÍNDICE

1. [Princípios de Design Numérico](#1-princípios-de-design-numérico)
2. [Atributos — Valores Iniciais por Classe](#2-atributos--valores-iniciais-por-classe)
3. [Bônus Raciais](#3-bônus-raciais)
4. [Fórmulas Derivadas](#4-fórmulas-derivadas)
5. [Escalonamento por Nível](#5-escalonamento-por-nível)
6. [Progressão de XP](#6-progressão-de-xp)
7. [Éter e Ressonância](#7-éter-e-ressonância)
8. [Sistema de Combate — Fórmulas](#8-sistema-de-combate--fórmulas)
9. [Ranges de Dano por Tier de Skill](#9-ranges-de-dano-por-tier-de-skill)
10. [Essências — Ganho e Custo](#10-essências--ganho-e-custo)
11. [Libras — Ganho e Custo](#11-libras--ganho-e-custo)
12. [Gemas — Preços e Usos](#12-gemas--preços-e-usos)
13. [Expedições — Calibragem](#13-expedições--calibragem)
14. [Sistema de Guerra — Números](#14-sistema-de-guerra--números)
15. [Dungeons — Calibragem](#15-dungeons--calibragem)
16. [Missões PvE (Hunting) — Calibragem](#16-missões-pve-hunting--calibragem)
17. [Sociedades — Limites e Progressão](#17-sociedades--limites-e-progressão)
18. [Histórico de Revisões](#18-histórico-de-revisões)

---

## 1. Princípios de Design Numérico

### Âncoras que guiam todos os valores

**Âncora 1 — Duração de combate PvP entre personagens de poder similar:**
8 a 15 turnos. Garante decisão estratégica sem tediar.

**Âncora 2 — Progressão da campanha inicial (níveis 1–10):**
- Nível 5 atingível no **primeiro dia** de jogo casual
- Nível 10 atingível em **3–5 dias** dedicados ou **1 semana** casual
- Ritmo dopamínico: primeiros níveis quase instantâneos, curva cresce gradualmente

**Âncora 3 — Economia circular:**
- Libras: circulam constantemente (entram via expedições/territórios, saem via tropas/mercado)
- Essências: escassas o suficiente para criar decisões difíceis de priorização
- Gemas: desejadas, nunca obrigatórias para progredir

**Âncora 4 — Farm ativo e recompensa imediata:**
Jogadores dedicados devem conseguir progredir visivelmente em uma sessão de 1–2h.
As Missões PvE (Hunting) são o loop de farm principal para jogadores ativos.
Expedições idle existem em paralelo para progressão passiva.

---

## 2. Atributos — Valores Iniciais por Classe

> Esses são os valores ao criar o personagem no nível 1, **antes** de aplicar bônus raciais.
> Éter é o pool de recurso — não confundir com o atributo Éter (que é o atributo Magia para classes mágicas).

| Classe | ATQ | MAG | DEF | VIT | VEL | PRE | TEN | CAP | Éter Máx |
|---|---|---|---|---|---|---|---|---|---|
| Lanceiro | 20 | 10 | 10 | 10 | 20 | 15 | 10 | 10 | 50 |
| Espadachim | 20 | 10 | 10 | 10 | 10 | 20 | 15 | 10 | 50 |
| Lutador | 20 | 10 | 10 | 20 | 10 | 10 | 15 | 10 | 40 |
| Bardo | 10 | 20 | 10 | 10 | 10 | 15 | 10 | 10 | 80 |
| Atirador | 20 | 10 | 10 | 10 | 15 | 20 | 10 | 10 | 50 |
| Arqueiro | 20 | 10 | 10 | 10 | 15 | 20 | 10 | 10 | 50 |
| Assassino | 20 | 10 | 10 | 10 | 20 | 15 | 10 | 10 | 45 |
| Druida | 20 | 15 | 10 | 20 | 10 | 10 | 10 | 10 | 55 |
| Destruidor | 20 | 10 | 15 | 20 | 10 | 10 | 10 | 10 | 45 |
| Escudeiro | 10 | 10 | 20 | 20 | 10 | 10 | 10 | 10 | 45 |
| Mago | 10 | 20 | 10 | 10 | 10 | 15 | 10 | 10 | 90 |

**Lógica de distribuição:**
- Atributos primários (2): começam em 20
- Atributo secundário (1): começa em 15
- Todos os outros: começam em 10

---

## 3. Bônus Raciais

> Bônus são **aditivos** aos valores base de classe, aplicados na criação do personagem.
> Implementados via campo `metadata` na tabela `races`.

| Raça | Bônus de atributo | Bônus especial |
|---|---|---|
| **Humano** | Nenhum bônus de atributo | +1 ponto livre por nível (4 total vs 3 das outras raças) + sem restrição de Maestria |
| **Elfo** | Nenhum bônus de atributo base | Éter máximo +20 na criação; +2 Éter máximo por nível |
| **Anão** | DEF +3, VIT +2 | Vantagem narrativa em missões de crafting e territórios Forja |
| **Draconiano** | ATQ +3 | Resistência a dano de fogo: reduz 15% do dano de skills com tag `fogo` |
| **Meio-Gigante** | VIT +4, TEN +3 | Vantagem narrativa em habilidades de impacto e derrubada |
| **Melfork** | MAG +3 | Regenera +3 Éter extra por turno em combate (passiva racial permanente) |

**Exemplo — Anão Destruidor no nível 1:**
- ATQ base 20 + 0 = **20**
- VIT base 20 + 2 = **22** → HP = 80 + (22×5) = **190**
- DEF base 15 + 3 = **18**

---

## 4. Fórmulas Derivadas

### HP Máximo
```
HP_max = 80 + (Vitalidade × 5)
```
| VIT | HP |
|---|---|
| 10 (mínimo nível 1) | 130 |
| 20 (Lutador nível 1) | 180 |
| 24 (Meio-Gigante Destruidor) | 200 |
| 50 (nível 10 com foco) | 330 |
| 100 (nível alto) | 580 |

### Éter máximo base
```
Éter_base = valor_inicial_por_classe + (8 × níveis_subidos)
  + (12 × níveis_subidos para Bardo e Mago)
  + bônus_racial
  + Éter_Ressonância (ver seção 7)
```

### Esquiva (chance passiva)
```
Chance_esquiva = min(40%, Velocidade × 0.5%)
```
| VEL | Esquiva |
|---|---|
| 10 | 5% |
| 20 | 10% |
| 40 | 20% |
| 80 | 40% (cap) |

**Cap de 40%** evita que classes focadas em velocidade sejam intocáveis.

### Aplicação de Efeito de Status
```
Chance_aplicar = min(95%, max(5%, 50% + (Precisão - Tenacidade) × 2%))
```
| PRE - TEN | Chance |
|---|---|
| -20 | 10% |
| 0 | 50% |
| +10 | 70% |
| +23 | 95% (cap) |

### Pontos livres por nível
- **Humano:** 4 pontos por nível
- **Todas as outras raças:** 3 pontos por nível

---

## 5. Escalonamento por Nível

### Pontos automáticos por nível (definidos pela Classe)

A cada nível, a Classe distribui automaticamente pontos nos atributos.
Implementado em `lib/game/attributes.ts` via campo `scaling` na tabela `classes`.

| Classe | Primário 1 | Primário 2 | Secundário | Éter | Outros |
|---|---|---|---|---|---|
| Lanceiro | ATQ +3 | VEL +3 | PRE +1 | +8 | +0.5 cada |
| Espadachim | ATQ +3 | PRE +3 | TEN +1 | +8 | +0.5 cada |
| Lutador | ATQ +3 | VIT +3 | TEN +1 | +8 | +0.5 cada |
| Bardo | MAG +3 | — | PRE +1 | +13 | +0.5 cada |
| Atirador | PRE +3 | ATQ +3 | VEL +1 | +8 | +0.5 cada |
| Arqueiro | PRE +3 | ATQ +3 | VEL +1 | +8 | +0.5 cada |
| Assassino | ATQ +3 | VEL +3 | PRE +1 | +8 | +0.5 cada |
| Druida | ATQ +3 | VIT +3 | MAG +1 | +8 | +0.5 cada |
| Destruidor | ATQ +3 | VIT +3 | DEF +1 | +8 | +0.5 cada |
| Escudeiro | DEF +3 | VIT +3 | ATQ +1 | +8 | +0.5 cada |
| Mago | MAG +3 | — | PRE +1 | +13 | +0.5 cada |

**Nota:** Bardo e Mago têm apenas 1 primário de atributo (o segundo "primário" é o Éter,
tratado separadamente no escalonamento de Éter).

### Exemplo — Espadachim no nível 10 (sem pontos livres)
- ATQ: 20 + (3×9) = **47**
- PRE: 20 + (3×9) = **47**
- TEN: 15 + (1×9) = **24**
- VIT: 10 + (0.5×9) = **14.5 ≈ 14**
- HP: 80 + (14×5) = **150**
- Éter: 50 + (8×9) = **122**

---

## 6. Progressão de XP

### Tabela de XP por nível (níveis 1–15)

Curva dopamínica: primeiros níveis quase instantâneos, desacelera progressivamente.

| Nível | XP para subir | XP acumulado | Tempo estimado* |
|---|---|---|---|
| 1 → 2 | 50 | 50 | ~30 min |
| 2 → 3 | 100 | 150 | ~1h |
| 3 → 4 | 180 | 330 | ~2h |
| 4 → 5 | 270 | 600 | ~3–4h total |
| 5 → 6 | 400 | 1.000 | ~6h total |
| 6 → 7 | 600 | 1.600 | ~9h total |
| 7 → 8 | 900 | 2.500 | ~14h total |
| 8 → 9 | 1.300 | 3.800 | ~20h total |
| 9 → 10 | 1.800 | 5.600 | ~28h total |
| 10 → 11 | 2.800 | 8.400 | ~40h total |
| 11 → 12 | 4.000 | 12.400 | ~55h total |
| 12 → 13 | 5.500 | 17.900 | — |
| 13 → 14 | 7.200 | 25.100 | — |
| 14 → 15 | 9.200 | 34.300 | — |

*Estimativa para jogador casual (2–3h/dia, 2 expedições moderadas + daily tasks)

### Fórmula para níveis 16+
```
XP_necessário(nível) = 500 × nível²
```
| Nível | XP necessário |
|---|---|
| 16 | 128.000 |
| 20 | 200.000 |
| 30 | 450.000 |

### Ganho de XP por atividade

| Atividade | XP |
|---|---|
| Expedição segura (2h) | 80–120 |
| Expedição moderada (4h) | 180–260 |
| Expedição perigosa (8h) | 350–500 |
| Expedição extrema (12h) | 600–900 |
| Vitória PvP ranqueado | 200 |
| Derrota PvP ranqueado | 60 |
| Vitória PvP emboscada | 150 |
| Derrota PvP emboscada | 40 |
| Duelo livre | 0 |
| Dungeon normal (sucesso) | 200 |
| Dungeon difícil (sucesso) | 450 |
| Dungeon lendária (sucesso) | 900 |
| Daily tasks (5/5) | 80 |
| Login diário (streak ativo) | 20 |
| Streak 30 dias | 800 |
| Missão PvE — NPC fraco | 15–30 |
| Missão PvE — NPC médio | 40–70 |
| Missão PvE — NPC forte | 80–150 |
| Missão PvE — NPC elite | 200–400 |

---

## 7. Éter e Ressonância

### Éter base no nível 1 (por classe)
Ver tabela na seção 2. Bardo e Mago começam com mais Éter e escalam mais rápido.

### Crescimento automático de Éter por nível
- Todas as classes: **+8 Éter máximo por nível**
- Bardo e Mago: **+13 Éter máximo por nível** (coluna `eter_per_level` no scaling)
- Elfo: **+2 Éter máximo extra por nível** (bônus racial)

### Ressonância — Éter adicional

Ao desbloquear a Ressonância (nível 5), o Éter máximo aumenta imediatamente.
A cada upgrade de Ressonância, o Éter aumenta conforme a fórmula abaixo.

**Fórmula de Éter adicional por nível de Ressonância:**
```
Éter_Ressonância(n) = 30n + 5n²
```

Implementada em PostgreSQL como `calc_resonance_eter(n)` e em TypeScript como
`calcResonanceEter(n)` em `lib/game/attributes.ts`.

| Nível Res. | Éter ganho neste nível | Éter total acumulado da Ressonância |
|---|---|---|
| 1 (desbloqueio) | 35 | 35 |
| 2 | 50 | 85 |
| 3 | 75 | 160 |
| 4 | 110 | 270 |
| 5 | 155 | 425 |
| 6 | 210 | 635 |
| 7 | 275 | 910 |
| 8 | 350 | 1.260 |
| 10 | 530 | ~2.100 |
| 15 | 1.155 | ~6.000 |
| 20 | 2.080 | ~13.000 |

**Exemplo — Mago nível 20, Ressonância 10:**
- Éter base: 90 + (13×19 níveis) = 337
- Éter da Ressonância: ~2.100
- **Total: ~2.437 Éter máximo**

### Ressonância — Custo em Essências por nível

**Fórmula:**
```
Custo_Ressonância(n) = 50n + 10n²
```

Implementada como `calc_resonance_cost(n)` no banco e `calcResonanceCost(n)` em TypeScript.

| Nível alvo | Custo para subir | Essências acumuladas gastas |
|---|---|---|
| 1 (desbloqueio via GM) | 0 (narrativo) | 0 |
| 1 → 2 | 120 | 120 |
| 2 → 3 | 210 | 330 |
| 3 → 4 | 340 | 670 |
| 4 → 5 | 510 | 1.180 |
| 5 → 6 | 720 | 1.900 |
| 6 → 7 | 980 | 2.880 |
| 10 | 2.100 | ~10.000 |
| 15 | 5.000 | ~30.000 |

### Custo de skills da árvore básica de Classe (em Essências)

| Posição na árvore | Custo |
|---|---|
| Skills iniciais (1 ativa + 1 passiva) | Grátis (concedidas na criação) |
| Skills 3–4 | 30 Essências cada |
| Skills 5–6 | 50 Essências cada |
| Skills 7 | 80 Essências |
| Skill 8 (última) | 120 Essências |
| **Total para completar a árvore** | **360 Essências** |

---

## 8. Sistema de Combate — Fórmulas

### Fórmula de dano geral
```
Dano_Final = max(1, Dano_Bruto - Defesa_Efetiva)

Dano_Bruto = Base + (ATQ × fator_ataque) + (MAG × fator_magia)

Defesa_Efetiva = Defesa × (1 - penetração_defesa%)
```

### Ataque Básico
```
Dano = max(1, 8 + ATQ × 0.6 - DEF × 0.5)
```

| ATQ/DEF | Dano esperado |
|---|---|
| ATQ 20 vs DEF 10 (nível 1) | 8 + 12 - 5 = **15** |
| ATQ 47 vs DEF 19 (nível 10) | 8 + 28 - 9 = **27** |
| ATQ 100 vs DEF 40 (nível 20) | 8 + 60 - 20 = **48** |

### Timer de turno PvP
- **60 segundos** por turno em todas as modalidades
- Turno expirado = Ataque Básico automático

### Consequências de derrota PvP

| Modalidade | Essências perdidas | Recuperação |
|---|---|---|
| Duelo Livre | 0 | 0h |
| Duelo Ranqueado | 10 | 2h |
| Emboscada | 20 | 4h |
| Torneio | 10 | 1h |

*Durante recuperação: PvP e expedições perigoso/extremo bloqueados.
Jornal, daily tasks, mercado e expedições seguro/moderado liberados.*

---

## 9. Ranges de Dano por Tier de Skill

> Esses ranges são a **referência canônica para criação de skills**.
> Todo conteúdo de skill deve estar dentro dos ranges definidos para seu tier.
> Os valores abaixo são para personagem de referência nível 10 (ATQ/MAG ~47).

### Skills de dano físico (baseadas em ATQ)

| Tier | Fórmula base | Dano esperado (nível 10) | Custo de Éter | Cooldown |
|---|---|---|---|---|
| **Leve** | `5 + ATQ×0.8` | 42–45 | 8–12 | 0–1 turno |
| **Médio** | `15 + ATQ×1.2` | 70–75 | 18–25 | 1–2 turnos |
| **Alto** | `25 + ATQ×1.8` | 108–115 | 35–50 | 2–3 turnos |
| **Ultimate** | `40 + ATQ×2.5` | 155–165 | 60–80 | 4–5 turnos |

### Skills de dano mágico (baseadas em MAG)

| Tier | Fórmula base | Dano esperado (nível 10) | Custo de Éter | Cooldown |
|---|---|---|---|---|
| **Leve** | `5 + MAG×0.8` | 42–45 | 8–12 | 0–1 turno |
| **Médio** | `15 + MAG×1.5` | 85–90 | 18–25 | 1–2 turnos |
| **Alto** | `20 + MAG×2.0` | 114–120 | 35–50 | 2–3 turnos |
| **Ultimate** | `30 + MAG×2.8` | 162–170 | 60–80 | 4–5 turnos |

### Skills híbridas (ATQ + MAG)

| Tier | Fórmula base | Custo de Éter |
|---|---|---|
| **Médio** | `10 + ATQ×0.8 + MAG×0.6` | 20–28 |
| **Alto** | `20 + ATQ×1.2 + MAG×1.0` | 38–55 |

### Skills de cura (baseadas em MAG)

| Tier | Fórmula base | Cura esperada (nível 10) | Custo de Éter |
|---|---|---|---|
| **Leve** | `10 + MAG×0.6` | 38–42 | 10–15 |
| **Médio** | `20 + MAG×1.0` | 67–72 | 22–30 |
| **Alto** | `40 + MAG×1.5` | 110–115 | 40–55 |

### Skills de controle / utilidade

Não causam dano — aplicam efeitos de status.
- **Custo de Éter:** 12–30 dependendo da duração e poder do efeito
- **Cooldown:** 2–4 turnos para efeitos fortes (Stun, Sono)
- **Resistência:** calculada por `calcEffectApplyChance(PRE, TEN)`

### Skills passivas

Não têm custo de Éter nem cooldown — ficam sempre ativas enquanto equipadas.
Exemplos de efeitos:
- Bônus fixo de atributo (+5 ATQ, +10 DEF)
- Redução percentual de dano recebido (5–15%)
- Regeneração de Éter por turno (+3–8 Éter/turno)
- Chance de proc em condição específica

---

## 10. Essências — Ganho e Custo

### Fontes de Essências

| Fonte | Essências |
|---|---|
| Subir de nível | 40 por nível |
| Vitória PvP ranqueado | 20 |
| Derrota PvP ranqueado | 5 |
| Dungeon normal (sucesso) | 25 |
| Dungeon difícil (sucesso) | 60 |
| Dungeon lendária (sucesso) | 150 |
| Expedição moderada (drop, 30% chance) | 5 |
| Expedição perigosa (drop, 40% chance) | 15 |
| Expedição extrema (drop, 50% chance) | 30 |
| Missão PvE — NPC drop (chance variável) | 2–10 |
| Daily tasks (5/5) | 10 |
| Streak 30 dias | 100 |

### Custos de Essências

| Ação | Essências |
|---|---|
| Skill 3–4 da árvore | 30 cada |
| Skill 5–6 da árvore | 50 cada |
| Skill 7 da árvore | 80 |
| Skill 8 da árvore (última) | 120 |
| **Total da árvore básica** | **360** |
| Upar Ressonância (fórmula) | `50n + 10n²` |
| Maestria de Prestígio | 150–300 |
| Maestria de Ressonância | 200–600 (por nível de Ressonância exigido) |

**Estimativa no nível 10:** ~400 Essências acumuladas.
Permite adquirir 4–5 skills ou upar Ressonância até nível 2 com folga.

---

## 11. Libras — Ganho e Custo

### Fontes de Libras

| Fonte | Libras |
|---|---|
| Expedição segura (2h) | 40–80 |
| Expedição moderada (4h) | 100–200 |
| Expedição perigosa (8h) | 220–400 |
| Expedição extrema (12h) | 450–800 |
| Vitória PvP ranqueado | 80 |
| Dungeon normal (sucesso) | 80 |
| Dungeon difícil (sucesso) | 150 |
| Dungeon lendária (sucesso) | 300 |
| Produção passiva — Comercial | 25 Libras/hora |
| Produção passiva — Forja | 15 Libras/hora |
| Produção passiva — Arcano | 12 Libras/hora |
| Produção passiva — Militar | 8 Libras/hora |
| Produção passiva — Relíquia | 5 Libras/hora |
| Produção passiva — Estratégico | 10 Libras/hora |
| Missão PvE — NPC drop | 5–80 por kill |
| Venda no Bazaar | variável |

### Custos de Libras

| Ação | Libras |
|---|---|
| Fundar Sociedade | 200 |
| Declarar guerra (taxa) | 150 |
| Recrutar Infantaria (por unidade) | 30 |
| Recrutar Cavalaria (por unidade) | 80 |
| Recrutar Arquearia (por unidade) | 50 |
| Recrutar Cerco (por unidade) | 130 |

### Produção passiva com reinvestimento

Multiplicadores por nível de reinvestimento:
`[1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 4.0]`

Exemplo: território Comercial (25 Libras/hora) com reinvestimento nível 3 (×1.8):
= **45 Libras/hora** = **1.080 Libras/dia**

---

## 12. Gemas — Preços e Usos

### Proporção base
```
R$ 1,00 = 10 Gemas
```

### Loja Sazonal de Lendárias (sem gacha)

Catálogo com 6–10 Maestrias Lendárias disponíveis por 30 dias.
Preço fixo — sem aleatoriedade. O jogador escolhe o que quer.
Ao ser comprada, removida do catálogo desta temporada.

| Tipo de Lendária | Gemas | R$ equivalente |
|---|---|---|
| Lendária simples (1 skill) | 500 | R$50 |
| Lendária média (2 skills) | 800 | R$80 |
| Lendária completa (3 skills) | 1.200 | R$120 |

### Catálogo de Summon (gacha de materiais)

Mantém aleatoriedade para itens, materiais e consumíveis.

| Item | Gemas |
|---|---|
| Pull de Summon (1x) | 10 |
| Pity garantido após | 30 pulls |

### Outros usos de Gemas

| Uso | Gemas | R$ equivalente |
|---|---|---|
| Rework de avatar | 50 | R$5 |
| Acelerar recrutamento de tropa (por hora) | 10 | R$1 |

---

## 13. Expedições — Calibragem

### Chance de sucesso base por nível de risco

```
Chance_final = min(95%, base_chance + Σ(atributo × peso))
```

| Risco | Base | Atributos que influenciam |
|---|---|---|
| Seguro | 75% | ATQ×0.10, MAG×0.10, VEL×0.05 |
| Moderado | 55% | ATQ×0.15, MAG×0.15, VEL×0.10 |
| Perigoso | 35% | ATQ×0.20, MAG×0.20, VEL×0.15, PRE×0.10 |
| Extremo | 15% | ATQ×0.25, MAG×0.25, VEL×0.20, PRE×0.15, VIT×0.10 |

**Chance esperada para personagem nível 5 (atributos ~30–35):**

| Risco | Chance esperada |
|---|---|
| Seguro | ~85% |
| Moderado | ~65% |
| Perigoso | ~50% |
| Extremo | ~35% |

### Tabela de loot por nível de risco

| Risco | XP base | Libras | Essência (chance/qtd) | Material (chance) | Raro (chance) |
|---|---|---|---|---|---|
| Seguro | 100 | 40–80 | — | 10% | 2% |
| Moderado | 220 | 100–200 | 30% / 5 | 25% | 5% |
| Perigoso | 425 | 220–400 | 40% / 15 | 40% | 10% |
| Extremo | 750 | 450–800 | 50% / 30 | 60% | 20% |

### Horas de recuperação em caso de falha

| Risco | Horas ferido | Essências perdidas |
|---|---|---|
| Seguro | 0 | 0 |
| Moderado | 4 | 0 |
| Perigoso | 12 | 5 |
| Extremo | 24 | 15 |

---

## 14. Sistema de Guerra — Números

### Poder base por tipo de tropa

| Tipo | Poder/unidade | Counter (×1.5 contra) |
|---|---|---|
| Infantaria | 10 | Cavalaria |
| Cavalaria | 15 | Arquearia |
| Arquearia | 12 | Infantaria |
| Cerco | 8 (×3 vs estruturas) | sem counter |

### Taxa de baixas por batalha

| Resultado | Baixas |
|---|---|
| Vencedor | 15% das tropas comprometidas |
| Perdedor | 30% das tropas comprometidas |
| Empate | 20% de ambos os lados |

### Influência do personagem no poder de batalha

```
Bônus_personagem = (ATQ / 10) × 1% + (CAP / 10) × 1%
```

Exemplo: personagem com ATQ 47 e CAP 14 contribui com **+6.1%** de poder.

### Safezones

| Gatilho | Duração |
|---|---|
| Atribuição pelo GM | 24 horas |
| Conquista em guerra | 48 horas |

### Custo de declaração de guerra

150 Libras (evita spam de declarações).

---

## 15. Dungeons — Calibragem

### Dificuldade por fase

```
phaseDifficulty = floor(50 × multiplier × (0.5 + current_phase / totalPhases))
```

**Multiplicadores por dificuldade:**
- Normal: 1.0
- Difícil: 1.8
- Lendária: 3.0

**Dificuldade esperada por fase:**

| Dificuldade | Fase 1 | Fase 2 | Fase 3 |
|---|---|---|---|
| Normal | 41 | 58 | 75 |
| Difícil | 74 | 105 | 135 |
| Lendária | 124 | 175 | 225 |

### Dano por fase

```
Dano_sucesso = phaseDifficulty × 0.2
Dano_falha   = phaseDifficulty × 0.5
```

**Dano esperado por personagem (Normal, personagem ~HP 200):**

| Fase | Sucesso | Falha |
|---|---|---|
| 1 | 8 (~4% HP) | 20 (~10% HP) |
| 2 | 11 (~5% HP) | 29 (~15% HP) |
| 3 | 15 (~7% HP) | 37 (~18% HP) |

Dungeon Normal não deve matar personagens com HP cheio. Lendária pode.

### Recompensas base

| Dificuldade | XP base | Libras base |
|---|---|---|
| Normal | 200 | 80 |
| Difícil | 450 | 150 |
| Lendária | 900 | 300 |

Multiplicadores por resultado: Sucesso ×1.0 / Parcial ×0.5 / Falha ×0.1

---

## 16. Missões PvE (Hunting) — Calibragem

> Sistema implementado na Fase 21 do projeto.
> O jogador entra em combate sequencial contra NPCs usando o engine de PvP.

### Tiers de NPC

| Tier | Nível recomendado | ATQ/MAG | HP | DEF | Recompensas |
|---|---|---|---|---|---|
| **Fraco** | 1–5 | 12–18 | 80–120 | 5–10 | XP 15–30, Libras 5–15, Essência 0–2 |
| **Médio** | 3–10 | 25–40 | 150–220 | 15–25 | XP 40–70, Libras 20–50, Essência 2–5 |
| **Forte** | 8–15 | 45–70 | 280–400 | 30–45 | XP 80–150, Libras 60–120, Essência 5–10 |
| **Elite** | 12+ | 80–120 | 500–800 | 50–80 | XP 200–400, Libras 150–300, Essência 10–20 |

### Limites de sessão

- **Kills máximos por sessão (Modo Auto):** 20 kills
- **Kills máximos por sessão (Modo Manual):** sem limite (o jogador calibra)
- **Penalidade de morte:** perde todo o loot acumulado da sessão atual
- **Recuperação entre zonas:** precisa de tempo de espera (30 min) ou consumir Poção de Cura

### Zonas de caça canônicas (seeds iniciais)

| Zona | NPC | Nível rec. | Drops especiais |
|---|---|---|---|
| Ruínas de Thar-Halum | Guardiões Esquecidos | 1–5 | Fragmento de Lore (5%) |
| Floresta de Eryuell | Espíritos Corrompidos | 3–8 | Essência Natural (15%) |
| Minas de Düren | Golens de Pedra | 5–10 | Minério Etéreo (20%) |
| Bordas de Urgath | Cultistas do Caos | 8–15 | Componente Arcano (10%), Essência (10%) |
| Câmara do Arquétipo | Ecos do Corrompido | 10+ | Materiais raros (15%), Maestria drop (1%) |

### IA dos NPCs — comportamento padrão

```
Se HP < 30%: usa skill de cura se disponível
Se oponente tem buff ativo: usa dispel se disponível
Senão: usa skill de maior dano com Éter suficiente
Senão: Ataque Básico
```

Variantes de comportamento definidas no campo `behavior` dos seeds de NPC.

### Limites de sessão (valores canônicos)

- **Modo Auto:** máximo de 20 kills por sessão
- **Modo Manual:** sem limite de kills
- **Cooldown entre zonas:** 30 minutos ou consumir Poção de Cura
- **HP e Éter:** não restauram entre NPCs na mesma sessão
- **Morte:** perde TODO o loot acumulado da sessão

---

## 17. Sociedades — Limites e Progressão

### Capacidade por nível da Sociedade

| Nível | Membros máximos | Fórmula |
|---|---|---|
| 1 | 10 | base |
| 2 | 15 | base + 5 |
| 3 | 20 | base + 10 |
| 4 | 25 | base + 15 |
| 5 | 30 | base + 20 |

**Fórmula geral:** `max_membros = 10 + (nível - 1) × 5`

### Progressão de nível

Atualmente: exclusivamente via GM (evento narrativo).
Futuramente: via cofre da Sociedade (valor a definir em iteração futura).

---

## 18. Histórico de Revisões

| Versão | Data | Mudanças |
|---|---|---|
| 1.0 | Março 2026 | Criação do documento. Calibração completa dos números base após revisão global do projeto (Fases 1–21). |
| 1.1 | Março 2026 | Adicionado: reputação de facções, enhancement de equipamentos, fragmentos de maestria, XP PvP detalhado, limites de hunting. |

---

## 19. Reputação de Facções — Thresholds

| Estágio | Range de pontos |
|---|---|
| **Hostil** | Menor que 0 |
| **Neutro** | 0 a 99 |
| **Reconhecido** | 100 a 299 |
| **Aliado** | 300 a 699 |
| **Venerado** | 700+ |

**Cap máximo:** -999 a 999.

**Conflito automático:** ao ganhar reputação com uma facção, facções declaradas conflitantes perdem metade do delta (arredondado para baixo).

---

## 20. Enhancement de Equipamentos

### Bônus por nível

Fator de bônus: **+5% por nível** de enhancement acima de 0.

```
stat_final = floor(stat_base × (1 + nivel × 0.05))
```

Exemplo: item com ATQ+5, enhancement +4 → `floor(5 × 1.20) = 6`

### Custo de melhoria por nível

| Nível | Libras | Material adicional |
|---|---|---|
| +1 | 50 | — |
| +2 | 100 | — |
| +3 | 200 | — |
| +4 | 400 | — |
| +5 | 800 | Minério Etéreo (1x) |
| +6 | 1.500 | Minério Etéreo (1x) |
| +7 | 3.000 | Minério Etéreo (1x) |
| +8 | 6.000 | Minério Etéreo (1x) |
| +9 | 12.000 | Componente Arcano (1x) |
| +10 | 25.000 | Componente Arcano (1x) |
| +11 | 50.000 | Componente Arcano (1x) |
| +12 | 100.000 | Componente Arcano (1x) |

**Sem chance de falha** em nenhum nível. Custo sempre em Libras — nunca em Gemas.

---

## 21. Fragmentos de Maestria de Prestígio

Fragmentos são drops raros de dungeons que podem ser trocados por Pergaminhos de Classe de Prestígio.

### Drop por dificuldade de dungeon

| Dificuldade | Chance | Quantidade |
|---|---|---|
| Normal | 0% | — |
| Difícil | 10% | 1 fragmento |
| Lendária | 25% | 2 fragmentos |

Drop aplicado por sobrevivente ao final da dungeon.

### Troca

**10 fragmentos = 1 Pergaminho de Classe de Prestígio**

Troca realizada manualmente pelo jogador via interface. Fragmentos são vinculados ao personagem — intransferíveis.

---

*Fim do GDD_Balanceamento v1.1*
*Documentos relacionados: GDD_Personagem.md | GDD_Sistemas.md | GDD_Mundo.md | GDD_Narrativa.md*
