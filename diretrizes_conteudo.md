# DIRETRIZES DE CRIAÇÃO DE CONTEÚDO — ARKANDIA
> Documento de referência para criação, geração por IA e implementação de todo conteúdo do jogo.
> Versão 1.0 — Março 2026

---

## COMO USAR ESTE DOCUMENTO

Cada seção cobre um tipo de conteúdo e contém:
1. **O que é** — definição canônica
2. **Campos obrigatórios** — o que precisa ser definido para existir no banco
3. **Dependências** — o que precisa existir primeiro
4. **Referenciais quali→quanti** — o que palavras como "forte" e "leve" significam em números
5. **Prompt de IA** — template pronto para geração
6. **Fluxo de implementação** — como ir do conteúdo criado para o banco funcionando

---

## REFERENCIAIS QUALI→QUANTI GLOBAIS

> Use estes referenciais em todos os prompts e ao revisar conteúdo gerado.
> Qualquer valor fora destes ranges deve ser justificado explicitamente.

### Poder de Personagem por Nível

| Descrição | Nível equivalente | ATQ/MAG | DEF | VIT | HP |
|---|---|---|---|---|---|
| Iniciante | 1–3 | 20–26 | 10–12 | 10–12 | 130–140 |
| Aprendiz | 4–6 | 27–38 | 13–16 | 12–14 | 140–150 |
| Competente | 7–9 | 39–50 | 17–21 | 14–16 | 150–160 |
| Veterano | 10–14 | 47–74 | 19–33 | 14–21 | 150–185 |
| Experiente | 15–20 | 75–107 | 34–54 | 21–33 | 185–245 |
| Elite | 20–30 | 108–167 | 55–94 | 33–58 | 245–370 |
| Lendário | 30+ | 167+ | 95+ | 58+ | 370+ |

### Tiers de NPC (Hunting)

| Tier | Nível rec. | ATQ/MAG | HP | DEF | XP drop | Libras drop |
|---|---|---|---|---|---|---|
| Fraco | 1–5 | 12–18 | 80–120 | 5–10 | 15–30 | 5–15 |
| Médio | 3–10 | 25–40 | 150–220 | 15–25 | 40–70 | 20–50 |
| Forte | 8–15 | 45–70 | 280–400 | 30–45 | 80–150 | 60–120 |
| Elite | 12+ | 80–120 | 500–800 | 50–80 | 200–400 | 150–300 |

### Tier de Skill (Dano)

| Tier | Dano esperado (nível 10, ATQ/MAG ~47) | Éter | Cooldown |
|---|---|---|---|
| Leve | 42–45 | 8–12 | 0–1 turno |
| Médio | 70–90 | 18–25 | 1–2 turnos |
| Alto | 108–120 | 35–50 | 2–3 turnos |
| Ultimate | 155–170 | 60–80 | 4–5 turnos |

### Custo em Essências

| Descrição | Range |
|---|---|
| Barato | 30–50 |
| Moderado | 80–150 |
| Caro | 200–300 |
| Muito caro | 400–600 |

### Valor em Libras

| Descrição | Range |
|---|---|
| Barato | 50–200 |
| Moderado | 200–800 |
| Caro | 800–3.000 |
| Premium | 3.000–20.000 |
| Endgame | 20.000–100.000 |

### Chance de Drop

| Descrição | % |
|---|---|
| Garantido | 100% |
| Muito comum | 60–80% |
| Comum | 30–50% |
| Incomum | 10–25% |
| Raro | 3–9% |
| Muito raro | 0.5–2% |
| Ultra raro | < 0.5% |

### Duração de Expedição vs Recompensa

| Duração | Risco | XP base | Libras base |
|---|---|---|---|
| 2h | Seguro | 80–120 | 40–80 |
| 4h | Moderado | 180–260 | 100–200 |
| 8h | Perigoso | 350–500 | 220–400 |
| 12h | Extremo | 600–900 | 450–800 |

---

## SEÇÃO 1 — MATERIAIS E ITENS BÁSICOS

> Base de toda a economia. Criar antes de qualquer outra coisa.

### O que é

Materiais são insumos de crafting. Itens são produtos (equipamentos, consumíveis, pergaminhos).
Tudo que existe no inventário é um item. Todo item tem categoria e raridade.

### Schema real da tabela items (canônico — não inventar colunas)

```sql
-- Colunas que EXISTEM no banco (migrations 013 + 025 + 040):
name            TEXT        — nome canônico único (UNIQUE constraint)
description     TEXT        — descrição em prosa, 1–3 frases, voz do mundo
item_type       TEXT        — 'material' | 'equipamento' | 'consumivel' |
                              'especial' | 'pergaminho' | 'cosmetico'
                              ATENÇÃO: sem acento em 'cosmetico'
rarity          TEXT        — 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario'
                              ATENÇÃO: sem acento em 'epico' e 'lendario'
is_tradeable    BOOLEAN     — pode ser negociado no bazaar?
metadata        JSONB       — campo genérico para dados extras:
                              { max_stack, base_value, uso, efeito, etc. }
                              NÃO existem colunas max_stack nem base_value diretas

-- Apenas para equipamentos (adicionadas em migration 025):
stats           JSONB       — { ataque?, magia?, defesa?, vitalidade?,
                                velocidade?, precisao?, tenacidade? }
slot_type       TEXT        — 'arma_principal' | 'arma_secundaria' | 'elmo' |
                              'armadura' | 'calca' | 'bota' |
                              'acessorio_1' | 'acessorio_2'
required_level  INTEGER     — nível mínimo para equipar (default 1)
required_class  TEXT[]      — array com nomes das classes (null = todas)
                              ATENÇÃO: coluna chama required_class, não allowed_classes
```

### ATENÇÃO — Sem UNIQUE constraint em name

