# GDD_Personagem — Arkandia: Criação e Progressão
> Versão 1.0 — Março 2026
> Documento de referência canônico para raças, classes, ressonâncias, skills, maestrias e progressão de personagem.
> Este arquivo é a fonte primária de verdade sobre o sistema de personagem de Arkandia.
> Todo conteúdo gerado por IA, toda migração SQL e toda lógica em /lib/game devem ser consistentes com este documento.

---

## ÍNDICE

1. [Visão Geral do Sistema de Personagem](#1-visão-geral-do-sistema-de-personagem)
2. [Raças Jogáveis](#2-raças-jogáveis)
3. [Classes](#3-classes)
4. [Atributos](#4-atributos)
5. [Progressão de Level](#5-progressão-de-level)
6. [A Ressonância](#6-a-ressonância)
7. [Sistema de Skills](#7-sistema-de-skills)
8. [Building — Slots de Skills](#8-building--slots-de-skills)
9. [Maestrias](#9-maestrias)
10. [Moedas do Personagem](#10-moedas-do-personagem)
11. [Crafting e Equipamentos](#11-crafting-e-equipamentos)
12. [Ficha do Personagem](#12-ficha-do-personagem)
13. [Diretrizes para IA e Implementação](#13-diretrizes-para-ia-e-implementação)

---

## 1. Visão Geral do Sistema de Personagem

### Filosofia central

Em Arkandia, **não existe a separação entre mundano e mágico**. Toda raça, toda classe e todo estilo de combate já carregam o Éter como fundamento. Um guerreiro que usa espada não é "não-mágico" — ele canaliza Éter através da lâmina. Um arqueiro não é "apenas físico" — cada flecha carrega a intenção espiritual de quem a disparou.

Por isso, não existe classe chamada "Mago" no sentido clássico de "o único que usa magia". Existe o Mago como portador de Cajado — um catalisador que amplifica e direciona o Éter de forma bruta e concentrada. Mas um Bardo faz o mesmo com um instrumento. Um Druida faz o mesmo com um machado. A diferença é o *canal*, não o acesso.

### Os quatro marcos do personagem

A identidade de um personagem em Arkandia é construída em camadas:

```
CRIAÇÃO
├── Raça — quem você é biologicamente e culturalmente
└── Classe — como você luta e canaliza o Éter

CAMPANHA INICIAL (níveis 1–9)
└── Ressonância — qual Arquétipo dormia em você (revelado, não escolhido)

PROGRESSÃO CONTÍNUA
├── Árvore de Skills de Classe — completa as 8 skills base
└── Maestrias — o que você se torna além da classe
```

### O que não existe neste sistema

- **Profissões** — crafting, comércio e produção são features de menu, não identidade de personagem
- **Up de habilidade por nível** — skills não têm "nível próprio". Escalam pelos atributos do personagem
- **Morte permanente** — consequências graduais no lugar
- **Classe como arquétipo mágico** — todo mundo já é mágico. Classe define arma e estilo de combate

---

## 2. Raças Jogáveis

> As raças de Ellia não foram criadas — foram emanadas pelos Arquétipos durante a Era das Linhagens Originais.
> Cada raça carrega em sua biologia e cultura o reflexo do Arquétipo de origem.
> Os bônus raciais são passivos fixos — sempre ativos, independente de território ou situação.
> Raças não obrigam nem restringem a escolha de Ressonância futura, mas podem ter afinidades narrativas com certos Arquétipos.

---

### HUMANO

**Arquétipo de origem:** Vínculo — os humanos emergiram como a raça do laço, da adaptação e da conexão entre forças opostas

**Vínculo geográfico:** Cosmopolitas por natureza. Presentes em todas as macrorregiões — especialmente nas Terras Centrais (Valoria, Vermécia, Vallaeon)

**Identidade narrativa:**
Os humanos não são a raça mais forte, mais velha nem mais sábia — são a mais versátil. Sua fraqueza é sua força: sem dom inato único, desenvolveram a capacidade de se adaptar, aprender e superar qualquer outra raça em dedicação pura. São os maiores construtores de impérios, os mais prolíficos artistas e os mais imprevisíveis combatentes. Em Ellia, "humano" é sinônimo de "pode se tornar qualquer coisa".

**Traços físicos marcantes:**
- Enorme variação física entre regiões — não há "humano padrão"
- Vida média moderada comparada às raças ancestrais
- Ausência de traços mágicos externos visíveis (o que frequentemente os subestima)

**Bônus racial passivo:**
- Adaptação — maior pool de pontos livres para distribuição de atributos ao subir de nível (valor definido em seed SQL)
- Versatilidade — sem restrição de acesso a nenhuma Maestria com base em raça

**Afinidade narrativa com Ressonâncias:** Vínculo, Vontade — mas por serem adaptáveis, nenhuma Ressonância é incompatível

---

### ELFO

**Arquétipo de origem:** Sonho e Vínculo — os elfos emergiram como guardiões da memória e dos laços entre planos

**Vínculo geográfico:** Eryuell (Ilhas Ocidentais) como terra ancestral. Comunidades elfas também em Albyn e Vallaeon

**Identidade narrativa:**
Os elfos de Ellia não são frágeis nem arrogantes no sentido clichê — são *distantes*. Vivem mais longamente que qualquer raça jogável, o que os torna naturalmente contemplativos e às vezes melancólicos. Cada elfo carrega memórias de eras que outras raças conhecem apenas como história. Isso os torna poderosos e lentos ao mesmo tempo: lentos para confiar, lentos para mudar, mas devastadores quando finalmente se comprometem com algo.

**Traços físicos marcantes:**
- Orelhas alongadas e traços afilados
- Olhos que mudam sutilmente de tonalidade conforme o estado emocional
- Vida excepcionalmente longa — alguns elfos anciãos viveram o suficiente para testemunhar o fim do Grande Reino
- Presença etérea natural — animais raramente os atacam por impulso

**Bônus racial passivo:**
- Memória Etérea — bônus no atributo Éter máximo (valor definido em seed SQL)
- Percepção do Sonho — vantagem em missões que envolvem ilusões, sonhos ou planos espirituais (valor definido em seed SQL)

**Afinidade narrativa com Ressonâncias:** Sonho, Vínculo, Tempo

---

### ANÃO

**Arquétipo de origem:** Matéria e Ordem — os anões foram os primeiros a dar forma permanente ao mundo físico

**Vínculo geográfico:** Düren e Norrheim (Domínios do Norte). Comunidades anãs também nas cidades-forja de Vermécia

**Identidade narrativa:**
Os anões são a raça mais antiga ainda presente no mundo físico em grandes números. Seu corpo foi literalmente moldado pela Matéria — denso, resistente, próximo da pedra e do ferro. Não são lentos de mente: são deliberados. Cada decisão é tomada como se fosse durar séculos — porque para eles, frequentemente dura. São os maiores mestres de forja e arquitetura de Ellia, mas também guerreiros de resistência incomparável. Sua honra é tão sólida quanto seu corpo.

**Traços físicos marcantes:**
- Estatura baixa e constituição extremamente densa
- Barba como símbolo de status e linhagem (tanto em homens quanto mulheres em algumas culturas)
- Pele com tonalidades que lembram pedra, terra ou minério
- Resistência física natural a temperaturas extremas

**Bônus racial passivo:**
- Constituição de Pedra — bônus no atributo Defesa e Vitalidade (valor definido em seed SQL)
- Forjado pela Matéria — vantagem em missões de crafting e territórios do tipo Forja (valor definido em seed SQL)

**Afinidade narrativa com Ressonâncias:** Matéria, Ordem, Guerra

---

### DRACONIANO

**Arquétipo de origem:** Guerra, Vontade e Ruína — os Draconianos são os descendentes diretos dos Drakharn, a raça-dragão do Grande Reino de Petrania

**Vínculo geográfico:** Sem território fixo após a queda de Petrania. Dispersos pelo continente — concentrações em Vermécia, Norrheim e bordas de Urgath. São uma raça sem pátria desde a Guerra Fraturada.

**Identidade narrativa:**
Jogar como Draconiano em Arkandia é carregar o peso de uma linhagem apagada. O Conselho dos Anciões suprimiu a história dos Drakharn — o que significa que um Draconiano jogável navega um mundo que, oficialmente, nega sua origem. São vistos com mistura de fascínio e desconfiança: lembram demais o que foi destruído. Fisicamente poderosos além do que qualquer treino explica. Etéricamente instáveis de formas que outras raças não compreendem. E às vezes, em momentos de alto estresse, manifestam fragmentos de algo antigo que nem eles sabem nomear.

**Traços físicos marcantes:**
- Escamas parciais em regiões do corpo (pescoço, ombros, antebraços, costas)
- Olhos com pupila vertical em tons de âmbar, vermelho ou dourado
- Temperatura corporal acima da média — sua presença é literalmente quente
- Ocasionalmente: pequenos chifres ou cristas vestigiais

**Bônus racial passivo:**
- Sangue do Dragão — bônus no atributo Ataque e resistência a dano elemental de fogo (valor definido em seed SQL)
- Eco do Ciclo — em certas missões envolvendo Monólitos ou lore Drakharn, recebem fragmentos narrativos exclusivos (gatilho narrativo, não bônus de atributo)

**Afinidade narrativa com Ressonâncias:** Guerra, Vontade, Ruína — e uma afinidade especial e perturbadora com Tempo (herança dracônica)

**Nota de lore:** Draconianos jogáveis são descendentes diluídos dos Drakharn originais. Não são Reis-Dragão — são o que restou. O Conselho monitora Draconianos com atenção especial, especialmente aqueles que demonstram afinidade com Monólitos.

---

### MEIO-GIGANTE

**Arquétipo de origem:** Guerra e Matéria — os Gigantes foram emanados como forças brutas do mundo físico, e os Meio-Gigantes são seu legado mestiço com outras raças

**Vínculo geográfico:** Domínios do Norte — Norrheim especialmente. Alguns clãs isolados nas bordas das montanhas de Düren e nas planícies do norte de Valoria

**Identidade narrativa:**
Os Meio-Gigantes existem entre dois mundos: grandes demais para serem tratados como iguais pelas raças menores, pequenos demais para pertencerem à linhagem pura dos Gigantes ancestrais. Essa tensão de identidade molda seu caráter — muitos desenvolvem uma calma quase filosófica diante do que não podem controlar, outros a transformam em raiva controlada. Em Norrheim são respeitados como guerreiros de elite. Em Valoria são vistos com suspeita. Em qualquer lugar, sua presença física é impossível de ignorar.

**Traços físicos marcantes:**
- Estatura consideravelmente acima da média de todas as outras raças
- Musculatura densa e estrutura óssea robusta
- Traços faciais marcados — queixo, sobrancelhas, maxilar pronunciados
- Cicatrização acelerada visível — ferimentos menores fecham durante o próprio combate

**Bônus racial passivo:**
- Sangue de Titã — bônus no atributo Vitalidade e Tenacidade (valor definido em seed SQL)
- Peso do Gigante — bônus em habilidades de impacto e derrubada (valor definido em seed SQL)

**Afinidade narrativa com Ressonâncias:** Guerra, Matéria, Ordem

---

### MELFORK

**Arquétipo de origem:** Vida, Espaço e Vínculo — os Melfork emergiram nas profundezas oceânicas, onde a Vida encontrou o Espaço ilimitado do mar

**Vínculo geográfico:** Regiões costeiras e insulares — especialmente as Ilhas Ocidentais (Ogygia, Eryuell), o litoral de Kastulle e os arquipélagos entre as macrorregiões. Raros no interior continental.

**Identidade narrativa:**
Os Melfork são a raça mais misteriosa para os continentais — porque eles vêm de um mundo que a maioria nunca verá. O oceano de Ellia não é apenas água: é um plano com sua própria política, história e magia. Os Melfork que chegam ao continente são sempre, de alguma forma, exilados, exploradores ou mensageiros de algo que acontece embaixo da superfície. Sua relação com o Éter é fluida — literalmente. Eles não canalizam energia em linhas retas; ela flui, contorna, infiltra.

**Traços físicos marcantes:**
- Membrana sutil entre os dedos e traços que lembram escamas finas em partes do corpo
- Olhos grandes adaptados a pouca luz, frequentemente em tons de azul profundo, verde-água ou prata
- Capacidade de respirar sob água por períodos extensos
- Voz com harmônicos duplos — quando cantam ou falam com emoção, dois tons simultâneos

**Bônus racial passivo:**
- Fluidez Etérea — bônus no atributo Magia e regeneração de Éter (valor definido em seed SQL)
- Filho do Mar — vantagem em missões aquáticas, costeiras e territoriais insulares (valor definido em seed SQL)

**Afinidade narrativa com Ressonâncias:** Vida, Espaço, Sonho, Vínculo

---

## 3. Classes

> Uma Classe em Arkandia não é um arquétipo de poder — é um estilo de existência em combate.
> Define a arma primária, o canal físico pelo qual o Éter é expresso, e a filosofia de confronto do personagem.
> Todo mundo já é mágico. A Classe define *como* essa magia se manifesta.
> Todas as 11 Classes são disponíveis para todas as raças desde a criação do personagem.
> Cada Classe tem escalonamento próprio de atributos conforme o personagem avança de nível.

---

### LANCEIRO
**Arma:** Lança / Alabarda / Glaive
**Atributos primários:** Ataque, Velocidade, Precisão

**Identidade narrativa:**
O Lanceiro é a distância calculada. Não recua — posiciona. Em culturas guerreiras como Ryugakure e Valoria, a lança é a arma do soldado que mantém a linha; em outras, como Indravaar, é o símbolo do guardião espiritual. O Lanceiro de Arkandia combina alcance, timing e fluxo de Éter em movimentos que parecem dança e terminam em perfuração. Sua força está na capacidade de controlar o espaço ao redor — não apenas o inimigo à frente.

**Escalonamento:** foco em Ataque e Velocidade conforme sobe de nível. Precisão cresce moderadamente.

---

### ESPADACHIM
**Arma:** Espada (uma mão, duas mãos, ou dupla)
**Atributos primários:** Ataque, Precisão, Tenacidade

**Identidade narrativa:**
A espada é a arma mais estudada de Ellia — e o Espadachim é quem levou esse estudo à obsessão. Não há um "estilo único": há escolas, filosofias, juramentos e heresias dentro do combate com espada. O Espadachim de Arkandia pode ser o duelista elegante de Ogygia, o guerreiro-código de Ryugakure ou o soldado-elite de Valoria. O que os une é a precisão — cada golpe é intencional, cada movimento tem nome.

**Escalonamento:** foco em Ataque e Precisão. Tenacidade cresce para refletir o domínio técnico que transforma leitura de combate em resistência mental.

---

### LUTADOR
**Arma:** Manopla / Garras / Braçadeiras de combate
**Atributos primários:** Ataque, Vitalidade, Tenacidade

**Identidade narrativa:**
O Lutador escolheu a distância zero — não como desespero, mas como filosofia. Lutar com as próprias mãos é uma declaração: *não preciso de intermediários entre minha vontade e o mundo*. Em Norrheim e Indravaar, o combate corpo a corpo desarmado é forma de oração. Em Vermécia, é o teste máximo da Vontade Flamejante. O Lutador canaliza Éter diretamente pela carne — seus golpes carregam intenção espiritual concentrada de uma forma que nenhuma arma forjada consegue replicar.

**Escalonamento:** foco em Vitalidade e Ataque. Tenacidade cresce para refletir a resistência brutal de quem absorve para entregar.

---

### BARDO
**Arma:** Instrumento musical (catalisador mágico-musical)
**Atributos primários:** Magia, Éter, Precisão

**Identidade narrativa:**
O instrumento do Bardo não é ornamento — é arma. Em Arkandia, som é Éter em forma auditiva: frequências que ressoam com os Arquétipos, melodias que reescrevem estados espirituais, harmonias que fraturam estruturas físicas. O Bardo não "apoia" o grupo — ele redefine o campo de batalha. Suas habilidades podem curar, destruir, controlar e revelar dependendo de como o Éter é modulado pelo instrumento. Em Albyn e Ogygia, bardos são temidos como armas de guerra. Em Vallaeon, são diplomatas que literalmente mudam o humor de salas inteiras.

**Escalonamento:** foco em Magia e Éter. Precisão cresce para refletir o controle técnico necessário para modular frequências em combate.

---

### ATIRADOR
**Arma:** Arma de fogo (pistola, rifle, espingarda etérica)
**Atributos primários:** Precisão, Ataque, Velocidade

**Identidade narrativa:**
As armas de fogo de Ellia não são pólvora comum — são projéteis etéreos acelerados por cristais de compressão. O Atirador é a classe mais "moderna" de Arkandia narrativamente: surgiu nas últimas eras, associada às culturas que mesclaram alquimia e engenharia espiritual (Vermécia, Ogygia, Kastulle). É também a mais controversa — alguns a chamam de "magia sem honra". O Atirador não se importa: acerta o alvo antes que o debate termine.

**Escalonamento:** foco em Precisão e Ataque. Velocidade cresce para refletir o posicionamento e reação necessários para maximizar linhas de tiro.

---

### ARQUEIRO
**Arma:** Arco (curto, longo, composto)
**Atributos primários:** Precisão, Ataque, Velocidade

**Identidade narrativa:**
Se o Atirador é a modernidade, o Arqueiro é a eternidade. O arco existe desde a Era dos Heróis Eternos e nunca foi superado em elegância ou alcance espiritual. Em Ryugakure, arqueiros são assassinos de precisão cirúrgica. Em Norrheim, são caçadores com vínculo espiritual com a presa. Em Eryuell, o arco é instrumento de meditação tanto quanto de combate. O Arqueiro de Arkandia canaliza Éter pela flecha no momento do disparo — o que significa que cada projétil é único, carregando a intenção exata de quem o disparou.

**Escalonamento:** foco em Precisão e Ataque. Velocidade cresce para refletir a cadência e o posicionamento que tornam o arqueiro inatingível enquanto atira.

---

### ASSASSINO
**Arma:** Adaga / Armas curtas / Ferramentas de ocultação
**Atributos primários:** Ataque, Velocidade, Precisão

**Identidade narrativa:**
O Assassino não é apenas alguém que mata — é alguém que entende que a maioria das batalhas termina antes de começar. Posicionamento, informação, oportunidade: essas são as armas reais. A adaga é o ponto final de uma frase que começou muito antes do inimigo perceber. Em Arkandia, Assassinos existem em todas as culturas sob diferentes nomes — Shinobi em Ryugakure, Lâminas Sombrias em Vermécia, Sombras do Véu em Eryuell. Todos compartilham a mesma verdade: visibilidade é vulnerabilidade.

**Escalonamento:** foco em Velocidade e Ataque. Precisão cresce para refletir o conhecimento anatômico e espiritual necessário para golpes verdadeiramente definitivos.

---

### DRUIDA
**Arma:** Machado (de uma ou duas mãos)
**Atributos primários:** Ataque, Vitalidade, Magia

**Identidade narrativa:**
O Druida de Arkandia não é o ancião contemplativo da floresta — é o guardião que pega um machado e vai resolver o problema pessoalmente. Inspirado em figuras como os guerreiros-druidas de Albyn e os guardiões da natureza de Norrheim, o Druida canaliza o Arquétipo da Vida diretamente através do golpe. O machado não corta apenas carne — corta raízes espirituais, sela fluxos de Éter corrompido, abre caminhos onde há bloqueio. É a classe que mais combina brutalidade física com sensibilidade espiritual — e essa contradição é exatamente o que a torna poderosa.

**Escalonamento:** foco em Ataque e Vitalidade. Magia cresce para refletir a intensidade espiritual que transforma cada golpe num ato de conexão com o mundo natural.

---

### DESTRUIDOR
**Arma:** Martelo / Maça / Armas de impacto pesado
**Atributos primários:** Ataque, Vitalidade, Defesa

**Identidade narrativa:**
O Destruidor não derrota inimigos — ele desfaz. Estruturas, formações, escudos, armaduras, vontades: tudo cede diante do impacto certo no momento certo. É a classe que mais intimida na aproximação e mais desequilibra quando conecta. Em Düren, Destruidores são usados para demolir estruturas etéricas proibidas. Em Norrheim, são campeões em rituais de força. Em Urgath, alguns Destruidores carregam martelos que dizem ter sido forjados com fragmentos de Gaia — a Arma Ancestral da Matéria.

**Escalonamento:** foco em Ataque e Vitalidade. Defesa cresce para refletir que quem carrega o peso do martelo aprende a absorver impacto também.

---

### ESCUDEIRO
**Arma:** Escudo (combinado com espada curta, maça ou lança)
**Atributos primários:** Defesa, Vitalidade, Ataque

**Identidade narrativa:**
O Escudeiro não é um aprendiz — é alguém que entendeu que proteção é uma forma de ataque. O escudo em Arkandia não é apenas bloqueio: é arma, é declaração, é canal etéreo. Escudeiros podem usar o escudo para golpear, para criar barreiras etéricas, para redirecionar energia inimiga. São os mais difíceis de matar e, em mãos certas, os mais perigosos em batalhas prolongadas. Em Valoria são a espinha dorsal das legiões. Em Düren são os guardiões das execuções públicas. Em qualquer lugar, sua presença muda o ritmo do combate.

**Escalonamento:** foco em Defesa e Vitalidade. Ataque cresce para refletir que a melhor defesa frequentemente termina em contra-ataque devastador.

---

### MAGO
**Arma:** Cajado (catalisador etéreo bruto)
**Atributos primários:** Magia, Éter, Precisão

**Identidade narrativa:**
O Cajado é o catalisador mais antigo de Ellia — anterior às espadas, às lanças e às armaduras. É simplesmente o melhor condutor de Éter já criado: amplifica, foca e direciona a energia espiritual com precisão sem igual. O Mago não é "quem usa magia" — todo mundo usa. O Mago é quem escolheu o Éter como linguagem primária, quem estuda sua estrutura, quem o manipula em formas que outros mal percebem como possíveis. Em Serdin, Magos são arqueomagos em formação. Em Shenzhou, são filósofos do cosmos. Em Urgath, são oráculos que leem o tempo através do Éter.

**Escalonamento:** foco em Magia e Éter. Precisão cresce para refletir o controle técnico que separa um estudante de um arquimago.

---

## 4. Atributos

> Os atributos definem o desempenho mecânico do personagem em combate, expedições e sistemas de mundo.
> Valores iniciais são definidos pela Classe escolhida.
> Crescimento por nível é definido pelo escalonamento da Classe + bônus de Raça + pontos livres distribuídos pelo jogador.
> Fórmulas exatas de escalonamento pertencem ao GDD_Sistemas e ao /lib/game — aqui apenas a função de cada atributo.

---

| Atributo | Função |
|---|---|
| **Ataque** | Multiplicador primário para dano físico e habilidades baseadas em força bruta |
| **Magia** | Multiplicador primário para habilidades etéricas, curas e escudos |
| **Éter** | Recurso consumível para ativar habilidades. Regenera entre combates e via passivas |
| **Defesa** | Única mitigação de dano — física, mágica e elemental |
| **Vitalidade** | Determina HP máximo |
| **Velocidade** | Define iniciativa de turno e chance passiva de Esquiva |
| **Precisão** | Aumenta chance de aplicar Efeitos Negativos |
| **Tenacidade** | Aumenta chance de resistir a Efeitos Negativos |
| **Capitania** | Define limite numérico de tropas em sistemas de guerra |
| **Moral** | Modificador volátil que afeta rendimento de tropas em batalha |

### Atributos primários vs secundários por Classe

| Classe | Primários | Secundário de crescimento |
|---|---|---|
| Lanceiro | Ataque, Velocidade | Precisão |
| Espadachim | Ataque, Precisão | Tenacidade |
| Lutador | Ataque, Vitalidade | Tenacidade |
| Bardo | Magia, Éter | Precisão |
| Atirador | Precisão, Ataque | Velocidade |
| Arqueiro | Precisão, Ataque | Velocidade |
| Assassino | Ataque, Velocidade | Precisão |
| Druida | Ataque, Vitalidade | Magia |
| Destruidor | Ataque, Vitalidade | Defesa |
| Escudeiro | Defesa, Vitalidade | Ataque |
| Mago | Magia, Éter | Precisão |

---

## 5. Progressão de Level

### Estrutura de progressão

```
Nível 1–9    → Campanha Inicial da Expedição Régia
Nível 5      → Ressonância desperta (evento narrativo)
Nível 9→10   → Conclusão da campanha inicial
Nível 10+    → Jogo completo desbloqueado
```

### A cada nível o jogador recebe

1. **Escalonamento automático de atributos** — definido pela Classe (valores em seed SQL)
2. **Pontos livres de atributo** — quantidade pequena para distribuição estratégica pelo jogador (valor em seed SQL)
3. **Progressão na árvore de skills** — Essências acumuladas permitem adquirir novas skills

### Pontos livres — decisão estratégica

Os pontos livres são poucos por design — suficientes para personalizar, não suficientes para subverter o escalonamento da Classe. Um Mago que distribui pontos em Ataque durante anos terá um Ataque relevante... mas nunca superará um Espadachim dedicado. A Classe define o teto; os pontos livres definem os contornos dentro desse teto.

### Marcos de progressão

| Marco | Nível | O que acontece |
|---|---|---|
| Criação | 1 | Escolha de Raça e Classe. Skills iniciais: 1 ativa + 1 passiva |
| Ressonância | 5 | Evento narrativo revela o Arquétipo dominante. Éter máximo aumenta |
| Abertura total | 10 | Fim da campanha inicial. Sociedades, PvP, Maestrias, territórios |
| Maestrias | Após completar 8 skills | Acesso liberado ao sistema de Maestrias |

### Não existe

- Up de habilidade por nível — skills não têm "nível próprio"
- Reset de atributos — escolhas são permanentes (exceto via item especial de GM)
- Múltiplos personagens por conta — 1 conta = 1 personagem

---

## 6. A Ressonância

> A Ressonância não é escolhida — é revelada.
> No nível 5, durante a Campanha Inicial, um evento narrativo de alto estresse desperta o Arquétipo dominante na alma do personagem.
> Não há tela de seleção. Há uma cena.

### O que a Ressonância é

A Ressonância é o Arquétipo que sempre esteve lá, dormindo. Ela não muda quem o personagem é — ela revela quem o personagem sempre foi. Um Espadachim com Ressonância de Ruína não se torna um destruidor de mundos: ele passa a entender que cada golpe perfeito é também um fim. Cada Classe + Ressonância cria uma combinação única de identidade.

### O que a Ressonância confere mecanicamente

1. **Aumento de Éter máximo** — a intensidade do Arquétipo expande a capacidade etérica do personagem (valor em seed SQL)
2. **Acesso às Maestrias de Ressonância** — habilidades únicas vinculadas ao Arquétipo, adquiríveis com Essência
3. **Level de Ressonância** — upado com Essências. Cada nível expande o Éter máximo e desbloqueia Maestrias mais poderosas

### Level de Ressonância

O Level de Ressonância é uma progressão paralela ao level do personagem. Cresce exclusivamente via Essências — é uma escolha ativa do jogador, não automática.

**O que o Level de Ressonância afeta:**
- Éter máximo (cada nível expande — valor em seed SQL)
- Requisito de desbloqueio de Maestrias de Ressonância mais poderosas
- Requisito de desbloqueio de algumas Maestrias Lendárias

**Relação com Essências:**
Upar Ressonância e adquirir Skills/Maestrias usam o mesmo pool de Essências. Isso é intencional — cria decisão de prioridade estratégica: *invisto em expandir minha capacidade etérica ou em adquirir habilidades novas agora?*

### Os 12 Arquétipos como Ressonância

Cada Arquétipo tem passivas qualitativas únicas ao ser a Ressonância de um personagem. Os detalhes narrativos de cada Arquétipo estão no GDD_Mundo, seção 3. Aqui: o que muda mecanicamente ao ter cada Ressonância.

| Ressonância | Tendência mecânica | Maestrias típicas |
|---|---|---|
| Ordem | Controle de campo, selos, bloqueios | Barreiras absolutas, marcações, silêncio mágico |
| Caos | Instabilidade como arma, efeitos duplos | Mutações, probabilidade, colaterais |
| Tempo | Velocidade, cooldowns, presciência | Aceleração, congelamento de ação, ecos |
| Espaço | Teleporte, distância, posicionamento | Troca de posição, distorção, projeções |
| Matéria | Resistência, construção, transmutação | Armaduras vivas, construtos, moldagem |
| Vida | Regeneração, crescimento, veneno | Cura, flora ofensiva, biologia |
| Morte | Drenagem, fim de ciclos, espectros | Necrose, invocação, visão espiritual |
| Vontade | Limites quebrados, resistência | Imortalidade temporária, buffs internos |
| Sonho | Ilusão, criação, percepção | Duplicatas, distorção sensorial, criações |
| Guerra | Combate puro, técnica nomeada | Auras, técnicas ancestrais, armas etéricas |
| Vínculo | Fusão, transferência, pactos | Buffs compartilhados, juras mágicas |
| Ruína | Quebra, corrosão, anulação | Penetração, desfazer magias, colapso |

---

## 7. Sistema de Skills

### Estrutura da Árvore Básica de Classe

Todo personagem começa com **2 skills** desbloqueadas ao criar o personagem:
- 1 skill ativa
- 1 skill passiva

A árvore básica contém mais **6 skills** para adquirir via Essências:
- 4 skills ativas adicionais
- 2 skills passivas adicionais

**Total da árvore básica: 8 skills (5 ativas + 3 passivas)**

Ao adquirir todas as 8 skills da árvore básica, o sistema de **Maestrias é desbloqueado**.

### Skills não sobem de nível

Skills não têm nível próprio. Uma skill adquirida é a mesma do início ao fim — o que muda é o personagem que a usa. As fórmulas das skills usam atributos do personagem como variáveis: um mesmo golpe de Espadachim tem impacto completamente diferente com 50 de Ataque versus 200 de Ataque.

Isso significa que:
- Não existe "skill fraca que você abandona depois"
- Cada skill tem seu papel estratégico independente do level
- A Building (seleção de skills equipadas) sempre importa

### Tipos de skill

| Tipo | Descrição |
|---|---|
| **Ativa** | Acionada pelo jogador. Consome Éter. Tem cooldown em turnos |
| **Passiva** | Sempre ativa quando equipada no slot. Sem custo de Éter |
| **Reativa** | Ativa automaticamente sob condição específica (ex: ao receber dano crítico) |

### Skills de Equipamentos Especiais

Armas craftadas especiais (ex: Balmung, espadas lendárias) podem conceder **1 skill ativa exclusiva**. Essa skill:
- Só pode ser equipada na Building se o personagem estiver usando o equipamento que a concede
- Entra no mesmo pool de 6 slots de Building
- Não é aprendida permanentemente — existe enquanto o equipamento está equipado

---

## 8. Building — Slots de Skills

### Limite de slots

O personagem pode ter **no máximo 6 skills equipadas simultaneamente** — entre ativas, passivas e reativas.

Esse limite é universal e permanente. Não aumenta com level. Não é afetado por raça ou classe.

**O limite de 6 vale para:**
- Skills da árvore básica de Classe
- Skills de Maestrias adquiridas
- Skills concedidas por equipamentos especiais

### Por que 6 slots

O limite de 6 existe para forçar decisão estratégica. Um personagem com 20 skills adquiridas (entre árvore básica e maestrias) precisa escolher quais 6 levar para cada situação. Isso cria:
- **Builds diferentes para PvP vs PvE**
- **Builds diferentes por tipo de inimigo**
- **Identidade de combate** — dois Espadachins com as mesmas skills podem ter Buildings completamente diferentes

### Regras de Building

- Passivas equipadas ocupam slot — não são "sempre ativas"
- Skills de equipamentos especiais ocupam slot e só ficam disponíveis com o equipamento
- Não existe custo para trocar a Building fora de combate
- Durante combate, a Building é fixa

---

## 9. Maestrias

> Maestrias são o sistema mais denso e especial de Arkandia.
> São desbloqueadas após o personagem adquirir todas as 8 skills da árvore básica de Classe.
> Representam o que o personagem se torna além da sua Classe — especializações, poderes únicos, transformações.
> São permanentes após adquiridas.
> Um personagem pode ter múltiplas Maestrias — o limite é a Building (6 slots).

### As três categorias de Maestria

---

#### CATEGORIA 1 — MAESTRIAS DE CLASSE DE PRESTÍGIO

**O que são:**
Packs temáticos de subclasse. Especializam o personagem dentro da sua Classe em uma direção narrativa e mecânica específica. Um Espadachim pode se tornar um Duelista de Ogygia, um Lâmina do Código de Ryugakure ou um Cavaleiro de Valoria — cada um com seu pack de skills próprio.

**Estrutura de um pack:**
- 1 a 3 skills (ativas ou passivas)
- Temática narrativa coesa
- Nome próprio com sotaque do mundo

**Como adquirir:**
- Requer **Pergaminho da Classe de Prestígio** (item obtido via drop, crafting ou comércio)
- Requer **Essências** (custo definido em seed SQL)
- Pode ter restrição de Classe específica
- Pode ter restrição de level mínimo do personagem

**Exemplos de restrição:**
- "Requer Classe: Espadachim"
- "Requer Level 20"
- "Requer Classe: Lanceiro ou Escudeiro" (maestrias que fazem sentido para ambos)

**Quantidade:** ilimitada por design — novas Classes de Prestígio podem ser adicionadas continuamente como conteúdo

---

#### CATEGORIA 2 — MAESTRIAS DE RESSONÂNCIA

**O que são:**
Habilidades únicas vinculadas ao Arquétipo do personagem. Enquanto Classes de Prestígio especializam o *como você luta*, Maestrias de Ressonância especializam o *o que você é espiritualmente*. Frequentemente são skills únicas em vez de packs.

**Estrutura:**
- 1 skill (às vezes 2) de natureza arquetípica
- Ligadas ao Arquétipo de Ressonância do personagem
- Narrativamente: representam um domínio crescente sobre o Arquétipo dormia na alma

**Como adquirir:**
- Requer **Essências** (custo definido em seed SQL)
- Restrição obrigatória: Ressonância específica
- Restrição de level de Ressonância (ex: "Requer Ressonância nível 3")
- Pode ter restrição adicional de level do personagem

**Relação com Essências:**
Como Maestrias de Ressonância e o up de Ressonância usam o mesmo pool de Essências, o jogador enfrenta decisão constante: *aprofundo minha Ressonância para desbloquear maestrias maiores, ou adquiro as maestrias disponíveis agora?*

**Exemplos de natureza:**
- Ressonância de Ruína: "Toque do Fim" — passiva que aplica corrosão etérica em cada golpe
- Ressonância de Sonho: "Eco do Irreal" — ativa que cria duplicata ilusória durante X turnos
- Ressonância de Guerra: "Ethos do Conflito" — passiva que aumenta dano conforme o combate se prolonga

---

#### CATEGORIA 3 — MAESTRIAS LENDÁRIAS

**O que são:**
O conteúdo mais exclusivo e narrativamente denso do sistema. Maestrias Lendárias são **esgotáveis** — uma vez que um personagem adquire, ninguém mais pode. São sazonais: aparecem em catálogos por tempo limitado, esgotam e não retornam (ou retornam raramente em eventos especiais).

**Estrutura:**
- Podem ser 1 skill única ou packs de 2–3 skills
- Sempre com nome próprio narrativamente carregado
- Profundamente temáticas — cada Lendária conta uma história só de existir

**Como adquirir:**
- Requer **Gemas** (moeda premium)
- Podem ter restrições de level do personagem
- Podem ter restrições de level de Ressonância
- **Esgotamento:** ao ser adquirida por um jogador, remove-se do catálogo permanentemente

**Elemento de gacha:**
O catálogo de Lendárias disponíveis em cada temporada não é fixo — funciona como um sistema de gacha. O jogador pode gastar Gemas para tentar obter uma Lendária específica ou "girar" o catálogo disponível. Receber o pack não significa que todas as skills estão imediatamente usáveis — podem ter exigências de nível de Ressonância que o jogador ainda não atingiu.

**Três origens temáticas dentro de Lendárias** *(flavors de catálogo, não categorias técnicas)*:

**Bestial**
Packs ligados a criaturas de Ellia. O personagem incorpora aspectos de um ser específico — não se transforma, mas manifesta capacidades daquele ser. Inspiração: Zoan de One Piece. Exemplos de tema: Dragão de Shykaeon, Lobo de Fenrir, Kraken das Profundezas.

**Mítica**
Packs ligados a heróis, deuses e figuras lendárias do lore de Arkandia. O personagem manifesta um fragmento do eco etéreo daquele ser. Inspiração: sistema de Nobres Fantasmas de Fate. Exemplos de tema: Eco de Liesel Heckmann, Sombra de Animus Liber, Voz de Orion.

**Singular**
Skills únicas que não se encaixam em categoria temática — fenômenos etéreos raros, técnicas extintas, manifestações de eventos históricos. Exemplos de tema: Último Fôlego do Ciclo Perdido, Fragmento de Khaos, Resíduo da Guerra Fraturada.

**Nota de design sobre Lendárias:**
O caráter esgotável das Lendárias cria exclusividade real — não cosmética. Um jogador com "Eco de Liesel Heckmann" é o único no servidor com aquela habilidade. Isso tem peso narrativo e competitivo simultaneamente.

---

### Matriz de restrições de Maestrias

| Tipo | Moeda | Itens | Restrição Classe | Restrição Ressonância | Esgotável |
|---|---|---|---|---|---|
| Prestígio | Essência | Pergaminho | Sim (frequente) | Não | Não |
| Ressonância | Essência | Não | Não | Sim (obrigatório) | Não |
| Lendária | Gema | Não | Eventual | Eventual | **Sim** |

---

## 10. Moedas do Personagem

> Três moedas distintas, três funções distintas.
> Não são intercambiáveis entre si.

---

### LIBRA
**Natureza:** Moeda de comércio e economia do mundo
**Usos:** Mercado entre jogadores, compra de equipamentos, serviços de NPC, impostos de território, comércio geral
**Obtenção:** Missões, expedições, saques, produção passiva de territórios, comércio
**Negociável:** Sim — pode ser transferida entre jogadores
**Nota:** A Libra é a espinha dorsal da economia player-driven. Tudo que tem valor econômico no mundo passa por ela

---

### ESSÊNCIA
**Natureza:** Moeda de evolução espiritual do personagem
**Usos:** Adquirir skills da árvore básica, upar Level de Ressonância, adquirir Maestrias de Prestígio, adquirir Maestrias de Ressonância
**Obtenção:** Missões, expedições, conquistas de progressão, eventos especiais
**Negociável:** Não — vinculada ao personagem, intransferível
**Decisão central:** Essência é recurso compartilhado entre upar Ressonância e adquirir skills/maestrias — cria priorização estratégica

---

### GEMA
**Natureza:** Moeda premium (paga)
**Usos:** Maestrias Lendárias, itens de cash shop, acelerações, cosméticos exclusivos
**Obtenção:** Compra real via cash shop (integração PIX)
**Negociável:** Não — vinculada à conta, intransferível
**Nota:** Gemas não compram poder direto de atributo — compram conteúdo exclusivo (Lendárias) e conveniência

---

## 11. Crafting e Equipamentos

### Filosofia do crafting

O crafting de Arkandia é direto: **se você tem os materiais, você crafta**. Não há aleatoridade no processo de crafting em si. A aleatoridade está na obtenção dos materiais — o que cria a tensão de progressão sem frustração arbitrária no ato de criar.

### Tipos de equipamento

**Equipamentos comuns**
Craftados com materiais básicos. Sem skills vinculadas. Melhoram atributos de forma direta.

**Equipamentos especiais (armas lendárias)**
Craftados com materiais raros. Concedem 1 skill ativa exclusiva que só pode ser equipada na Building enquanto o equipamento estiver em uso. A skill não é aprendida — ela existe no equipamento. Exemplos: Balmung, Gáe Bolg, Tyrfing.

**Armaduras e acessórios**
Modificam atributos e podem ter passivas fixas. Não concedem skills ativas.

### Obtenção de materiais — as fontes

| Fonte | Método | Aleatoridade |
|---|---|---|
| Monstros em missões | Drop ao derrotar | Sim — chance de drop por item |
| Expedições | Loot ao completar | Sim — tabela de loot por expedição |
| Territórios controlados | Produção passiva | Parcial — tipo de material é fixo, quantidade varia |
| Sistema de Summon | Gacha dedicado | Sim — catálogo rotativo |

### Sistema de Summon

O Summon é o principal sistema de gacha de Arkandia para obtenção de materiais e equipamentos. Funciona como catálogo rotativo com probabilidades definidas. Pode entregar:
- Materiais de crafting (comuns a raros)
- Equipamentos completos
- Libras
- Essências
- Itens especiais de temporada

**Moeda de Summon:** Gemas (premium) ou tickets especiais obtidos em eventos
**Detalhes de probabilidades e catálogos:** escopo do GDD_Sistemas e do time de monetização

---

## 12. Ficha do Personagem

### Dados públicos
Visíveis para qualquer jogador ao inspecionar o personagem:

| Campo | Descrição |
|---|---|
| Nome | Nome do personagem |
| Raça | Raça escolhida na criação |
| Classe | Classe escolhida na criação |
| Level | Nível atual |
| Ressonância | Arquétipo (visível após despertar no nível 5) |
| Sociedade | Sociedade atual (se membro) |
| Título | Título ativo (se tiver) |
| Status de Vida | Ativo / Consequências ativas |

### Dados privados
Visíveis apenas para o próprio jogador:

| Campo | Descrição |
|---|---|
| Atributos exatos | Todos os 10 atributos com valores numéricos |
| HP atual / HP máximo | Estado de saúde |
| Éter atual / Éter máximo | Estado de recurso |
| Skills adquiridas | Lista completa de skills (não apenas as equipadas) |
| Building atual | 6 slots equipados |
| Maestrias adquiridas | Lista completa |
| Tropas | Quantidade e tipo (reveladas apenas em batalha) |
| Reputação de facções | Valores exatos por facção |
| Essências disponíveis | Saldo atual |
| Libras | Saldo atual |
| Gemas | Saldo atual |

### Dados visíveis apenas para o GM
O GM tem acesso a tudo da ficha privada + logs de ações + histórico de eventos do personagem.

### Reputação na ficha
A reputação aparece na ficha privada como lista de facções com estágio atual (Hostil / Neutro / Reconhecido / Aliado / Venerado). A Suserania Negra aparece na ficha privada do jogador — mas não no painel público. O Conselho dos Anciões tem acesso a essa informação narrativamente.

### Histórico narrativo
Todo personagem tem um log de eventos significativos — gerado automaticamente pelas ações do jogador e complementado por entradas narrativas do GM. Visível apenas para o próprio jogador e GM.

---

## 13. Diretrizes para IA e Implementação

### Para geração de conteúdo narrativo

**Ao descrever um personagem, considere sempre:**
1. Raça — quais traços físicos e culturais são visíveis?
2. Classe — como ele se move, como segura sua arma, qual é sua postura de combate?
3. Ressonância — há alguma manifestação sutil do Arquétipo no comportamento?
4. Maestrias — se relevante, alguma Maestria Lendária ou de Prestígio define algo visível?

**Combinações que criam identidades fortes:**
- Draconiano + Espadachim + Ressonância de Guerra = o guerreiro que carrega o peso de uma linhagem apagada em cada golpe
- Melfork + Bardo + Ressonância de Sonho = o músico que dobra a realidade com frequências do fundo do mar
- Anão + Destruidor + Ressonância de Matéria = o forjador que descobriu que destruir também é criar

### Para arquitetura técnica

**Localização da lógica de jogo:**
- Fórmulas de escalonamento de atributos → `/lib/game/attributes.ts`
- Lógica de aquisição de skills e maestrias → `/lib/game/skills.ts`
- Validação de restrições de Maestria → `/lib/game/maestrias.ts`
- Lógica de Ressonância e level → `/lib/game/resonance.ts`
- Building e slots → `/lib/game/building.ts`

**Tabelas do banco (a criar/refatorar):**
- `races` — raças com bônus passivos
- `classes` — classes com atributos iniciais e escalonamento
- `skills` — skills com tipo, fórmula, custo, cooldown
- `character_skills` — skills adquiridas por personagem
- `character_building` — 6 slots equipados por personagem
- `maestrias` — maestrias com categoria, restrições, esgotamento
- `character_maestrias` — maestrias adquiridas por personagem
- `resonance_levels` — level de ressonância por personagem

**Regras de implementação invioláveis:**
- Máximo de 6 skills equipadas — validado no servidor, nunca apenas no cliente
- Esgotamento de Maestrias Lendárias — transaction atômica ao adquirir
- Essência é intransferível — sem endpoint de transferência entre personagens
- Gema é intransferível — sem endpoint de transferência entre personagens
- Skills de equipamentos especiais — desaparecem da Building ao desequipar o item

### Termos canônicos — usar sempre

| Termo correto | Errado / Evitar |
|---|---|
| Ressonância | Classe mágica, afinidade mágica, magia |
| Éter | Mana, MP, energia mágica genérica |
| Maestria | Talent, habilidade especial, poder |
| Árvore básica de Classe | Skill tree, árvore de habilidades |
| Building | Deck, loadout, set de skills |
| Essência | XP de skill, ponto de habilidade |
| Gema | Cristal, moeda premium genérica |
| Libra | Gold, moeda de jogo genérica |
| Classes de Prestígio | Prestige class, subclasse |
| Maestrias Lendárias | Ultra rares, God skills |

---

*Fim do GDD_Personagem v1.0*
*Documentos relacionados: GDD_Mundo.md | GDD_Sistemas.md | GDD_Narrativa.md*
