import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'

const AUCTION_FEE_PERCENT = 5 // 5% de taxa sobre venda em leilão

// ─── INVENTÁRIO ────────────────────────────────────────────────

/**
 * Adiciona item ao inventário de um personagem.
 * Upsert — soma quantidade se já existir.
 */
export async function addToInventory(
  characterId: string,
  itemId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('inventory')
    .select('id, quantity')
    .eq('character_id', characterId)
    .eq('item_id', itemId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('inventory')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('inventory')
      .insert({ character_id: characterId, item_id: itemId, quantity })
  }

  return { success: true }
}

/**
 * Remove item do inventário. Falha se quantidade insuficiente.
 */
export async function removeFromInventory(
  characterId: string,
  itemId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('inventory')
    .select('id, quantity')
    .eq('character_id', characterId)
    .eq('item_id', itemId)
    .maybeSingle()

  if (!existing || existing.quantity < quantity) {
    return { success: false, error: 'Quantidade insuficiente no inventário.' }
  }

  if (existing.quantity === quantity) {
    await supabase.from('inventory').delete().eq('id', existing.id)
  } else {
    await supabase
      .from('inventory')
      .update({ quantity: existing.quantity - quantity })
      .eq('id', existing.id)
  }

  return { success: true }
}

/**
 * Retorna inventário completo de um personagem.
 */
export async function getInventory(characterId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inventory')
    .select('*, items(id, name, description, item_type, rarity, is_tradeable)')
    .eq('character_id', characterId)
  return data ?? []
}

// ─── BAZAAR ─────────────────────────────────────────────────────

/**
 * Cria listagem no Bazaar.
 * Remove item do inventário do vendedor imediatamente.
 */
export async function createListing(
  sellerId: string,
  userId: string,
  itemId: string,
  quantity: number,
  priceLibras: number
): Promise<{ success: boolean; error?: string; listingId?: string }> {
  const supabase = await createClient()

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', sellerId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Verifica que item é negociável
  const { data: item } = await supabase
    .from('items')
    .select('id, is_tradeable')
    .eq('id', itemId)
    .single()
  if (!item?.is_tradeable) {
    return { success: false, error: 'Este item não pode ser negociado.' }
  }

  // Remove do inventário
  const removed = await removeFromInventory(sellerId, itemId, quantity)
  if (!removed.success) return removed

  // Cria listagem
  const { data: listing, error } = await supabase
    .from('market_listings')
    .insert({
      seller_id: sellerId,
      item_id: itemId,
      quantity,
      price_libras: priceLibras,
      status: 'active',
    })
    .select()
    .single()

  if (error || !listing) {
    // Devolve item ao inventário em caso de erro
    await addToInventory(sellerId, itemId, quantity)
    return { success: false, error: 'Erro ao criar listagem.' }
  }

  return { success: true, listingId: listing.id }
}

/**
 * Compra item no Bazaar.
 * Transfere Libras do comprador ao vendedor.
 * Adiciona item ao inventário do comprador.
 */
export async function buyListing(
  listingId: string,
  buyerId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica ownership do comprador
  const { data: buyer } = await supabase
    .from('characters')
    .select('id')
    .eq('id', buyerId)
    .eq('user_id', userId)
    .single()
  if (!buyer) return { success: false, error: 'Personagem não encontrado.' }

  // Busca listagem ativa
  const { data: listing } = await supabase
    .from('market_listings')
    .select('*')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()
  if (!listing) return { success: false, error: 'Listagem não encontrada.' }

  // Não pode comprar de si mesmo
  if (listing.seller_id === buyerId) {
    return { success: false, error: 'Você não pode comprar seu próprio item.' }
  }

  // Verifica Libras do comprador
  const { data: buyerWallet } = await supabase
    .from('character_wallet')
    .select('libras')
    .eq('character_id', buyerId)
    .single()
  if (!buyerWallet || buyerWallet.libras < listing.price_libras) {
    return { success: false, error: 'Libras insuficientes.' }
  }

  // Debita comprador
  await supabase
    .from('character_wallet')
    .update({ libras: buyerWallet.libras - listing.price_libras })
    .eq('character_id', buyerId)

  // Credita vendedor
  const { data: sellerWallet } = await supabase
    .from('character_wallet')
    .select('libras')
    .eq('character_id', listing.seller_id)
    .single()
  if (sellerWallet) {
    await supabase
      .from('character_wallet')
      .update({ libras: sellerWallet.libras + listing.price_libras })
      .eq('character_id', listing.seller_id)
  }

  // Marca listagem como vendida
  await supabase
    .from('market_listings')
    .update({ status: 'sold', sold_at: new Date().toISOString() })
    .eq('id', listingId)

  // Adiciona item ao inventário do comprador
  await addToInventory(buyerId, listing.item_id, listing.quantity)

  await createEvent(supabase, {
    type: 'item_sold',
    actorId: buyerId,
    targetId: listing.seller_id,
    metadata: {
      listing_id: listingId,
      item_id: listing.item_id,
      quantity: listing.quantity,
      price: listing.price_libras,
    },
    isPublic: false,
    narrativeText: `Transação no Bazaar: ${listing.quantity}x item por ${listing.price_libras} Libras.`,
  })

  const { updateWeeklyProgress } = await import('./weekly')
  await updateWeeklyProgress(buyerId, 'bazaar_trades').catch(() => {})

  return { success: true }
}