A tabela `items` NÃO tem UNIQUE constraint na coluna `name`.
NUNCA usar `ON CONFLICT (name)` — vai gerar erro em produção.

Padrão correto para todos os seeds de itens:

### Template SQL para materiais (novos)

```sql
INSERT INTO items (name, description, item_type, rarity, is_tradeable, metadata)
SELECT
  'Nome do Material',
  'Descrição em prosa.',
  'material', 'comum', TRUE,
  '{"max_stack": 99, "base_value": 100}'
WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Nome do Material');
```

### Template SQL para equipamentos (novos)

```sql
INSERT INTO items
  (name, description, item_type, rarity, is_tradeable,
   stats, slot_type, required_level, required_class, metadata)
SELECT
  'Nome do Equipamento',
  'Descrição em prosa.',
  'equipamento', 'comum', TRUE,
  '{"ataque": 5}',
  'arma_principal',
  1,
  ARRAY['Espadachim'],
  '{"base_value": 150}'
WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Nome do Equipamento');
```

### Template SQL para atualizar itens existentes

```sql
UPDATE items SET
  description = 'Nova descrição.',
  rarity = 'incomum',
  metadata = '{"max_stack": 99, "base_value": 200}'
WHERE name = 'Nome do Item';
```

### Itens já seedados na migration 013 (existem no banco)

Esses itens JÁ EXISTEM — usar UPDATE para melhorar, nunca INSERT:
- Minério Etéreo (material, comum → atualizado para incomum no seed v3)
- Componente Arcano (material, incomum → atualizado para raro no seed v3)
- Erva de Cura (consumivel, comum)
- Poção de Éter (consumivel, comum)
- Fragmento de Lore (especial, raro)
- Pergaminho de Classe de Prestígio (pergaminho, epico → atualizado no seed v3)
- Essência Natural (material, raro → atualizado no seed v3)
- Equipamento Militar (material, comum)

### Dependências

Nenhuma. Materiais e itens básicos são a base — podem ser criados sem nada existir antes.

### Referenciais quali→quanti para itens

| Raridade | Stats típicos (equip. nível 1–10) | base_value |
|---|---|---|
| Comum | +2 a +5 em 1 atributo | 50–200 |
| Incomum | +5 a +10 em 1–2 atributos | 200–600 |
| Raro | +10 a +20 em 2–3 atributos | 600–2.000 |
| Épico | +20 a +35 em 3–4 atributos | 2.000–8.000 |
| Lendário | +35+ ou skill exclusiva | 8.000+ |

### Prompt de IA — Materiais

```
Você é o designer de conteúdo de Arkandia, RPG com estética épica e mitológica
inspirado em One Piece, Fate Series e mitologias reais.

Crie [N] materiais de crafting para a categoria [CATEGORIA].
Contexto desta categoria: [ex: "materiais obtidos em hunting nas Minas de Düren,
zona de nível 5–10 com temática de pedra e Éter corrompido"].

Para cada material, forneça:
- name: nome único com sotaque do mundo (pode usar raízes latinas, germânicas, etc.)
- description: 1–2 frases em voz do mundo — o que é, de onde vem, por que importa
- item_type: 'material'
- rarity: comum | incomum | raro
  ATENÇÃO: sem acento — 'epico' e 'lendario' (não 'épico'/'lendário')
- is_tradeable: true
- metadata: { "max_stack": 99, "base_value": [valor em Libras] }
  Referência base_value: comum=30–200, incomum=200–600, raro=600–2000

Restrições:
- Sem nomes genéricos como "cristal mágico" ou "pedra encantada"
- Cada item deve ter identidade própria no lore
- Coerente com o tom de [NAÇÃO/ZONA]: [descrição do tom]
- Não usar terminologia de outros jogos (mana, MP, buff genérico)
- Éter é o nome canônico da energia mágica do mundo

Retorne em JSON array.
```

### Prompt de IA — Equipamentos

```
Você é o designer de conteúdo de Arkandia.

Crie [N] equipamentos do tipo [SLOT] para personagens de nível [RANGE],
classe [CLASSE OU 'todas as classes'].

Contexto temático: [ex: "armas de Espadachim com tema de Ogygia — heróis clássicos,
técnicas nomeadas, estética greco-romana"].

Para cada equipamento:
- name: nome próprio com personalidade
- description: 1–2 frases de aparência e origem
- item_type: 'equipamento'
- rarity: comum | incomum | raro | epico | lendario
  ATENÇÃO: sem acento — 'epico' não 'épico', 'lendario' não 'lendário'
- is_tradeable: true
- slot_type: valor exato do banco:
    'arma_principal' | 'elmo' | 'armadura' | 'calca' | 'bota' |
    'acessorio_1' | 'acessorio_2'
- stats: JSONB com atributos e valores:
    { "ataque": N } ou { "magia": N } ou { "defesa": N, "vitalidade": N } etc.
  Referência por raridade e nível:
    comum: +2 a +5 em 1 atributo
    incomum: +5 a +10 em 1–2 atributos
    raro: +10 a +20 em 2–3 atributos
    epico: +20 a +35 em 3–4 atributos
- required_level: INTEGER (nível mínimo para equipar)
- required_class: array de strings com nome exato das classes
  ex: ["Espadachim"] ou ["Mago", "Bardo"] ou null (todas as classes)
  ATENÇÃO: coluna chama required_class, não allowed_classes
- metadata: { "base_value": N } — valor em Libras de referência

Retorne em JSON array.
```

### Fluxo de implementação

1. Gerar conteúdo com o prompt acima
2. Revisar: nomes únicos? stats dentro dos ranges? raridade coerente?
3. Inserir em SQL:
   ```sql
   INSERT INTO items (name, category, rarity, description, max_stack,
     is_tradeable, base_value, slot_type, stats, allowed_classes, min_level, effect)
   VALUES (...) ON CONFLICT (name) DO NOTHING;
   ```
