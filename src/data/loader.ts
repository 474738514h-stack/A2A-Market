import buyer from '@config/prompts/buyer.json'
import seller from '@config/prompts/seller.json'
import messageSchema from '@config/schemas/message.schema.json'
import toolsSchema from '@config/schemas/tools.schema.json'
import booksFile from '@mock/books.json'
import sellersFile from '@mock/sellers.json'
import presetsFile from '@mock/demo-presets.json'
import type { Book, BuyerPrompt, EngineContext, Seller, SellerPrompt } from '../engine/types'

export const IS_DEMO_DATA = true

export const engineContext: EngineContext = {
  buyer: buyer as unknown as BuyerPrompt,
  seller: seller as unknown as SellerPrompt,
  books: booksFile.books as unknown as Book[],
  sellers: sellersFile.sellers as unknown as Seller[],
  messageSchema: messageSchema as Record<string, unknown>,
  toolsSchema: toolsSchema as unknown as EngineContext['toolsSchema'],
}

export interface DemoPreset {
  id: string
  label: string
  text: string
  expected: string
}

export const presets: DemoPreset[] = presetsFile.presets
export const exceptionPresets: DemoPreset[] = presetsFile.exceptionPresets

export const dataVersions = {
  books: booksFile.version,
  sellers: sellersFile.version,
  presets: presetsFile.version,
}

export function bookById(id: string | null): Book | undefined {
  return engineContext.books.find((b) => b.id === id)
}
