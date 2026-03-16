# GDD_Sistemas — Arkandia: Mecânicas e Sistemas
> Versão 1.0 — Março 2026
> Documento de referência canônico para todos os sistemas mecânicos de Arkandia.
> Combate, guerra, expedições, economia, progressão diária e engajamento.
> Todo conteúdo técnico em /lib/game e toda migração SQL devem ser consistentes com este documento.
> Valores numéricos de balanceamento pertencem aos seeds SQL — este documento descreve regras e estruturas.

---

## ÍNDICE

1. [Sistema de Combate](#1-sistema-de-combate)
2. [Sistema de Guerra de Territórios](#2-sistema-de-guerra-de-territórios)
3. [Sistema de Expedições](#3-sistema-de-expedições)
4. [Sistema de Economia](#4-sistema-de-economia)
5. [Progressão Diária](#5-progressão-diária)
6. [Engajamento e Retenção](#6-engajamento-e-retenção)
7. [Diretrizes de Implementação](#7-diretrizes-de-implementação)

---

## 1. Sistema de Combate

### Filosofia

O combate de Arkandia é um sistema de turnos assíncrono com elementos de posicionamento e gestão de recursos. Não existe grid espacial — o campo de batalha é representado por **Range States** que determinam quais skills estão disponíveis e com qual eficácia.

Todo mundo já é mágico. Não existe distinção entre "ataque físico" e "ataque mágico" como categorias exclusivas — as skills de cada personagem usam Ataque, Magia ou ambos como variáveis de fórmula, dependendo do design da skill. A Defesa é a única mitigação de dano, e ela mitiga tudo.

---

### 1.1 Range States

O campo de batalha tem três estados de distância entre os combatentes:

| Range State | Descrição | Quem se beneficia naturalmente |
|---|---|---|
| **Curto** | Corpo a corpo — dentro do alcance da arma melee | Lutador, Espadachim, Destruidor, Escudeiro, Druida |
| **Médio** | Alcance intermediário — lanças, instrumentos, magias de área | Lanceiro, Bardo, Mago |
| **Longo** | Distância máxima — projéteis, magias de longo alcance | Arqueiro, Atirador, Mago (algumas skills) |

**Regras de Range State:**
- O Range State inicial é definido pela Classe do personagem que **inicia** o combate
- Mudar de Range State é uma **ação que consome o turno inteiro** — o personagem não ataca nesse turno
- Skills têm Range State de eficácia máxima definido em seu design — usá-las fora do Range ideal pode reduzir eficácia ou impossibilitar o uso (definido por skill)
- Algumas skills ignoram Range State completamente (definido no design da skill)

---

### 1.2 Estrutura de um Turno

Cada turno, o jogador escolhe **uma ação**:

| Ação | Descrição |
|---|---|
| **Usar Skill Ativa** | Executa uma das skills ativas equipadas na Building. Consome Éter e inicia cooldown |
| **Ataque Básico** | Ataque sem custo de Éter, sem cooldown. Dano menor. Baseado em Ataque |
| **Mudar Range State** | Move para Curto, Médio ou Longo. Não ataca neste turno |
| **Usar Item** | Usa um item consumível (poção, etc.) |
| **Tentar Fuga** | Roll de dados baseado em Velocidade vs Velocidade do oponente. Sucesso encerra o combate |
| **Render-se** | Encerra o combate imediatamente. O rendido sofre consequências definidas pelo contexto (PvP ranqueado tem penalidade, duelo casual não) |

---

### 1.3 Ordem de Turno

A iniciativa é determinada pelo atributo **Velocidade**:
- Personagem com maior Velocidade age primeiro
- Em caso de empate: roll de dados
- A ordem de turno é fixada no início do combate e não muda durante ele (exceto por skills que alteram iniciativa)

---

### 1.4 Fórmula de Dano

```
Dano Final = max(1, Dano Bruto - Defesa Efetiva)

Dano Bruto = Base + (Ataque × Fator_Ataque) + (Magia × Fator_Magia)

Defesa Efetiva = Defesa × (1 - Penetração_Defesa)
```

**Componentes:**
- **Base**: valor fixo da skill (definido em seed SQL)
- **Fator_Ataque / Fator_Magia**: multiplicadores da skill (definidos em seed SQL por skill)
- **Penetração de Defesa**: percentual que ignora parte da Defesa (concedido por certas skills e pela Ressonância de Ruína)
- **True Damage**: dano que ignora Defesa completamente (definido por skill — raro por design)
- **Dano mínimo garantido**: sempre 1, independente da Defesa

**Skills híbridas** usam ambos os fatores simultaneamente — permitem builds que investem em Ataque e Magia ao mesmo tempo.

---

### 1.5 Efeitos de Status

A lista de efeitos é aberta por design de skill — novas skills podem introduzir novos efeitos. A lista abaixo é a base canônica de referência, inspirada em sistemas robustos como League of Legends e Summoners War:

#### Efeitos de Controle (impedem ou limitam ações)

| Efeito | Descrição |
|---|---|
| **Stun** | Perde o turno completamente |
| **Silêncio** | Não pode usar Skills Ativas — apenas Ataque Básico ou Fuga |
| **Raiz** | Não pode mudar Range State |
| **Provocação** | Obrigado a usar Ataque Básico contra o provocador |
| **Medo** | Age aleatoriamente (Ataque Básico em alvo aleatório ou Fuga) |
| **Sono** | Perde o turno. Quebrado ao receber dano |
| **Confusão** | Skill usada tem alvo aleatório (pode acertar a si mesmo) |

#### Efeitos de Dano Contínuo

| Efeito | Descrição |
|---|---|
| **Veneno** | Dano fixo por turno. Ignora Defesa. Acumulável em stacks |
| **Queimadura** | Dano por turno baseado em % do HP máximo |
| **Sangramento** | Dano por turno aumentado por movimento (mudar Range State aumenta o dano) |
| **Corrosão Etérica** | Reduz Éter máximo temporariamente a cada turno |

#### Efeitos de Debuff (reduzem atributos)

| Efeito | Descrição |
|---|---|
| **Fraqueza** | Reduz Ataque |
| **Quebra de Defesa** | Reduz Defesa |
| **Exaustão** | Reduz Velocidade |
| **Névoa Mental** | Reduz Magia |
| **Tremor** | Reduz Precisão |
| **Fragilidade** | Reduz Tenacidade |

#### Efeitos de Buff (beneficiam o portador)

| Efeito | Descrição |
|---|---|
| **Escudo Etéreo** | Absorve quantidade fixa de dano antes do HP ser afetado |
| **Regeneração** | Recupera HP por turno |
| **Recarga** | Recupera Éter por turno |
| **Fúria** | Aumenta Ataque temporariamente |
| **Égide** | Aumenta Defesa temporariamente |
| **Aceleração** | Aumenta Velocidade temporariamente |
| **Imunidade** | Imune a um tipo específico de efeito por X turnos |
| **Invulnerabilidade** | Imune a todo dano por 1 turno (raro — só em Maestrias específicas) |

**Regras gerais de efeitos:**
- Duração medida em turnos (definida por skill)
- Resistência a efeitos: roll de Precisão do atacante vs Tenacidade do alvo
- Efeitos do mesmo tipo geralmente não se acumulam (o de maior duração prevalece), exceto onde explicitamente definido como acumulável (ex: stacks de Veneno)

---

### 1.6 Esquiva

A Velocidade confere chance passiva de Esquiva:
- Esquiva anula o dano completamente
- Não funciona contra True Damage
- Fórmula de chance: definida em `/lib/game/combat.ts` — baseada na diferença de Velocidade entre os combatentes

---

### 1.7 Regeneração de Éter

- Éter **não** regenera durante o combate por padrão
- Regenera completamente entre combates
- Skills e passivas podem conceder regeneração de Éter durante o combate (definido por skill)
- Ataque Básico pode ter passiva de "geração de Éter por acerto" — específico por Classe (definido em seed SQL)

---

### 1.8 Fim de Combate — Condições

| Condição | Descrição |
|---|---|
| **HP zero** | Personagem chega a 0 HP — derrota. Consequências aplicadas |
| **Rendição** | Jogador escolhe Render-se. Encerra imediatamente |
| **Acordo mútuo** | Ambos concordam em encerrar — sem consequências (disponível em duelos livres) |
| **Fuga bem-sucedida** | Roll de Velocidade bem-sucedido — encerra o combate sem consequências de derrota, mas sem recompensas |
| **Fuga fracassada** | O turno é consumido e a tentativa falha — o oponente age normalmente |
| **Tempo limite** | Apenas em contexto de torneio — quem tiver mais HP percentual vence |

---

### 1.9 Consequências de Derrota (PvP)

Sem morte permanente. Ao ser derrotado:

1. **Perda de Essências** — quantidade perdida baseada no contexto do combate (duelo ranqueado perde mais que duelo casual). Pode ficar em saldo negativo de Essências — o personagem fica "em dívida" espiritual, o que tem peso narrativo
2. **Estado de Recuperação** — personagem fica indisponível para combate por período de tempo (valor em seed SQL). Durante esse período pode fazer expedições idle mas não PvP
3. **Narrativa de derrota** — evento gerado no histórico do personagem. Alimenta o Jornal do Mundo

**Consequências NÃO incluem:**
- Perda de equipamentos
- Perda de skills ou maestrias
- Perda de levels

---

### 1.10 PvP — Modalidades

| Modalidade | Descrição | Consequências |
|---|---|---|
| **Duelo Livre** | Desafio entre jogadores por acordo mútuo. Sem matchmaking | Nenhuma — resultado é apenas narrativo |
| **Duelo Ranqueado** | Sistema de ranking. Matchmaking por proximidade de level | Perda de Essências + posição no ranking |
| **Torneio** | Evento periódico organizado pelo GM. Bracket eliminatório | Premiação em Libras, Gemas ou itens exclusivos |
| **Emboscada** | Em zonas PvP declaradas, jogador pode iniciar combate sem acordo | Mecânica de zonas PvP — definida no sistema de territórios |

**Timer de turno em PvP ao vivo:** 30 segundos a 1 minuto por turno (configurável por modalidade). Tempo esgotado = Ataque Básico automático.

---

### 1.11 PvE — Modalidades

| Modalidade | Descrição |
|---|---|
| **Expedição Idle** | Personagem enviado automaticamente. Sem interação em tempo real. Ver seção 3 |
| **Missão com Combate** | Sequência de combates em turnos contra NPCs controlados pelo sistema. Mesmo engine do PvP |
| **Dungeon em Grupo** | 2 a 4 jogadores em instância com chefes. Combate em turnos, realtime coordenado |
| **Evento de Mundo** | PvE coletivo ativado pelo GM — boss global, invasão de facção. Participação aberta |

---

## 2. Sistema de Guerra de Territórios

### Filosofia

Guerras em Arkandia são conflitos estratégicos de longa duração — não batalhas instantâneas. Uma guerra pode durar dias. As decisões são tomadas nos intervalos entre batalhas: reposicionar tropas, mudar tipo de unidade, decidir se avança ou recua. O personagem do jogador entra na matemática da batalha como amplificador — suas skills e atributos influenciam o resultado idle, criando narrativas únicas a cada confronto.

---

### 2.1 Pré-requisitos para Guerra

- Apenas **Sociedades** podem declarar guerra a territórios
- A Sociedade deve ter ao menos um território para poder declarar guerra (não pode atacar sem base)
- Personagens solo podem participar de guerras como mercenários ou aliados, mas não podem declará-las

---

### 2.2 Tipos de Tropa

| Tipo | Força contra | Fraco contra | Uso especial |
|---|---|---|---|
| **Infantaria** | Cavalaria | Arquearia | Base de qualquer exército |
| **Cavalaria** | Arquearia | Infantaria | Alta mobilidade — chega ao front mais rápido |
| **Arquearia** | Infantaria | Cavalaria | Ataca de longe — reduz baixas próprias em terreno aberto |
| **Cerco** | Estruturas | Infantaria, Cavalaria | Exclusivo para destruir muralhas e fortificações de território |

**Triângulo de vantagens:**
```
Infantaria → Cavalaria → Arquearia → Infantaria
Cerco → Estruturas (sem triângulo — categoria separada)
```

---

### 2.3 Recrutamento de Tropas

Tropas são recrutadas com **Libras** e **tempo de treinamento**:

- Cada tipo de tropa tem custo e tempo de recrutamento (valores em seed SQL)
- O limite de tropas que um personagem pode comandar é definido pelo atributo **Capitania**
- Tropas derrotadas em batalha são **perdidas permanentemente** — não existe sistema de enfermaria
- **Acelerar recrutamento:** custa Gemas (moeda premium)

**Níveis de tropa:**
Tropas podem ter níveis diferentes — tropas de nível maior custam mais Libras e mais tempo, mas têm atributos superiores. Nível máximo de tropa disponível pode ser limitado pelo level da Sociedade ou pelo nível do território controlado (definido em seed SQL).

---

### 2.4 Fases da Guerra

```
DECLARAÇÃO
    ↓
PREPARAÇÃO (período fixo — horas)
    ↓
BATALHA 1 (duração idle — horas)
    ↓
INTERVALO ESTRATÉGICO (período para replanejamento)
    ↓
BATALHA 2... N (repete até resolução)
    ↓
RESOLUÇÃO FINAL
```

---

#### FASE 1 — Declaração

- Sociedade atacante declara guerra a um território específico
- A declaração é pública — visível no Jornal do Mundo e no painel de territórios
- Custo de declaração: Libras (evita spam de declarações — valor em seed SQL)

---

#### FASE 2 — Preparação

- Período fixo antes da primeira batalha (valor em seed SQL — ex: 12h a 24h)
- Durante a preparação:
  - Atacantes e defensores recrutam tropas
  - Aliados podem se juntar a qualquer lado
  - O General da Sociedade define a composição inicial do exército
  - Personagens individuais declaram participação e alocam suas tropas

---

#### FASE 3 — Batalhas (ciclo idle)

Cada batalha é calculada automaticamente pelo sistema com base em:

**Poder Militar de cada lado:**
```
Poder = Σ (Tropas × Atributos_Tropa × Fator_Tipo) + Σ (Poder_Personagem × Participação)
```

**Influência dos personagens:**
- Personagens que participam da batalha contribuem com seus atributos de Ataque, Defesa e Capitania para o cálculo
- Skills e Maestrias específicas de personagem podem ter efeitos de batalha definidos (ex: uma Maestria de Ressonância de Guerra pode conceder bônus de Ataque às tropas aliadas durante batalhas)
- O GM pode gerar narrativa de batalha baseada nos personagens mais ativos

**Resultado de cada batalha:**
- Baixas de tropas em ambos os lados (calculadas por poder relativo + fator aleatório)
- Relatório narrativo gerado automaticamente (pode ser expandido pela IA narrativa)
- Progresso de conquista do território (medido em pontos de domínio)

---

#### FASE 4 — Intervalo Estratégico

Após cada batalha, período de replanejamento:

**Ações do General:**
- Mudar composição de tropas (trocar tipos, reposicionar)
- Recrutar reforços (se tiver Libras e tempo)
- Convocar ou dispensar aliados
- Declarar retirada (encerra a guerra — território permanece com defensor)
- Solicitar negociação de paz

**Ações de membros:**
- Adicionar ou retirar tropas próprias
- Usar Gemas para acelerar recrutamento de reforços
- Decidir continuar participando ou recuar

---

#### FASE 5 — Resolução Final

A guerra termina quando:

| Condição | Resultado |
|---|---|
| **Pontos de domínio zerados do defensor** | Atacante conquista o território |
| **General atacante declara retirada** | Guerra encerra, território permanece com defensor |
| **Acordo de paz mútuo** | Guerra encerra por negociação — possível acordo de termos |
| **Sociedade atacante sem tropas** | Derrota automática dos atacantes |

**Após conquista:**
- Território muda de controle para a Sociedade atacante
- **Safezone temporária:** território recém-conquistado fica protegido contra novas declarações de guerra por período fixo (valor em seed SQL)
- O defensor anterior perde a produção passiva do território imediatamente

---

### 2.5 Papéis na Guerra

| Papel | Quem pode assumir | Permissões |
|---|---|---|
| **General** | Líder ou oficial da Sociedade | Declara guerra, define estratégia, aceita aliados, negocia paz |
| **Participante** | Qualquer membro da Sociedade ou aliado convidado | Aloca tropas, participa de batalhas |
| **Mercenário** | Personagem solo convidado pelo General | Aloca tropas próprias, participa de batalhas |

---

## 3. Sistema de Expedições

### Filosofia

Expedições são a atividade de progressão assíncrona central de Arkandia — o jogador envia seu personagem e aguarda o resultado. O sistema é idle, mas não é passivo: as capacidades do personagem influenciam diretamente a chance de sucesso, o nível de risco assumido e as recompensas obtidas.

**Apenas uma expedição por vez** — enquanto o personagem está em expedição, não pode participar de PvP mas pode participar de guerras (suas tropas continuam disponíveis para batalhas de guerra).

---

### 3.1 Tipos de Expedição

---

#### TIPO 1 — Expedição Solo Idle

Personagem enviado sozinho. Sem interação em tempo real durante a expedição.

**Características:**
- Duração: variável por expedição, máximo de 12h
- O personagem enfrenta obstáculos calculados automaticamente
- Resultado determinado por: atributos do personagem + skills equipadas na Building + fator aleatório ponderado pelo nível de risco
- Sem tropas envolvidas — é o personagem contra o mundo

**Subtipos:**

| Subtipo | Descrição | Recompensas principais |
|---|---|---|
| **Exploração** | Percorre território novo ou conhecido em busca de recursos | Materiais de crafting, Libras, lore fragmentado |
| **Caça** | Enfrenta criaturas em território selvagem | Materiais raros, Libras, drop de equipamento |
| **Investigação** | Busca por Monólitos, facções ou eventos narrativos | Lore, reputação de facção, fragmentos de Maestria |
| **Missão de Facção** | Enviado por uma facção específica para tarefa discreta | Reputação, Libras, itens exclusivos da facção |

---

#### TIPO 2 — Expedição com Tropas

Personagem lidera tropas em missão. Envolve perda possível de tropas em caso de falha.

**Características:**
- Requer Capitania suficiente para o tamanho da expedição
- Tropas participam do cálculo de sucesso (composição importa)
- Tropas perdidas em falha são permanentes
- Duração maior que expedição solo

**Subtipos:**

| Subtipo | Descrição | Recompensas principais |
|---|---|---|
| **Conquista de Ponto** | Captura ponto menor de influência | Libras, reputação territorial |
| **Escolta** | Protege comboio de recursos | Libras, materiais, reputação |
| **Raid** | Ataque rápido a posição inimiga | Libras, itens saqueados, reputação de guerra |

---

#### TIPO 3 — Dungeon em Grupo

2 a 4 jogadores em instância com combate em turnos realtime. Não é idle — requer presença ativa.

**Características:**
- Combate usa o mesmo engine do PvP — turnos, skills, Range States
- Inimigos controlados pelo sistema com IA simples mas escalada para o grupo
- Chefes de dungeon têm mecânicas específicas (anunciadas antes do combate)
- Cada jogador age no seu turno; a ordem é definida por Velocidade de todos os participantes e inimigos
- Falha encerra a dungeon — sem penalidade além de não receber recompensas

**Recompensas:** materiais raros, equipamentos especiais, fragmentos de Maestria de Prestígio, lore exclusivo

---

### 3.2 Níveis de Risco

Toda expedição idle tem nível de risco definido:

| Risco | Chance de sucesso base | Recompensa | Consequências em falha |
|---|---|---|---|
| **Seguro** | Alta | Baixa | Nenhuma — apenas sem recompensa |
| **Moderado** | Média | Média | Personagem fica ferido (indisponível por X horas) |
| **Perigoso** | Média-baixa | Alta | Ferido + perda de tropas (se aplicável) |
| **Extremo** | Baixa | Muito alta | Ferido + perda de tropas + perda de Essências |

A chance de sucesso base é modificada pelos atributos do personagem — um personagem forte em Ataque tem melhor performance em expedições de caça; forte em Magia em expedições de investigação. A composição de tropas importa nos tipos que as envolvem.

---

### 3.3 Estado de Ferido

Quando o personagem fica ferido:
- Indisponível para PvP e novas expedições pelo período de recuperação
- **Pode** participar de guerras (suas tropas lutam, mas o bônus de personagem é reduzido)
- Recuperação automática pelo tempo — sem sistema de cura ativa
- Gemas podem acelerar recuperação

---

### 3.4 Recompensas de Expedição

| Recompensa | Disponível em |
|---|---|
| XP | Todos os tipos |
| Libras | Todos os tipos |
| Materiais de crafting (comuns) | Exploração, Caça, Expedição com Tropas |
| Materiais raros | Caça (perigoso/extremo), Dungeon |
| Equipamentos | Dungeon, Caça extrema |
| Lore / fragmentos narrativos | Investigação, Missão de Facção, Dungeon |
| Reputação de facção | Missão de Facção, Investigação |
| Fragmentos de Maestria de Prestígio | Dungeon |
| Drop de Pergaminho de Classe de Prestígio | Dungeon (raro) |

---

## 4. Sistema de Economia

### Filosofia

A economia de Arkandia é player-driven com camadas de intervenção do sistema. As três moedas têm funções separadas e não são intercambiáveis. O mercado existe em duas formas: negociação direta (bazaar) e leilão intermediado. Territórios controlados por Sociedades geram produção passiva, criando incentivo estratégico para guerra.

---

### 4.1 As Três Moedas

Ver GDD_Personagem, seção 10 para definição completa. Resumo funcional:

| Moeda | Obtida por | Gasta em | Transferível |
|---|---|---|---|
| **Libra** | Missões, expedições, produção, comércio | Tudo econômico | Sim |
| **Essência** | Missões, expedições, daily tasks | Skills, Ressonância, Maestrias de Prestígio e Ressonância | Não |
| **Gema** | Compra real (PIX) | Maestrias Lendárias, acelerações, cash shop | Não |

---

### 4.2 Mercado Direto (Bazaar)

Negociação direta entre jogadores:

- Jogador anuncia item com preço pedido
- Outro jogador aceita ou faz contraproposta
- Transação finalizada por ambos — sistema registra como evento
- **Taxa de listagem:** pequena taxa em Libras ao anunciar (valor em seed SQL) — desestimula spam
- Itens listados expiram após período fixo se não vendidos

**O que pode ser negociado:**
- Equipamentos e armas
- Materiais de crafting
- Libras (troca direta entre jogadores)
- Pergaminhos de Classe de Prestígio
- Consumíveis

**O que NÃO pode ser negociado:**
- Essências
- Gemas
- Maestrias (são vinculadas ao personagem após adquiridas)
- Skills (vinculadas ao personagem)

---

### 4.3 Casa de Leilões

Sistema intermediado para vendas assíncronas:

- Jogador lista item com preço mínimo e duração do leilão (ex: 24h, 48h, 72h)
- Outros jogadores dão lances — o maior lance ao final vence
- **Taxa sobre valor final:** percentual do valor de venda cobrado pelo sistema (valor em seed SQL)
- Se nenhum lance superar o mínimo, item retorna ao vendedor (taxa de listagem não reembolsada)
- Lances são vinculantes — quem dá lance tem Libras reservadas até o leilão encerrar ou ser superado

---

### 4.4 Produção Passiva de Território

Territórios controlados por Sociedades produzem passivamente:

**O que produz:**
- **Libras** — renda passiva base de todo território
- **Materiais de crafting** — tipo varia por categoria do território (Forja produz minérios, Arcano produz cristais etéreos, etc.)

**Como é calculado:**
- Produção calculada on-demand no momento da coleta — não por background job
- Fórmula: `Produção = Taxa_Base × Tempo_Decorrido × Multiplicador_Reinvestimento`
- Tempo decorrido desde última coleta (ou desde conquista, se nunca coletado)
- Urgath tem anomalia temporal: bônus de tempo na produção (ver GDD_Mundo, seção 14)

**Reinvestimento:**
- A Sociedade pode reinvestir Libras no território para aumentar o Multiplicador de produção
- Multiplicador cresce em níveis (valor em seed SQL)
- Reinvestimento é decisão do General da Sociedade

**Coleta:**
- Qualquer membro designado pelo General pode coletar
- Coleta gera evento público — visível no Jornal do Mundo e painel de territórios

---

### 4.5 Impostos Internos de Sociedade

As Sociedades podem configurar um imposto interno:
- Percentual da produção passiva que vai para o cofre da Sociedade antes de distribuição
- O restante é dividido entre membros participantes (definido pelo General)
- Cofre da Sociedade paga: recrutamento de tropas para guerras, reinvestimento em territórios, declarações de guerra

---

### 4.6 Sistema de Summon (Gacha)

O Summon é o sistema de gacha para obtenção de materiais e equipamentos:

**Funcionamento:**
- Catálogo rotativo — muda periodicamente
- Pode entregar: materiais comuns, materiais raros, equipamentos completos, Libras, Essências, itens de temporada
- **Moeda de Summon:** Gemas (premium) ou Tickets de Summon (obtidos em eventos e daily tasks)
- Sistema de pity: após X summons sem item raro, probabilidade aumenta progressivamente (valor em seed SQL)

**Transparência:**
- Probabilidades exibidas no catálogo — obrigatório por design
- Histórico de summons visível para o jogador

---

## 5. Progressão Diária

### Filosofia

O jogador deve ter motivo para abrir o site todos os dias, mesmo que por poucos minutos. As daily tasks não são obrigatórias — são incentivos. O sistema recompensa presença sem punir ausência. Nenhuma daily task deve exigir mais de 2 minutos para completar.

---

### 5.1 Daily Tasks

O jogador recebe **5 daily tasks** por dia. Renovam à meia-noite (horário do servidor). Completar todas as 5 concede **recompensa bônus** além das recompensas individuais.

As 5 tasks diárias são sorteadas de um pool de 7 tipos — o jogador não vê o pool completo, apenas as 5 do dia:

---

#### TASK 1 — Consultar o Jornal
**Ação:** Ler a edição do dia do Jornal do Mundo (gerado pela IA narrativa)
**Recompensa:** Pequena quantidade de Essência
**Propósito:** Criar hábito de lore diário. O jogador absorve narrativa do mundo passivamente

---

#### TASK 2 — Treino Diário
**Ação:** Ativar o treino do personagem — animação narrativa baseada na Classe
**Recompensa:** XP bônus
**Propósito:** Progressão diária garantida mesmo sem jogo ativo. Sabor diferente por Classe (Espadachim treina kata, Bardo ensaia uma melodia, Lutador faz meditação de combate)

---

#### TASK 3 — Coletar Produção
**Ação:** Coletar o que território ou expedição produziu
**Recompensa:** Os próprios recursos produzidos + pequeno bônus de Libras pela coleta em dia
**Propósito:** Obriga o login de forma satisfatória — sempre tem algo esperando

---

#### TASK 4 — Desafio de Combate
**Ação:** Enfrentar NPC gerado pelo sistema com dificuldade escalada ao level do personagem
**Recompensa:** Libras + chance de drop de material
**Propósito:** Mantém o jogador praticando o sistema de combate mesmo sem PvP ativo

---

#### TASK 5 — Ação de Facção
**Ação:** Completar pequena missão de reputação para facção à escolha (entre as que o personagem tem Reconhecido ou mais)
**Recompensa:** Ponto de reputação + Libras
**Propósito:** Progressão de reputação com facções sem depender de missões longas

---

#### TASK 6 — Mercado Volátil
**Ação:** Um item raro aparece na loja NPC do sistema por apenas 24h a preço especial
**Recompensa:** Acesso ao item — o jogador decide se compra
**Propósito:** Urgência de login. O item não retorna naquele dia se o jogador não abrir o site

---

#### TASK 7 — Eco do Arquétipo
**Ação:** Meditação narrativa baseada na Ressonância do personagem (disponível apenas após nível 5)
**Recompensa:** Fragmento de lore exclusivo da Ressonância + Essência
**Propósito:** Aprofundamento narrativo individual. Cada Eco é gerado pela IA — único por dia por personagem

---

### 5.2 Recompensa Bônus (completar todas as 5)

Completar todas as 5 tasks do dia concede um **Ticket de Summon** — moeda para o sistema gacha. Cria incentivo para completar todas sem forçar.

---

### 5.3 Login Streak

Logar em dias consecutivos concede bônus crescente:
- 3 dias: Libras bônus
- 7 dias: Ticket de Summon
- 15 dias: Essências bônus
- 30 dias: item cosmético exclusivo do mês

Streak quebrado volta ao início — mas sem punição além de perder o progresso do streak.

---

## 6. Engajamento e Retenção

### Filosofia

O público de Arkandia veio do Habbo — valoriza presença visual, expressão do personagem e interação social. O sistema precisa oferecer equivalentes digitais do que o Habbo oferecia: um lugar para existir, ser visto e se expressar. As features desta seção não são mecânicas de progressão — são a cola social que mantém jogadores no mundo mesmo quando não há batalhas.

---

### 6.1 Avatar Visual do Personagem

Cada personagem tem uma **ilustração 2D estática** gerada por IA com o seguinte estilo canônico:

> *Unique 2.5D illustrative art style, precisely replicating the textured finish and hybrid expressive from Fate Series and One Piece. This style is a unique hybrid, blending dynamic comic book line art (defined, variable-width ink outlines with strategic cross-hatching for texture on skin and armor) and rich, painterly digital illustration. This is NOT a generic or clean vector style; all surfaces (skin, fabric, metal, background) must have visible, tactile brush strokes and painterly texture, semi-cel-shaded but with painterly depth. Character faces must be distinct, non-generic, with visible skin texture, maintaining slightly asymmetrical facial features to avoid genetic features. Intense, cinematic, producing dramatic, high-contrast shadows. The color palette must be saturated. Deep, painterly background texture with atmospheric haze. High focus, masterpiece, trending on ArtStation.*

**Composição visual por camadas:**
1. **Fundo** — ambiente temático baseado na Raça e região de origem
2. **Silhueta base** — postura de combate baseada na Classe
3. **Equipamentos** — reflete os equipamentos atualmente equipados
4. **Destaque de Maestria** — se o personagem tiver Maestria Lendária ativa, efeito visual sutil é adicionado

**Quando o avatar é atualizado:**
- Ao equipar novo equipamento especial
- Ao adquirir Maestria Lendária
- Por solicitação manual do jogador (custo em Libras ou Gemas — a definir)

**Onde o avatar aparece:**
- Ficha pública do personagem
- Perfil no cenário social
- Card em rankings
- Histórico de combate

---

### 6.2 Cenários Sociais

Instâncias visuais onde jogadores entram com seus personagens para roleplay livre.

**Funcionamento:**
- O GM cria cenários com nome, descrição e arte de fundo temática
- Jogadores entram voluntariamente — presença é listada publicamente
- Chat in-character: o jogador fala como o personagem (nome do personagem aparece, não o usuário)
- Histórico do chat **some quando a instância fecha** — preserva o caráter efêmero do RP
- Sem mecânicas de combate dentro de cenários — espaço exclusivamente social e narrativo

**Tipos de cenário:**

| Tipo | Exemplos | Criado por |
|---|---|---|
| **Permanente** | Taverna da Bastilha Velada, Praça das Doze Vozes | GM — sempre disponível |
| **Temporário** | Salão de torneio, Acampamento de guerra | GM — para eventos específicos |
| **Privado** | Sala de reunião de Sociedade | General da Sociedade |

**Limite de jogadores por instância:** definido pelo GM por cenário (ex: taverna comporta 20, sala privada comporta 8)

---

### 6.3 Sistema de Títulos

Títulos são conquistas permanentes exibidas abaixo do nome do personagem nas interações.

**Como se ganham:**
- Conquistas de progressão (primeiro a completar uma dungeon, primeiro a adquirir certa Maestria)
- Eventos narrativos específicos (escolhas na Campanha Inicial, interações com Monólitos)
- Participação em guerras (sobreviveu a X batalhas, participou da conquista de território Y)
- Daily tasks (completou 30 dias de streak)
- Concessão direta pelo GM (para eventos especiais, roleplay de destaque)

**Exibição:**
- O jogador escolhe qual título exibir (pode ter vários, exibe um)
- Título aparece na ficha pública, no chat de cenário e nos resultados de combate
- Alguns títulos são raros e servem como marcador de status — "Portador de Segredo", "Primeiro do Eco", "Sobrevivente de Thar-Halum"

---

### 6.4 Rankings Públicos

Placares visíveis para todos — competição passiva que não exige sessão simultânea:

| Ranking | Critério | Atualização |
|---|---|---|
| **Maiores Guerreiros** | Vitórias em PvP ranqueado | Tempo real |
| **Sociedades Dominantes** | Territórios controlados + poder militar | Diária |
| **Exploradores** | Expedições completadas + lore descoberto | Diária |
| **Primeiros da Maestria** | Primeiros a adquirir cada Maestria Lendária | Permanente após conquista |
| **Heróis de Guerra** | Participação e impacto em guerras de território | Por evento de guerra |

---

### 6.5 Eventos de Mundo (GM-driven)

O GM pode ativar eventos globais que afetam o estado do mundo por tempo limitado:

**Tipos de evento:**

| Tipo | Descrição | Impacto mecânico |
|---|---|---|
| **Aparecimento de Monólito** | Monólito surge em território — corrida para investigar | Missões especiais disponíveis por tempo limitado |
| **Invasão de Facção NPC** | Facção ataca região — jogadores defendem | PvE coletivo com recompensas de guerra |
| **Passagem de Imperador** | Um dos Quatro Imperadores é avistado | Evento narrativo — pode abrir missão especial |
| **Torneio** | Bracket de PvP organizado pelo GM | Premiação em Gemas, Libras ou itens exclusivos |
| **Crise Política** | Decisão que afeta reputação de todas as facções | Jogadores votam ou participam de missões que definem resultado |
| **Catálogo Lendário** | Maestrias Lendárias sazonais disponíveis por tempo limitado | Gacha de Gemas por período fixo |

Todos os eventos são anunciados no Jornal do Mundo antes de acontecer — cria antecipação e planejamento.

---

### 6.6 Sistema de Correspondência

Jogadores podem enviar cartas a outros personagens — comunicação in-character:

- Cartas chegam na "Caixa de Mensagens" do personagem destinatário
- São escritas como o personagem, não como o jogador
- O GM pode "citar" cartas relevantes no Jornal do Mundo (com permissão do jogador)
- Cartas entre personagens ficam no histórico privado de ambos
- Sem limite de comprimento — podem ser desde uma linha até um manifesto

**Propósito:** Substitui parcialmente as DMs do Habbo com identidade narrativa. Cria vínculos entre personagens que alimentam o lore emergente.

---

### 6.7 Diário do Personagem

Cada personagem tem um diário público opcional:

- O jogador pode escrever entradas como o personagem
- Entradas ficam visíveis na ficha pública
- O GM pode marcar entradas como "lore confirmado" — integrando à narrativa oficial
- Sistema de reação simples (outros jogadores podem marcar com símbolos temáticos — não "curtidas" genéricas)

---

## 7. Diretrizes de Implementação

### Arquitetura de lógica de jogo

```
/lib/game/
├── combat.ts          → Engine de combate, fórmulas de dano, esquiva, efeitos
├── attributes.ts      → Escalonamento de atributos, cálculos derivados
├── skills.ts          → Validação de uso de skill, custo de Éter, cooldowns
├── building.ts        → Gerenciamento de slots, validação de 6 skills
├── resonance.ts       → Level de Ressonância, Éter máximo, desbloqueio de Maestrias
├── maestrias.ts       → Validação de restrições, lógica de esgotamento de Lendárias
├── war.ts             → Cálculo de batalha, poder militar, baixas, progresso de domínio
├── expedition.ts      → Cálculo de sucesso, tabelas de loot, estado de ferido
├── economy.ts         → Produção passiva, reinvestimento, impostos, taxa de mercado
├── daily.ts           → Pool de daily tasks, streak, ticket de summon
└── summon.ts          → Tabelas de probabilidade, sistema de pity, catálogo rotativo
```

### Tabelas do banco (a criar na próxima migração)

```sql
-- Combate
combat_sessions          -- sessões ativas de combate
combat_turns             -- histórico de turnos por sessão
combat_effects           -- efeitos de status ativos por personagem em combate

-- Guerra
war_declarations         -- guerras declaradas com status e fases
war_participants         -- personagens e tropas por guerra
war_battles              -- resultado de cada batalha dentro de uma guerra
war_battle_actions       -- ações tomadas por generals nos intervalos

-- Expedições
expeditions              -- expedições ativas e históricas
expedition_results       -- resultados detalhados por expedição

-- Economia
market_listings          -- listagens do bazaar
auction_listings         -- leilões ativos
auction_bids             -- lances por leilão
territory_production     -- snapshot de produção por território
society_treasury         -- cofre da Sociedade

-- Progressão diária
daily_tasks              -- tasks do dia por personagem
daily_streak             -- streak de login por personagem
summon_history           -- histórico de summons por personagem
summon_pity              -- contador de pity por personagem

-- Engajamento
scenario_instances       -- instâncias de cenário ativas
scenario_messages        -- chat de cenário (limpo ao fechar instância)
character_titles         -- títulos adquiridos por personagem
character_mail           -- correspondência entre personagens
character_diary          -- entradas de diário por personagem
rankings                 -- snapshot de rankings (atualizado periodicamente)
```

### Regras de implementação invioláveis

- **Produção passiva**: sempre calculada on-demand via timestamp — nunca por background job
- **Esgotamento de Maestrias Lendárias**: transaction atômica — verificar disponibilidade e marcar como esgotada em operação única
- **Limite de 6 skills**: validado no servidor em toda ação de Building — nunca só no cliente
- **Tropas perdidas**: permanentes — sem recovery, sem enfermaria
- **Essência negativa**: permitida como consequência de derrota — personagem em saldo negativo tem restrições de acesso a novas skills (definir threshold em seed SQL)
- **Safezone de território**: verificada antes de aceitar declaração de guerra — rejeitar se safezone ativa
- **Timer de turno PvP**: implementado via websocket — turno expirado executa Ataque Básico automaticamente
- **Chat de cenário**: não persistido após fechamento da instância — sem backup, por design

### Termos canônicos — usar sempre

| Termo correto | Errado / Evitar |
|---|---|
| Building | Loadout, deck, configuração de skills |
| Range State | Distância, range, alcance genérico |
| Efeito de Status | Debuff genérico, status effect |
| Batalha (em guerra) | Round, fase de guerra |
| Intervalo Estratégico | Cooldown de guerra, pausa |
| Produção Passiva | Renda passiva, farm automático |
| Cenário Social | Sala, instância, lobby |
| Correspondência | DM, mensagem direta, chat privado |
| Diário do Personagem | Blog, post, publicação |
| Ticket de Summon | Gacha ticket, moeda de invocação |

---

*Fim do GDD_Sistemas v1.0*
*Documentos relacionados: GDD_Mundo.md | GDD_Personagem.md | GDD_Narrativa.md*