/**
 * Cancela listagem no Bazaar. Devolve item ao vendedor.
 */
export async function cancelListing(
  listingId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('market_listings')
    .select('*')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()
  if (!listing) return { success: false, error: 'Listagem não encontrada.' }

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', listing.seller_id)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  await supabase
    .from('market_listings')
    .update({ status: 'cancelled' })
    .eq('id', listingId)

  // Devolve item
  await addToInventory(listing.seller_id, listing.item_id, listing.quantity)

  return { success: true }
}

// ─── LEILÃO ─────────────────────────────────────────────────────

/**
 * Cria leilão.
 * Remove item do inventário do vendedor imediatamente.
 */
export async function createAuction(
  sellerId: string,
  userId: string,
  itemId: string,
  quantity: number,
  startingPrice: number,
  durationHours: number
): Promise<{ success: boolean; error?: string; auctionId?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', sellerId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: item } = await supabase
    .from('items')
    .select('id, is_tradeable')
    .eq('id', itemId)
    .single()
  if (!item?.is_tradeable) {
    return { success: false, error: 'Este item não pode ser negociado.' }
  }

  const removed = await removeFromInventory(sellerId, itemId, quantity)
  if (!removed.success) return removed

  const endsAt = new Date()
  endsAt.setHours(endsAt.getHours() + durationHours)

  const { data: auction, error } = await supabase
    .from('auction_listings')
    .insert({
      seller_id: sellerId,
      item_id: itemId,
      quantity,
      starting_price: startingPrice,
      current_bid: 0,
      ends_at: endsAt.toISOString(),
      status: 'active',
    })
    .select()
    .single()

  if (error || !auction) {
    await addToInventory(sellerId, itemId, quantity)
    return { success: false, error: 'Erro ao criar leilão.' }
  }

  return { success: true, auctionId: auction.id }
}

/**
 * Dá lance em um leilão.
 * Lance mínimo: current_bid + 1 ou starting_price.
 */
export async function placeBid(
  auctionId: string,
  bidderId: string,
  userId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: bidder } = await supabase
    .from('characters')
    .select('id')
    .eq('id', bidderId)
    .eq('user_id', userId)
    .single()
  if (!bidder) return { success: false, error: 'Personagem não encontrado.' }

  const { data: auction } = await supabase
    .from('auction_listings')
    .select('*')
    .eq('id', auctionId)
    .eq('status', 'active')
    .single()
  if (!auction) return { success: false, error: 'Leilão não encontrado.' }

  // Verifica se encerrou
  if (new Date(auction.ends_at) <= new Date()) {
    return { success: false, error: 'Este leilão já encerrou.' }
  }

  // Não pode dar lance em próprio leilão
  if (auction.seller_id === bidderId) {
    return { success: false, error: 'Você não pode dar lance no seu próprio leilão.' }
  }

  // Lance mínimo
  const minBid = auction.current_bid > 0
    ? auction.current_bid + 1
    : auction.starting_price
  if (amount < minBid) {
    return { success: false, error: `Lance mínimo: ${minBid} Libras.` }
  }

  // Verifica Libras
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('libras')
    .eq('character_id', bidderId)
    .single()
  if (!wallet || wallet.libras < amount) {
    return { success: false, error: 'Libras insuficientes.' }
  }

  // Devolve lance anterior ao antigo líder
  if (auction.current_bidder && auction.current_bid > 0) {
    const { data: prevWallet } = await supabase
      .from('character_wallet')
      .select('libras')
      .eq('character_id', auction.current_bidder)
      .single()
    if (prevWallet) {
      await supabase
        .from('character_wallet')
        .update({ libras: prevWallet.libras + auction.current_bid })
        .eq('character_id', auction.current_bidder)
    }
  }

  // Reserva Libras do novo líder
  await supabase
    .from('character_wallet')
    .update({ libras: wallet.libras - amount })
    .eq('character_id', bidderId)

  // Atualiza leilão
  await supabase
    .from('auction_listings')
    .update({ current_bid: amount, current_bidder: bidderId })
    .eq('id', auctionId)

  // Registra lance
  await supabase
    .from('auction_bids')
    .insert({ auction_id: auctionId, bidder_id: bidderId, amount })

  return { success: true }
}

/**
 * Finaliza leilão encerrado.
 * Aplica taxa de 5% ao vendedor.
 * Entrega item ao vencedor.
 */