4. Sem migration nova — tabela `items` já existe. Sem gen types necessário.

---

## SEÇÃO 2 — SKILLS

> Segunda prioridade absoluta. Sem skills não há combate funcional.

### O que é

Habilidades de cada classe. Toda classe tem exatamente 8 skills na árvore básica:
2 concedidas na criação (1 ativa + 1 passiva) e 6 adquiríveis com Essência.

### Campos obrigatórios

```
name               TEXT     — nome da skill
class_id           UUID     — FK classes (obrigatório)
skill_type         TEXT     — 'ativa' | 'passiva' | 'reativa'
tree_position      INTEGER  — 1–8 (1 e 2 = iniciais grátis, 3–8 = compráveis)
formula            JSONB    — fórmula de dano/efeito
eter_cost          INTEGER  — custo em Éter (0 para passivas)
cooldown_turns     INTEGER  — turnos de cooldown (0 para passivas)
effect_duration_turns INTEGER — duração do efeito em turnos (null se n/a)
range_state        TEXT     — 'curto' | 'medio' | 'longo' | 'qualquer'
description        TEXT     — descrição em prosa
is_starting_skill  BOOLEAN  — true apenas para positions 1 e 2
```

Estrutura do campo `formula` JSONB:
```json
{
  "base": 15,
  "ataque_factor": 1.2,
  "magia_factor": 0.0,
  "defense_penetration_percent": 0,
  "is_true_damage": false,
  "effect_type": "stun | poison | slow | shield | heal | null",
  "effect_duration": 2,
  "element": "fogo | gelo | raio | arcano | null",
  "tags": ["melee", "aoe", "single_target"]
}
```

### Dependências

- Tabela `classes` populada com as 11 classes
- Tabela `skills` existente (já criada)

### Referenciais quali→quanti para skills

| Posição | Tier | Custo Essência | Papel esperado |
|---|---|---|---|
| 1 (inicial ativa) | Leve | Grátis | Skill de identidade, uso frequente |
| 2 (inicial passiva) | — | Grátis | Passiva que define o estilo da classe |
| 3–4 | Leve a Médio | 30 cada | Expansão do kit básico |
| 5–6 | Médio a Alto | 50 cada | Mecânica mais complexa |
| 7 | Alto | 80 | Skill poderosa com custo e cooldown maiores |
| 8 (última) | Ultimate ou Passiva forte | 120 | A skill mais memorável da classe |

Range State recomendado por classe:
- curto: Lutador, Espadachim, Destruidor, Escudeiro, Assassino
- medio: Lanceiro, Druida, Bardo, Mago
- longo: Arqueiro, Atirador

### Prompt de IA — Skills de uma Classe

```
Você é o designer de habilidades de Arkandia, RPG com combate em turnos.

Crie a árvore básica completa de 8 skills para a classe [CLASSE].

Contexto da classe:
- Arma: [tipo de arma]
- Atributos primários: [ex: ATQ e VEL]
- Range State natural: [curto | medio | longo]
- Identidade narrativa: [ex: "guerreiro de lança de Valoria, disciplinado,
  combina velocidade com penetração de defesa"]
- Arquétipos de Ressonância comuns: [ex: Guerra, Ordem, Vontade]

Estrutura obrigatória das 8 skills:
- Posição 1: ativa de identidade (tier Leve, is_starting_skill: true)
- Posição 2: passiva de identidade (is_starting_skill: true)
- Posições 3–4: expansão do kit (tier Leve a Médio)
- Posições 5–6: mecânica complexa (tier Médio a Alto)
- Posição 7: alto impacto (tier Alto)
- Posição 8: definitiva (tier Ultimate OU passiva fortíssima)

Referenciais de dano (nível 10, ATQ/MAG ~47):
- Tier Leve: dano 42–45, Éter 8–12, cooldown 0–1
- Tier Médio: dano 70–90, Éter 18–25, cooldown 1–2
- Tier Alto: dano 108–120, Éter 35–50, cooldown 2–3
- Tier Ultimate: dano 155–170, Éter 60–80, cooldown 4–5
Fórmula física: base + ATQ × fator. Mágica: base + MAG × fator.
Passivas: sem Éter, sem cooldown, efeito fixo (+5 ATQ, reduz 10% dano, etc.)

Para cada skill:
- name: nome de técnica com identidade (não genérico)
- skill_type, tree_position, formula (JSON), eter_cost, cooldown_turns
- effect_duration_turns, range_state, description (1–2 frases)
- is_starting_skill: true apenas para posições 1 e 2

Restrições:
- Máximo 1 Ultimate por árvore
- Mínimo 2 passivas (posição 2 + ao menos 1 mais)
- Nomes com sotaque do mundo (técnicas nomeadas, não "Golpe Forte I")
- Coerente com o Range State primário
- Éter, nunca Mana

Retorne em JSON array com todas as 8 skills.
```

### Fluxo de implementação

1. Gerar 8 skills por classe (11 classes = 88 skills total)
2. Buscar UUID da classe: `SELECT id FROM classes WHERE name = '[nome]'`
3. Inserir: `INSERT INTO skills (...) VALUES (...) ON CONFLICT DO NOTHING`
4. Verificar: `SELECT COUNT(*) FROM skills WHERE class_id = '[id]'` deve retornar 8

---

## SEÇÃO 3 — MAESTRIAS

> Dependem de skills existirem. Criar após completar todas as árvores de classe.

### O que é

Três categorias: Prestígio (packs de subclasse), Ressonância (skills arquetípicas),
Lendária (skills esgotáveis e exclusivas).

### Campos obrigatórios

