// Tipos compartilhados — seguros para Client Components
// Zero imports de @/lib/supabase/*, next/*, ou lib/game/*

export type TroopType = 'infantaria' | 'arquearia' | 'cavalaria' | 'cerco'

export interface TroopDeployment {
  infantaria?: number
  arquearia?: number
  cavalaria?: number
  cerco?: number
}
