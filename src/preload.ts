import { contextBridge, ipcRenderer } from 'electron'
import type { clientes, equipamentos, ordens_de_servico } from './types'

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('canal-ping'),
  clientes: {
    listar: (): Promise<clientes[]> => ipcRenderer.invoke('clientes:listar'),
    criar: (cliente: Omit<clientes, 'id'>): Promise<clientes> => ipcRenderer.invoke('clientes:criar', cliente),
  },
  equipamentos: {
    listarPorCliente: (idCliente: number): Promise<equipamentos[]> => ipcRenderer.invoke('equipamentos:listar-por-cliente', idCliente),
  },
  os: {
    criar: (os: Omit<ordens_de_servico, 'id'|'status'|'valor_total'>): Promise<ordens_de_servico> => ipcRenderer.invoke('os:criar', os),
    atualizarStatus: (id: number, status: string): Promise<ordens_de_servico> => ipcRenderer.invoke('os:atualizar-status', id, status),
    relatorioFaturamento: (): Promise<{ total: number }> => ipcRenderer.invoke('os:relatorio-faturamento'),
  },
})