```
name          TEXT     — nome próprio com identidade narrativa
category      TEXT     — 'prestígio' | 'ressonância' | 'lendária'
flavor        TEXT     — 'bestial' | 'mítica' | 'singular' (apenas Lendárias)
description   TEXT     — 2–3 frases — o que esta maestria representa
restrictions  JSONB    — { class_id?, class_ids?, resonance_type?, min_level?, min_resonance_level? }
cost          JSONB    — { essencia?: N, gema?: N, requires_item?: 'nome do item' }
skill_ids     UUID[]   — array de FK para skills concedidas
is_exhaustible BOOLEAN — true apenas para Lendárias
is_active     BOOLEAN  — true
```

### Dependências

- Skills da árvore básica criadas (Seção 2)
- Archetypes populados na tabela `archetypes`
- Para Prestígio: item "Pergaminho [nome]" criado (Seção 1) antes de inserir

### Referenciais quali→quanti

| Categoria | Custo Essência | Custo Gema | Skills | Tier de poder |
|---|---|---|---|---|
| Prestígio simples | 150 | — | 1 skill | Médio a Alto |
| Prestígio padrão | 200 | — | 2 skills | Alto |
| Prestígio completo | 300 | — | 3 skills | Alto a Ultimate |
| Ressonância nível 1–2 | 200 | — | 1 skill | Médio |
| Ressonância nível 3–5 | 350–450 | — | 1–2 skills | Alto |
| Ressonância nível 6+ | 500–600 | — | 1–2 skills | Alto a Ultimate |
| Lendária simples | — | 500 | 1 skill | Ultimate |
| Lendária média | — | 800 | 2 skills | Ultimate |
| Lendária completa | — | 1.200 | 3 skills | Ultimate+ |

### Prompt de IA — Maestria de Prestígio

```
Você é o designer de conteúdo de Arkandia.

Crie uma Maestria de Classe de Prestígio para [CLASSE].
Nome temático proposto: [ex: "Cavaleiro da Concordia" — Espadachim de Valoria]
Número de skills: [1 | 2 | 3]

Contexto temático:
- Nação/cultura de origem: [ex: Valoria — imperial, disciplinado, ataque+defesa]
- Identidade narrativa: [ex: "cavaleiro que usa a lâmina como extensão do código moral"]
- Arquétipos dominantes: [ex: Ordem, Vontade, Guerra]

Para a maestria:
- name: nome próprio com sotaque da nação
- description: 2–3 frases — o que este caminho representa
- cost: { essencia: [150|200|300], requires_item: "Pergaminho [nome]" }
- restrictions: { class_id: "[UUID]", min_level: [10|15|20] }

Para cada skill da maestria (sem class_id):
- Tier de poder coerente: 1 skill = Médio a Alto, 2 = Alto, 3 = Alto a Ultimate
- Não duplicar efeitos da árvore básica da classe

Referenciais de dano (nível 10, ATQ ~47):
- Médio: dano 70–90, Éter 18–25, cooldown 1–2
- Alto: dano 108–120, Éter 35–50, cooldown 2–3
- Ultimate: dano 155–170, Éter 60–80, cooldown 4–5

Retorne: objeto maestria + array de skills em JSON.
```

### Prompt de IA — Maestria de Ressonância

```
Você é o designer de conteúdo de Arkandia.

Crie [N] Maestrias de Ressonância para o Arquétipo [ARQUÉTIPO].

Contexto do Arquétipo:
[Cole aqui a descrição do Arquétipo do GDD_Mundo §3]
Tendência mecânica: [ex: Ruína = quebra, corrosão, anulação, penetração]

Distribuição por nível de Ressonância:
- 2 maestrias para nível 1–2 (acessíveis cedo)
- 2 maestrias para nível 3–4 (intermediárias)
- 1 maestria para nível 5+ (poderosa)

Para cada maestria:
- name: nome arquetípico, evocativo ("Toque do Fim", não "Habilidade de Fim")
- description: 2 frases — o que representa espiritualmente + o que faz
- cost: { essencia: [200 | 350 | 500] }
- restrictions: { resonance_type: "[ARQUÉTIPO]", min_resonance_level: [1|3|5] }
- 1 skill por maestria (raramente 2 para as de nível alto)
- Tier coerente com nível: 1–2 = Médio, 3–4 = Alto, 5+ = Alto a Ultimate
- Sem class_id — válida para qualquer classe com aquele Arquétipo

Retorne em JSON array.
```

### Prompt de IA — Maestria Lendária

```
Você é o designer de conteúdo de Arkandia.

Crie uma Maestria Lendária do tipo [bestial | mítica | singular].

Flavor:
- Bestial: incorpora criaturas de Ellia (inspiração Zoan/One Piece)
- Mítica: manifesta herói/deus do lore (inspiração Nobres Fantasmas/Fate)
- Singular: fenômeno etéreo único, técnica extinta, evento histórico

Tema: [ex: "Eco de Liesel Heckmann — fundadora de Vermécia, dragões, Vontade"]
Número de skills: [1 | 2 | 3]

Para a maestria:
- name: nome próprio narrativamente carregado
- description: 3–4 frases — origem lendária + o que significa ter isso
- cost: { gema: [500 | 800 | 1200] }
- is_exhaustible: true (SEMPRE)
- Todas as skills tier Ultimate com mecânica única no jogo
- Sem class_id, sem resonance_type obrigatório

Retorne: objeto maestria + array de skills em JSON.
```

### Fluxo de implementação

1. Criar skills da maestria (class_id: null)
2. Inserir skills e capturar UUIDs
3. Para Prestígio: criar Pergaminho como item antes de inserir a maestria
4. Inserir maestria com skill_ids preenchidos
5. Para Lendária: inserir também em `seasonal_legendaries` com o season_id ativo

---

## SEÇÃO 4 — EQUIPAMENTOS ESPECIAIS (ARMAS COM SKILL)

> Armas que concedem 1 skill ativa exclusiva enquanto equipadas.

### O que é

Armas craftadas com nome próprio. A skill NÃO é aprendida permanentemente —
existe apenas enquanto a arma está equipada.

