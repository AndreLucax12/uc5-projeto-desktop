import { contextBridge, ipcRenderer } from 'electron'
import type { clientes, equipamentos, ordens_de_servico, marca_suportada } from './types'

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('canal-ping'),
  clientes: {
    listar: (): Promise<clientes[]> => ipcRenderer.invoke('clientes:listar'),
    criar: (cliente: Omit<clientes, 'id'>): Promise<clientes> =>
      ipcRenderer.invoke('clientes:criar', cliente),
    atualizar: (id: number, cliente: Omit<clientes, 'id'>): Promise<clientes> =>
      ipcRenderer.invoke('clientes:atualizar', id, cliente),
    excluir: (id: number): Promise<{ sucesso: boolean }> =>
      ipcRenderer.invoke('clientes:excluir', id),
  },
  equipamentos: {
    listar: (): Promise<equipamentos[]> => ipcRenderer.invoke('equipamentos:listar'),
    listarPorCliente: (idCliente: number): Promise<equipamentos[]> =>
      ipcRenderer.invoke('equipamentos:listar-por-cliente', idCliente),
    criar: (equipamento: Omit<equipamentos, 'id'>): Promise<equipamentos> =>
      ipcRenderer.invoke('equipamentos:criar', equipamento),
    atualizar: (id: number, equipamento: Omit<equipamentos, 'id' | 'id_cliente'>): Promise<equipamentos> =>
      ipcRenderer.invoke('equipamentos:atualizar', id, equipamento),
    excluir: (id: number): Promise<{ sucesso: boolean }> =>
      ipcRenderer.invoke('equipamentos:excluir', id),
    listarMarcasSuportadas: (): Promise<marca_suportada[]> =>
      ipcRenderer.invoke('equipamentos:listar-marcas-suportadas'),
  },
  os: {
    listar: (): Promise<ordens_de_servico[]> => ipcRenderer.invoke('os:listar'),
    criar: (
      os: Omit<ordens_de_servico, 'id' | 'status' | 'valor_total'>,
    ): Promise<ordens_de_servico> => ipcRenderer.invoke('os:criar', os),
    atualizarStatus: (
      id: number,
      status: ordens_de_servico['status'],
      valorTotal?: number,
    ): Promise<ordens_de_servico> =>
      ipcRenderer.invoke('os:atualizar-status', id, status, valorTotal),
    excluir: (id: number): Promise<{ sucesso: boolean }> =>
      ipcRenderer.invoke('os:excluir', id),
    relatorioFaturamento: (): Promise<{ total: number }> =>
      ipcRenderer.invoke('os:relatorio-faturamento'),
  },
})
