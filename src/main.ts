import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "path";
import type { clientes, equipamentos, ordens_de_servico } from "./types";
import { pool } from "./db";
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minHeight: 400,
    minWidth: 600,
    center: true,
    title: "TechOS - Gerenciamento de Assistência Técnica",
    show: false, // Evita que a janela apareça antes de estar pronta
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  // Em desenvolvimento usa a URL do Vite; em produção carrega o HTML compilado.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Canal de teste do boilerplate
ipcMain.handle("canal-ping", async () => {
  return "pong do Processo Main!";
});


ipcMain.handle("clientes:listar", async () => {
  const resultado = await pool.query<clientes>(
    "SELECT id, nome, telefone FROM clientes ORDER BY id",
  );
  return resultado.rows;
});

ipcMain.handle(
  "clientes:criar",
  async (_event, novoCliente: Omit<clientes, "id">) => {
    const resultado = await pool.query<clientes>(
      "INSERT INTO clientes (nome, telefone) VALUES ($1, $2) RETURNING id, nome, telefone",
      [novoCliente.nome, novoCliente.telefone],
    );
    return resultado.rows[0];
  },
);

ipcMain.handle('equipamentos:listar', async () => {
  const resultado = await pool.query<equipamentos>('SELECT id, marca, modelo, id_cliente FROM equipamentos ORDER BY id')
  return resultado.rows
})

ipcMain.handle('equipamentos:listar-por-cliente', async (_event, idCliente: number) => {
  const resultado = await pool.query<equipamentos>(
    'SELECT id, marca, modelo, id_cliente FROM equipamentos WHERE id_cliente = $1 ORDER BY id',
    [idCliente],
  )
  return resultado.rows
})

ipcMain.handle('equipamentos:criar', async (_event, novoEquipamento: Omit<equipamentos, 'id'>) => {
  const resultado = await pool.query<equipamentos>(
    'INSERT INTO equipamentos (marca, modelo, id_cliente) VALUES ($1, $2, $3) RETURNING id, marca, modelo, id_cliente',
    [novoEquipamento.marca, novoEquipamento.modelo, novoEquipamento.id_cliente],
  )
  return resultado.rows[0]
})

ipcMain.handle('os:listar', async () => {
  const resultado = await pool.query<ordens_de_servico>(
    'SELECT id, id_equipamento, descricao_defeito, status, valor_total FROM ordens_servico ORDER BY id DESC',
  )
  return resultado.rows
})

ipcMain.handle('os:criar', async (_event, novaOS: Omit<ordens_de_servico, 'id' | 'status' | 'valor_total'>) => {
  const resultado = await pool.query<ordens_de_servico>(
    'INSERT INTO ordens_servico (id_equipamento, descricao_defeito) VALUES ($1, $2) RETURNING id, id_equipamento, descricao_defeito, status, valor_total',
    [novaOS.id_equipamento, novaOS.descricao_defeito],
  )
  return resultado.rows[0]
})

ipcMain.handle('os:atualizar-status', async (_event, id: number, novoStatus: ordens_de_servico['status'], valorTotal?: number) => {
  const resultado = await pool.query<ordens_de_servico>(
    'UPDATE ordens_servico SET status = $1, valor_total = COALESCE($3, valor_total) WHERE id = $2 RETURNING id, id_equipamento, descricao_defeito, status, valor_total',
    [novoStatus, id, valorTotal ?? null],
  )
  if (resultado.rowCount === 0) throw new Error('OS não encontrada')
  return resultado.rows[0]
})


ipcMain.handle('os:relatorio-faturamento', async () => {
  const resultado = await pool.query<{ total: number }>(
    "SELECT COALESCE(SUM(valor_total), 0) AS total FROM ordens_servico WHERE status = 'finalizada'",
  )
  return { total: resultado.rows[0].total }
})

function criarMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "TechOS",
      submenu: [
        {
          label: "Sobre",
          click: () => {
            console.log("TechOS - Gerenciamento de Assistencia Tecnica - v1.0");
          },
        },
        { type: "separator" },
        { role: "quit", label: "Sair" },
      ],
    },
    {
      label: "Visualizar",
      submenu: [
        { role: "reload", label: "Recarregar" },
        { role: "toggleDevTools", label: "Ferramentas do Desenvolvedor" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  criarMenu();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  console.log("Encerrando o TechOS. Ate logo!");
});