### Campos adicionais

```
skill_id      UUID     — FK skills (a skill exclusiva concedida pela arma)
```

### Prompt de IA — Arma Especial

```
Você é o designer de conteúdo de Arkandia.

Crie uma arma especial para [CLASSE] com tema [TEMA].
Inspiração: [ex: "Tyrfing — espada maldita nórdica, Norrheim, Arquétipo da Guerra"]

Para a arma:
- name: nome próprio histórico ou mitológico
- description: 2–3 frases sobre origem, aparência e o que a torna única
- rarity: épico ou lendário
- slot_type: arma
- stats: { [atributo primário]: [+20 a +35 épico / +35+ lendário] }
- min_level: [15–25 épico, 20+ lendário]
- base_value: [8.000+ épico, 20.000+ lendário]
- allowed_classes: [classe específica]

Para a skill exclusiva (1 skill ativa, tier Alto ou Ultimate):
- name: evoca a arma ou a lenda
- Mecânica única que referencia a origem mítica
- description: 2–3 frases cinematográficas
- is_equipment_skill: true (campo especial)

Retorne: objeto arma + objeto skill em JSON.
```

### Fluxo de implementação

1. Criar skill da arma primeiro (class_id: null)
2. Capturar UUID da skill
3. Criar o item arma com skill_id apontando para a skill
4. Criar receita de crafting (Seção 5)

---

## SEÇÃO 5 — RECEITAS DE CRAFTING

> Dependem de itens (materiais E produto) já existirem.

### Campos obrigatórios

```
result_item_id    UUID     — FK items (produto)
result_quantity   INTEGER  — quantidade produzida (normalmente 1)
ingredients       JSONB    — [{ item_id: UUID, quantity: N }, ...]
crafting_cost     INTEGER  — custo em Libras
min_level         INTEGER  — nível mínimo do personagem
```

### Dependências

- Item resultado criado (Seção 1 ou 4)
- Todos os itens ingredientes criados (Seção 1)

### Referenciais quali→quanti para crafting

| Raridade do produto | Custo em Libras | Ingredientes | Complexidade |
|---|---|---|---|
| Comum | 50–200 | 2–3 materiais comuns | Simples |
| Incomum | 200–500 | 3–4 (incomum incluso) | Moderada |
| Raro | 500–1.500 | 4–5 (raro incluso) | Alta |
| Épico | 1.500–5.000 | 5–6 (épico incluso) | Muito alta |
| Lendário | 5.000+ | 6+ raros/épicos | Extrema |

### Prompt de IA — Receitas

```
Você é o designer de economia de Arkandia.

Crie receitas de crafting para os seguintes equipamentos:
[liste os itens que precisam de receita]

Materiais disponíveis no banco:
[liste os materiais já criados com nomes]

Para cada receita:
- result_item: [nome]
- ingredients: lista de { material, quantity } usando apenas materiais da lista
- crafting_cost: custo em Libras
  Referência: comum=50–200, incomum=200–500, raro=500–1500, épico=1500–5000
- min_level: nível mínimo recomendado

Princípios:
- Ingredientes mais raros = produto mais poderoso
- Materiais da mesma zona temática para o mesmo produto
- Sem dependência circular

Retorne em JSON array.
```

### Fluxo de implementação

1. Buscar UUIDs: `SELECT id, name FROM items WHERE name IN (...)`
2. Inserir em `crafting_recipes` com ingredient UUIDs resolvidos
3. Verificar com SELECT + JOIN antes de testar na UI

---

## SEÇÃO 6 — NPCs DE HUNTING

> Dependem de hunting zones e itens de drop existirem.

### Campos obrigatórios

```
zone_id          UUID     — FK hunting_zones
name             TEXT     — nome da criatura
tier             TEXT     — 'fraco' | 'medio' | 'forte' | 'elite'
level            INTEGER
base_hp          INTEGER
base_ataque      INTEGER
base_magia       INTEGER
base_defesa      INTEGER
base_velocidade  INTEGER
base_eter        INTEGER
skills           JSONB    — array de skills do NPC
loot_table       JSONB    — array de drops
behavior         TEXT     — 'balanced' | 'aggressive' | 'defensive' | 'support'
xp_reward        INTEGER
narrative_text   TEXT     — 1 linha de lore
```

Estrutura de `skills` JSONB:
```json
[
  { "name": "Nome da Skill", "base": 10, "ataque_factor": 0.8, "eter_cost": 15, "cooldown": 1 },
  { "name": "Habilidade Defensiva", "type": "buff", "effect": "escudo_etereo", "stacks": 2, "eter_cost": 20, "cooldown": 3 }
]
```

Estrutura de `loot_table` JSONB:
```json
[
  { "type": "libras", "min": 10, "max": 30, "chance": 1.0 },
  { "type": "xp", "amount": 45, "chance": 1.0 },
  { "type": "item", "item_name": "Minério Etéreo", "chance": 0.2 },
  { "type": "essencia", "amount": 3, "chance": 0.15 }
]
```

### Dependências

- Hunting zone existente
- Itens de drop já criados (Seção 1)

### Referenciais quali→quanti — mesmos da tabela global de tiers

Drops por raridade de item:
- Comum: 30–50% de chance
- Incomum: 10–20%
- Raro: 3–8%
- Muito raro: 0.5–2%

### Prompt de IA — NPCs de Hunting