export async function finalizeAuction(
  auctionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: auction } = await supabase
    .from('auction_listings')
    .select('*')
    .eq('id', auctionId)
    .eq('status', 'active')
    .single()
  if (!auction) return { success: false, error: 'Leilão não encontrado.' }

  if (new Date(auction.ends_at) > new Date()) {
    return { success: false, error: 'Leilão ainda não encerrou.' }
  }

  if (auction.current_bidder && auction.current_bid > 0) {
    // Há vencedor — aplica taxa e paga vendedor
    const fee = Math.floor(auction.current_bid * (AUCTION_FEE_PERCENT / 100))
    const sellerReceives = auction.current_bid - fee

    const { data: sellerWallet } = await supabase
      .from('character_wallet')
      .select('libras')
      .eq('character_id', auction.seller_id)
      .single()
    if (sellerWallet) {
      await supabase
        .from('character_wallet')
        .update({ libras: sellerWallet.libras + sellerReceives })
        .eq('character_id', auction.seller_id)
    }

    // Entrega item ao vencedor
    await addToInventory(auction.current_bidder, auction.item_id, auction.quantity)

    await createEvent(supabase, {
      type: 'auction_finished',
      actorId: auction.current_bidder,
      targetId: auction.seller_id,
      metadata: {
        auction_id: auctionId,
        item_id: auction.item_id,
        final_bid: auction.current_bid,
        fee,
        seller_receives: sellerReceives,
      },
      isPublic: false,
      narrativeText: `Leilão encerrado: item vendido por ${auction.current_bid} Libras (taxa: ${fee}).`,
    })
  } else {
    // Sem lances — devolve item ao vendedor
    await addToInventory(auction.seller_id, auction.item_id, auction.quantity)
  }

  await supabase
    .from('auction_listings')
    .update({ status: 'finished' })
    .eq('id', auctionId)

  return { success: true }
}

// ─── CRAFTING ────────────────────────────────────────────────────

/**
 * Crafta um item usando uma receita.
 * Direto: se tem materiais, crafta. Sem aleatoriedade.
 * Referência: GDD_Personagem §11
 */
export async function craftItem(
  characterId: string,
  userId: string,
  recipeId: string
): Promise<{ success: boolean; error?: string; resultItemId?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id, level')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Busca receita
  const { data: recipe } = await supabase
    .from('crafting_recipes')
    .select('*')
    .eq('id', recipeId)
    .eq('is_active', true)
    .single()
  if (!recipe) return { success: false, error: 'Receita não encontrada.' }

  // Verifica nível mínimo
  if (character.level < (recipe.required_level ?? 1)) {
    return {
      success: false,
      error: `Nível ${recipe.required_level} necessário para esta receita.`,
    }
  }

  // Verifica ingredientes
  const ingredients = recipe.ingredients as Array<{ item_id: string; quantity: number }>
  for (const ingredient of ingredients) {
    const { data: invItem } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('character_id', characterId)
      .eq('item_id', ingredient.item_id)
      .maybeSingle()

    if (!invItem || invItem.quantity < ingredient.quantity) {
      const { data: itemData } = await supabase
        .from('items')
        .select('name')
        .eq('id', ingredient.item_id)
        .single()
      return {
        success: false,
        error: `Material insuficiente: ${itemData?.name ?? 'item desconhecido'}.`,
      }
    }
  }

  // Verifica e debita custo em Libras
  const craftingCost = ((recipe as unknown as Record<string, unknown>).crafting_cost as number) ?? 0
  if (craftingCost > 0) {
    const { data: wallet } = await supabase
      .from('character_wallet')
      .select('libras')
      .eq('character_id', characterId)
      .single()

    if (!wallet || wallet.libras < craftingCost) {
      return {
        success: false,
        error: `Libras insuficientes. Necessário: ${craftingCost}.`,
      }
    }

    await supabase
      .from('character_wallet')
      .update({ libras: wallet.libras - craftingCost })
      .eq('character_id', characterId)
  }

  // Consome ingredientes
  for (const ingredient of ingredients) {
    await removeFromInventory(characterId, ingredient.item_id, ingredient.quantity)
  }

  // Adiciona resultado ao inventário
  await addToInventory(characterId, recipe.result_item_id, recipe.result_quantity ?? 1)

  await createEvent(supabase, {
    type: 'item_crafted',
    actorId: characterId,
    metadata: {
      recipe_id: recipeId,
      result_item_id: recipe.result_item_id,
      quantity: recipe.result_quantity,
    },
    isPublic: false,
    narrativeText: `Item craftado: ${recipe.name}.`,
  })

  // Completa daily task de crafting
  const { completeTask } = await import('@/lib/game/daily')
  await completeTask(characterId, 'craft_item').catch(() => {})

  return { success: true, resultItemId: recipe.result_item_id }
}
