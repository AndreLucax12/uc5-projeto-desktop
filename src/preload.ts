import { contextBridge, ipcRenderer } from "electron";
import type {
  clientes,
  equipamentos,
  ordens_de_servico,
  ordem_servico_detalhada,
  marca_suportada,
  RespostaIPC,
} from "./types";

contextBridge.exposeInMainWorld("api", {
  ping: (): Promise<RespostaIPC<string>> => ipcRenderer.invoke("canal-ping"),
  clientes: {
    listar: (): Promise<RespostaIPC<clientes[]>> =>
      ipcRenderer.invoke("clientes:listar"),
    criar: (cliente: Omit<clientes, "id">): Promise<RespostaIPC<clientes>> =>
      ipcRenderer.invoke("clientes:criar", cliente),
    atualizar: (
      id: number,
      cliente: Omit<clientes, "id">,
    ): Promise<RespostaIPC<clientes>> =>
      ipcRenderer.invoke("clientes:atualizar", id, cliente),
    excluir: (id: number): Promise<RespostaIPC<void>> =>
      ipcRenderer.invoke("clientes:excluir", id),
  },
  equipamentos: {
    listar: (): Promise<RespostaIPC<equipamentos[]>> =>
      ipcRenderer.invoke("equipamentos:listar"),
    listarPorCliente: (idCliente: number): Promise<RespostaIPC<equipamentos[]>> =>
      ipcRenderer.invoke("equipamentos:listar-por-cliente", idCliente),
    criar: (equipamento: Omit<equipamentos, "id">): Promise<RespostaIPC<equipamentos>> =>
      ipcRenderer.invoke("equipamentos:criar", equipamento),
    atualizar: (
      id: number,
      equipamento: Omit<equipamentos, "id" | "id_cliente">,
    ): Promise<RespostaIPC<equipamentos>> =>
      ipcRenderer.invoke("equipamentos:atualizar", id, equipamento),
    excluir: (id: number): Promise<RespostaIPC<void>> =>
      ipcRenderer.invoke("equipamentos:excluir", id),
    listarMarcasSuportadas: (): Promise<RespostaIPC<marca_suportada[]>> =>
      ipcRenderer.invoke("equipamentos:listar-marcas-suportadas"),
  },
  os: {
    listar: (termo?: string): Promise<RespostaIPC<ordem_servico_detalhada[]>> =>
      ipcRenderer.invoke("os:listar", termo),
    criar: (
      os: Omit<ordens_de_servico, "id" | "status" | "valor_total" | "data_abertura">,
    ): Promise<RespostaIPC<ordens_de_servico>> => ipcRenderer.invoke("os:criar", os),
    atualizarStatus: (
      id: number,
      status: ordens_de_servico["status"],
      valorTotal?: number,
    ): Promise<RespostaIPC<ordens_de_servico>> =>
      ipcRenderer.invoke("os:atualizar-status", id, status, valorTotal),
    excluir: (id: number): Promise<RespostaIPC<void>> =>
      ipcRenderer.invoke("os:excluir", id),
    relatorioFaturamento: (
      dataInicio?: string,
      dataFim?: string,
    ): Promise<RespostaIPC<{ total: number }>> =>
      ipcRenderer.invoke("os:relatorio-faturamento", dataInicio, dataFim),
  },
});