```
Você é o designer de criaturas de Arkandia.

Crie [N] NPCs para a zona de hunting [NOME DA ZONA].

Contexto da zona:
- Localização: [nação/região]
- Nível recomendado: [range]
- Tema: [ex: "Minas de Düren — pedra, aço anti-étéreo, golens, tom sombrio"]
- Risco: [baixo | médio | alto | extremo]

Distribuição de tiers: [N fraco, N médio, N forte, N elite]

Para cada NPC:
- name: nome com identidade no lore (não "Monstro Nível 5")
- tier, level, atributos dentro dos referenciais:
  Fraco: ATQ 12–18, HP 80–120, DEF 5–10, Éter 30–50
  Médio: ATQ 25–40, HP 150–220, DEF 15–25, Éter 50–80
  Forte: ATQ 45–70, HP 280–400, DEF 30–45, Éter 80–120
  Elite: ATQ 80–120, HP 500–800, DEF 50–80, Éter 120–200
- skills: 1–3 skills com fórmulas JSON
- loot_table: drops temáticos (libras e xp sempre, itens com chances por raridade)
- behavior: balanced | aggressive | defensive | support
- narrative_text: 1 frase de lore

Drops disponíveis para esta zona: [liste os itens já criados]

Retorne em JSON array.
```

---

## SEÇÃO 7 — ZONAS DE HUNTING

> Independente. Criar antes dos NPCs.

### Campos obrigatórios

```
name             TEXT
description      TEXT
location         TEXT     — nação/região no mundo
min_level        INTEGER
max_level        INTEGER  — null = sem cap
risk_level       TEXT     — 'baixo' | 'medio' | 'alto' | 'extremo'
cooldown_minutes INTEGER  — padrão: 30
is_active        BOOLEAN
```

### Referenciais quanti para zonas

| Risk | Min Level | Max Level | Tipos de NPC dominantes |
|---|---|---|---|
| Baixo | 1 | 5 | Fraco + Médio |
| Médio | 3 | 10 | Médio + Forte |
| Alto | 8 | 20 | Forte + Elite |
| Extremo | 15 | null | Elite |

### Prompt de IA — Zonas

```
Você é o designer de mundo de Arkandia.

Crie [N] zonas de hunting para [REGIÃO/NAÇÃO].
Contexto da região: [cole a descrição da nação do GDD_Mundo §5]

Zonas já existentes (não duplicar): [liste as zonas atuais]

Para cada zona:
- name: nome geográfico com identidade
- description: 2–3 frases — ambiente e por que é perigoso
- location: nação ou sub-região
- min_level / max_level: baseado no risk_level
- risk_level: baixo | médio | alto | extremo
- cooldown_minutes: 30

Coerência: criaturas previstas devem fazer sentido geográfico e histórico.

Retorne em JSON array.
```

---

## SEÇÃO 8 — DUNGEONS

> Dependem de NPCs criados (Seção 6).

### Campos obrigatórios (dungeon_types)

```
name             TEXT
description      TEXT
min_level        INTEGER
max_players      INTEGER  — 2–4
difficulty       TEXT     — 'normal' | 'dificil' | 'lendaria'
phases           JSONB    — configuração das 3 fases
rewards          JSONB
theme            TEXT
```

Estrutura de `phases`:
```json
[
  { "phase": 1, "npc_type_ids": ["uuid1"], "npc_count": 2, "is_boss": false },
  { "phase": 2, "npc_type_ids": ["uuid2"], "npc_count": 3, "is_boss": false },
  { "phase": 3, "npc_type_ids": ["uuid3"], "npc_count": 1, "is_boss": true, "boss_hp_multiplier": 2.0 }
]
```

### Referenciais quanti

| Dificuldade | Min Level | XP base | Libras | Essência | Frag. Maestria |
|---|---|---|---|---|---|
| Normal | 5 | 200 | 80 | 25 | 0% |
| Difícil | 10 | 450 | 150 | 60 | 10% (1 frag.) |
| Lendária | 15 | 900 | 300 | 150 | 25% (2 frags.) |

Boss da fase 3 — multiplicador de HP: Normal ×2.0, Difícil ×2.5, Lendária ×3.0

### Prompt de IA — Dungeon

```
Você é o designer de masmorras de Arkandia.

Crie uma dungeon temática: [TEMA/LOCALIZAÇÃO].
Contexto: [descrição do lugar e por que é relevante no lore]

Crie nas 3 dificuldades (normal, dificil, lendaria) com tiers progressivos:
- Normal: NPCs tier fraco a médio, boss médio
- Difícil: NPCs tier médio a forte, boss forte
- Lendária: NPCs tier forte a elite, boss elite

Para a dungeon (comum às 3 dificuldades):
- name, description (3–4 frases), theme

Para cada dificuldade:
- min_level: [5 normal, 10 difícil, 15 lendária]
- max_players: 4
- phases: 3 fases com NPCs dos tiers adequados
- Boss fase 3: nome próprio, HP multiplier, 1 mecânica especial
- rewards: XP, Libras, Essência conforme tabela acima

NPCs disponíveis relevantes: [liste por nome e tier]

Retorne em JSON com os 3 objetos de dificuldade.
```

---

## SEÇÃO 9 — EXPEDIÇÕES

> Parcialmente independentes. Referenciam itens em loot_table.

### Campos obrigatórios

```
name                  TEXT
subtype               TEXT     — 'exploracao' | 'caca' | 'investigacao' | 'missao_faccao'
risk_level            TEXT     — 'seguro' | 'moderado' | 'perigoso' | 'extremo'
duration_hours        INTEGER  — 1–12
description           TEXT
loot_table            JSONB
success_formula       JSONB    — usar valores calibrados (ver abaixo)
required_faction_slug TEXT     — null salvo missao_faccao
is_active             BOOLEAN
```

### Referenciais — success_formula calibrada (não alterar pesos)

| Risk | base_chance | Fórmula completa |
|---|---|---|
| Seguro | 75% | ATQ×0.10, MAG×0.10, VEL×0.05 |
| Moderado | 55% | ATQ×0.15, MAG×0.15, VEL×0.10 |
| Perigoso | 35% | ATQ×0.20, MAG×0.20, VEL×0.15, PRE×0.10 |
| Extremo | 15% | ATQ×0.25, MAG×0.25, VEL×0.20, PRE×0.15, VIT×0.10 |

