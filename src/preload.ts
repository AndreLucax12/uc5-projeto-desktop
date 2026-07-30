import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('canal-ping'),
  clientes: {
    listar: () => ipcRenderer.invoke('clientes:listar'),
    criar: (cliente: any) => ipcRenderer.invoke('clientes:criar', cliente),
  },
  equipamentos: {
    listarPorCliente: (idCliente: number) => ipcRenderer.invoke('equipamentos:listar-por-cliente', idCliente),
  },
  os: {
    criar: (os: any) => ipcRenderer.invoke('os:criar', os),
    atualizarStatus: (id: number, status: string) => ipcRenderer.invoke('os:atualizar-status', id, status),
    relatorioFaturamento: () => ipcRenderer.invoke('os:relatorio-faturamento'),
  },
})


