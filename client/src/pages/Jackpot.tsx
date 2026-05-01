import { Dices } from 'lucide-react'
import { Layout } from '../components/layout/Layout'

export function Jackpot() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground">
        <Dices size={40} strokeWidth={1.5} />
        <p className="text-sm">Jackpot — kommt bald</p>
      </div>
    </Layout>
  )
}
