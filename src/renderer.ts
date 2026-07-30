import './style.css'

declare global {
  interface Window {
    api: {
      ping: () => Promise<string>
      clientes: {
        listar: () => Promise<any[]>
        criar: (cliente: any) => Promise<any>
      }
      equipamentos: {
        listarPorCliente: (idCliente: number) => Promise<any[]>
      }
      os: {
        criar: (os: any) => Promise<any>
        atualizarStatus: (id: number, status: string) => Promise<any>
        relatorioFaturamento: () => Promise<{ total: number }>
      }
    }
  }
}

const appElement = document.getElementById('app') as HTMLDivElement
appElement.innerHTML = `<h1>Gerenciador de Ordens de Serviço</h1>`

export {}
window.api.clientes.listar().then((r) => console.log('Clientes:', r))