### Prompt de IA — Expedições

```
Você é o designer de expedições de Arkandia.

Crie [N] expedições do subtipo [SUBTIPO] para [NAÇÃO/REGIÃO].
Contexto: [descrição da nação do GDD_Mundo §5]

Distribuição de risco: [ex: 2 seguro, 2 moderado, 1 perigoso]

Para cada expedição:
- name: título narrativo (não "Expedição Moderada II")
- description: 2–3 frases — o que o personagem faz e onde
- subtype, risk_level, duration_hours: [2 seguro, 4 moderado, 6–8 perigoso, 10–12 extremo]
- loot_table com valores calibrados:
  Seguro: XP 80–120, Libras 40–80, material_chance 0.10, rare_chance 0.02
  Moderado: XP 180–260, Libras 100–200, material_chance 0.25, rare_chance 0.05
  Perigoso: XP 350–500, Libras 220–400, material_chance 0.40, rare_chance 0.10
  Extremo: XP 600–900, Libras 450–800, material_chance 0.60, rare_chance 0.20
- success_formula: usar os valores base calibrados acima (não inventar pesos)

Retorne em JSON array.
```

---

## SEÇÃO 10 — CAMPANHA INICIAL (Textos e Choices)

> Preenche narrative_text e choices nos 10 capítulos já existentes.

### Campos a preencher

```
narrative_text   TEXT   — 2–5 parágrafos da cena
choices          JSONB  — [{ label, description, faction_slug, reputation_delta, title_name? }]
```

### Referenciais quanti para choices

| Impacto da escolha | reputation_delta |
|---|---|
| Leve | ±5 a ±15 |
| Moderado | ±15 a ±25 |
| Forte | ±25 a ±40 |
| Decisivo | ±40 a ±60 |

### Prompt de IA — Texto de Capítulo

```
Você é o escritor narrativo de Arkandia.

Escreva o Capítulo [N] da Campanha Inicial: "[TÍTULO]".

Contexto:
- O que acontece: [placeholder atual]
- Local: [onde se passa]
- Personagens presentes: [NPCs]
- Cap. anterior: [resumo]
- Cap. próximo: [gancho]

Especificações do texto:
- 2–4 parágrafos. Narrador em terceira pessoa próxima.
- Tom: natural, direto. O mundo é épico — o texto não precisa lembrar isso a cada frase.
  Referência: One Piece (grandiosidade com humanidade), Fate (peso histórico).
  Não Tolkien (sem descrições longas de paisagem).
- Se há combate: terminar com gancho de tensão antes do confronto
- Se há choice: os dois/três caminhos devem parecer naturais na cena

Choices (após o texto):
Crie [2 ou 3] choices:
- label: 3–6 palavras (ação concreta)
- description: 1 frase do que o personagem faz
- faction_slug: [slug ou null]
- reputation_delta: [±5 a ±60 conforme impacto]
- title_name: [nome de título ou null]

Facções disponíveis: [liste slugs e nomes]

Retorne: { narrative_text: "...", choices: [...] }
```

---

## SEÇÃO 11 — CAMPANHA LONGA (Textos de Fases)

> Preenche narrative_text e npc_challenge_phrase nas 60 fases existentes.

### Campos a preencher

```
narrative_text         TEXT   — 1–2 parágrafos antes do combate
npc_challenge_phrase   TEXT   — 1 frase do NPC antes do combate
```

### Prompt de IA — Batch de Textos de Fases

```
Você é o escritor narrativo de Arkandia.

Escreva textos para as fases do Capítulo [N] — "[NOME]"
Nação: [NAÇÃO] | Tom: [ex: Düren = austero, sem ornamento, pureza como convicção]

Fases a preencher: [liste as fases com títulos]

Para cada fase:
- narrative_text: 1–2 parágrafos. A cena que antecede o combate.
  Tom: tático, seco. Cada fase é um encontro, não uma novela.
  A progressão do capítulo deve ser sentida: abertura → escalada → confronto.
- npc_challenge_phrase: 1 frase do NPC antes do combate.
  Se é NPC recorrente (mesmo npc_key): a frase deve referenciar encontros anteriores.

NPCs recorrentes e seu arco: [npc_key + o que acontece com ele ao longo das fases]

Retorne em JSON array: [{ stage_number, narrative_text, npc_challenge_phrase }]
```

---

## SEÇÃO 12 — FRAGMENTOS DE LORE

> Dependem das fases da campanha longa existirem.

### Campos a preencher (lore_fragment_catalog)

```
fragment_key    TEXT   — chave única (ex: 'valoria_1_3')
title           TEXT   — título do fragmento (nome de documento/artefato)
content         TEXT   — texto (100–250 palavras)
nation          TEXT
```

### Prompt de IA — Fragmentos de Lore

```
Você é o lorekeeper de Arkandia.

Escreva fragmentos de lore para [NAÇÃO].
Contexto: [cole GDD_Mundo §5 desta nação]

Fragmentos a escrever: [liste fragment_keys, títulos e contexto de onde são encontrados]

Para cada fragmento:
- title: nome de documento real do mundo (trecho de diário, decreto, carta, inscrição)
- content: 100–250 palavras, como se fosse um documento real
  — nunca metanarração ("este fragmento revela que...")
  — deve conter 1 detalhe novo sobre o lore não óbvio no GDD
  — deixar perguntas abertas — instigar, não explicar completamente
  — tom coerente com a nação

Restrições:
- Não contradizer o GDD_Mundo canônico
- Não revelar segredos que só o GM deve saber

Retorne em JSON array: [{ fragment_key, title, content }]
```

---

## SEÇÃO 13 — TEXTOS NARRATIVOS GERAIS

### Prompt de IA — Textos de Facção por Estágio de Reputação

