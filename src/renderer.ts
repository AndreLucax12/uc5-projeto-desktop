import './style.css'
import type { clientes, equipamentos, ordens_de_servico } from './types'
declare global {
  interface Window {
    api: {
      ping: () => Promise<string>
      clientes: {
        listar: () => Promise<clientes[]>
        criar: (cliente: Omit<clientes, 'id'>) => Promise<clientes>
      }
      equipamentos: {
        listarPorCliente: (idCliente: number) => Promise<equipamentos[]>
      }
      os: {
        criar: (os: Omit<ordens_de_servico, 'id'|'status'|'valor_total'>) => Promise<ordens_de_servico>
        atualizarStatus: (id: number, status: string) => Promise<ordens_de_servico>
        relatorioFaturamento: () => Promise<{ total: number }>
      }
    }
  }
}

const appElement = document.getElementById('app') as HTMLDivElement
appElement.innerHTML = `<h1>TechOS - Gerenciamento de Assistência Técnica</h1>`

export {}
window.api.clientes.listar().then((r) => console.log('Clientes:', r))
