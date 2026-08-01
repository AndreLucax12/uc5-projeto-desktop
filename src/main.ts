import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'path'
import type { clientes, equipamentos, ordens_de_servico } from './types'
let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minHeight: 400,
    minWidth: 600,
    center: true,
    title: 'TechOS - Gerenciamento de Assistência Técnica',
    show: false, // Evita que a janela apareça antes de estar pronta
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });
  // Em desenvolvimento usa a URL do Vite; em produção carrega o HTML compilado.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Canal de teste do boilerplate
ipcMain.handle('canal-ping', async () => {
  return 'pong do Processo Main!'
})



const clientesMock: clientes[] = [
  { id: 1, nome: 'João Silva', telefone: '85999990000' },
  { id: 2, nome: 'Maria Souza', telefone: '85988887777' },
]

const equipamentosMock: equipamentos[] = [
  { id: 1, marca: 'Samsung', modelo: 'Galaxy A54', id_cliente: 1 },
]

const ordensMock: ordens_de_servico[] = [
  { id: 1, id_equipamento: 1, descricao_defeito: 'Tela trincada', status: 'aberta', valor_total: 0 },
]

ipcMain.handle('clientes:listar', async () => clientesMock)

ipcMain.handle('clientes:criar', async (_event, novoCliente: Omit<clientes, 'id'>) => {
  const cliente = { id: clientesMock.length + 1, ...novoCliente }
  clientesMock.push(cliente)
  return cliente
})

ipcMain.handle('equipamentos:listar-por-cliente', async (_event, idCliente: number) => {
  return equipamentosMock.filter((e) => e.id_cliente === idCliente)
})

ipcMain.handle('os:criar', async (_event, novaOS: Omit<ordens_de_servico, 'id'|'status'|'valor_total'>) => {
  const os: ordens_de_servico = { id: ordensMock.length + 1, status: 'aberta', valor_total: 0, ...novaOS }
  ordensMock.push(os)
  return os
})

ipcMain.handle('os:atualizar-status', async (_event, id: number, novoStatus: ordens_de_servico['status']) => {
  const os = ordensMock.find((o) => o.id === id)
  if (!os) throw new Error('OS não encontrada')
  os.status = novoStatus
  return os
})

ipcMain.handle('os:relatorio-faturamento', async () => {
  const total = ordensMock
    .filter((o) => o.status === 'finalizada')
    .reduce((soma, o) => soma + o.valor_total, 0)
  return { total }
})

function criarMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'TechOS', 
      submenu: [
        {
          label: 'Sobre',
          click: () => {
            console.log('TechOS - Gerenciamento de Assistencia Tecnica - v1.0')
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'toggleDevTools', label: 'Ferramentas do Desenvolvedor' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  createWindow()
  criarMenu()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  console.log('Encerrando o TechOS. Ate logo!')
})