```
Você é o escritor narrativo de Arkandia.

Escreva os textos de apresentação da facção [NOME].
Slug: [slug] | Contexto: [cole GDD_Mundo §8]

Para os 4 estágios de reputação:
- Neutro (0–99): como a facção percebe um forasteiro
- Reconhecido (100–299): primeiro reconhecimento, abertura cautelosa
- Aliado (300–699): confiança estabelecida, acesso interno
- Venerado (700+): membro de fato, responsabilidades e benefícios

Por estágio:
- title: título que o personagem recebe ("Aprendiz da Chama")
- description: 2–3 frases na voz da facção (comunicado interno)
- flavor_text: 1 frase de um membro dirigida ao personagem

Tom da facção: [descrever]

Retorne em JSON com os 4 estágios.
```

---

## ORDEM DE CRIAÇÃO RECOMENDADA

```
ETAPA 1 — Base (sem dependências)
  1. Materiais básicos (comuns e incomuns por zona)
  2. Zonas de hunting (estrutura, sem NPCs ainda)
  3. Skills de todas as 11 classes (88 skills)

ETAPA 2 — Dependem da Etapa 1
  4. NPCs de hunting por zona (usam materiais como drops)
  5. Equipamentos comuns e incomuns
  6. Receitas de crafting básicas

ETAPA 3 — Dependem da Etapa 2
  7. Maestrias de Prestígio (precisam de skills de classe + Pergaminhos)
  8. Maestrias de Ressonância (12 arquétipos × 5 maestrias cada)
  9. Dungeons (usam NPCs como inimigos)

ETAPA 4 — Conteúdo narrativo
  10. Textos dos 10 capítulos da Campanha Inicial
  11. Textos das 60 fases da Campanha Longa
  12. Fragmentos de Lore
  13. Textos de facção por estágio de reputação

ETAPA 5 — Endgame e premium
  14. Materiais raros e épicos
  15. Armas especiais com skill exclusiva
  16. Receitas avançadas
  17. Maestrias Lendárias (1–2 por temporada)
```

---

## FLUXO DE IMPLEMENTAÇÃO UNIVERSAL

```
1. GERAR
   Usar o prompt da seção correspondente.
   Passar todo o contexto: tom da nação, ranges numéricos, restrições.

2. REVISAR
   [ ] Nomes únicos? (sem repetição com existente)
   [ ] Valores dentro dos referenciais quanti desta seção?
   [ ] Dependências satisfeitas?
   [ ] Linguagem canônica? (Éter não mana, Libra não gold)
   [ ] Tom coerente com nação/contexto?

3. BUSCAR UUIDs
   SELECT id, name FROM [tabela] WHERE name IN ('...', '...');

4. INSERIR
   Tabela items NÃO tem UNIQUE constraint em name — NUNCA usar ON CONFLICT (name).
   Padrão obrigatório para novos itens:
     INSERT INTO items (...) SELECT ... WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = '...')
   Para itens existentes que precisam ser atualizados:
     UPDATE items SET ... WHERE name = '...'

5. VERIFICAR
   SELECT com JOIN para confirmar relações corretas.

6. NÃO RODAR GEN TYPES
   Conteúdo não altera schema — gen types só após migrations de estrutura.

7. SALVAR SEEDS
   Salvar SQLs em supabase/seeds/[nome_descritivo].sql
   (seeds são conteúdo, não migrations — pastas separadas)
```

---

## DIRETRIZES DE QUALIDADE E CONSISTÊNCIA

### Linguagem canônica

| Correto | Nunca usar |
|---|---|
| Éter | Mana, MP, energia mágica |
| Libra | Gold, moeda, GP |
| Essência | XP de skill, ponto de habilidade |
| Gema | Cristal, moeda premium genérica |
| Building | Loadout, deck, configuração |
| Ressonância | Afinidade mágica, elemento, classe mágica |
| Maestria | Talent, poder especial, habilidade suprema |
| Arquétipo | Deus, entidade, elemento |
| Sociedade | Guilda, clã, grupo |

### Tom narrativo por nação

| Nação | Tom | Evitar |
|---|---|---|
| Vallaeon/Valoria | Diplomático, plural, mediterrâneo | Escolher lado explicitamente |
| Düren | Austero, direto, sem ornamento, fervoroso | Ironia, metáforas poéticas |
| Eryuell | Silencioso, etéreo, temporal, onírico | Urgência, vocabulário industrial |
| Norrheim | Robusto, honroso, épico-nórdico | Formalidade excessiva |
| Ryugakure | Honrado, técnico, ritualístico | Melodrama |
| Ogygia | Glorioso, retórico, teatral | Humildade |
| Vermécia | Ardente, competitivo, visceral | Passividade |
| Urgath | Caótico, fervoroso, imprevisível | Ordem e simetria |

### Regras de nomenclatura

- Materiais comuns: nomes descritivos com sotaque (não "cristal azul")
- Itens raros+: nomes próprios com peso histórico
- Skills: técnicas nomeadas, não descritivas ("Golpe da Lâmina Partida", não "Ataque Forte")
- NPCs tier médio+: nome + epíteto ("Guardião Esquecido", "Sentinela Antiga")
- Maestrias Prestígio: nome de subclasse ("Cavaleiro da Concordia", não "Pack Valoria")
- Maestrias Lendárias: nome próprio cinematográfico ("Eco de Liesel Heckmann")

### Consistência numérica

Antes de finalizar qualquer conteúdo com números:
1. Verificar se está no range do GDD_Balanceamento correspondente
2. Se fora: justificar no comentário do SQL
3. Caps absolutos que nunca podem ser ultrapassados:
   - Esquiva: máximo 40%
   - Chance de efeito: máximo 95%
   - Dano skill ativa: máximo ~170 (nível 10, Ultimate)
   - Estes caps só podem ser superados por Maestrias Lendárias
     mediante discussão com o GM
