import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "path";
import type {
  clientes,
  equipamentos,
  ordens_de_servico,
  marca_suportada,
  RespostaIPC,
} from "./types";
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

class ErroDeValidacao extends Error {}

async function comTratamentoDeErro<T>(
  operacao: () => Promise<T>,
): Promise<RespostaIPC<T>> {
  try {
    const dados = await operacao();
    return { sucesso: true, dados };
  } catch (erro) {
    if (erro instanceof ErroDeValidacao) {
      return { sucesso: false, erro: erro.message };
    }
    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      (erro as { code: unknown }).code === "23001"
    ) {
      return {
        sucesso: false,
        erro: "Não é possível excluir: existem outros registros vinculados a este item.",
      };
    }
    console.error(erro);
    return {
      sucesso: false,
      erro: "Você não está conectado ao banco de dados. Verifique a conexão e tente novamente.",
    };
  }
}

function validarDadosCliente(cliente: Omit<clientes, "id">) {
  if (/\d/.test(cliente.nome)) {
    throw new ErroDeValidacao("O nome do cliente não pode conter números.");
  }
  const digitosTelefone = cliente.telefone.replace(/\D/g, "");
  if (digitosTelefone.length < 10 || digitosTelefone.length > 11) {
    throw new ErroDeValidacao(
      "Telefone incompleto. Digite o DDD e o número completo.",
    );
  }
}

ipcMain.handle("clientes:listar", async () =>
  comTratamentoDeErro(async () => {
    const resultado = await pool.query<clientes>(
      "SELECT id, nome, telefone FROM clientes ORDER BY id",
    );
    return resultado.rows;
  }),
);

ipcMain.handle(
  "clientes:criar",
  async (_event, novoCliente: Omit<clientes, "id">) =>
    comTratamentoDeErro(async () => {
      validarDadosCliente(novoCliente);
      const resultado = await pool.query<clientes>(
        "INSERT INTO clientes (nome, telefone) VALUES ($1, $2) RETURNING id, nome, telefone",
        [novoCliente.nome, novoCliente.telefone],
      );
      return resultado.rows[0];
    }),
);

ipcMain.handle(
  "clientes:atualizar",
  async (_event, id: number, dadosCliente: Omit<clientes, "id">) =>
    comTratamentoDeErro(async () => {
      validarDadosCliente(dadosCliente);
      const resultado = await pool.query<clientes>(
        "UPDATE clientes SET nome = $1, telefone = $2 WHERE id = $3 RETURNING id, nome, telefone",
        [dadosCliente.nome, dadosCliente.telefone, id],
      );
      if (resultado.rowCount === 0)
        throw new ErroDeValidacao("Cliente não encontrado");
      return resultado.rows[0];
    }),
);

ipcMain.handle("clientes:excluir", async (_event, id: number) =>
  comTratamentoDeErro(async () => {
    const resultado = await pool.query("DELETE FROM clientes WHERE id = $1", [
      id,
    ]);
    if (resultado.rowCount === 0)
      throw new ErroDeValidacao("Cliente não encontrado");
  }),
);

ipcMain.handle("equipamentos:listar", async () =>
  comTratamentoDeErro(async () => {
    const resultado = await pool.query<equipamentos>(
      "SELECT id, marca, modelo, id_cliente FROM equipamentos ORDER BY id",
    );
    return resultado.rows;
  }),
);

ipcMain.handle(
  "equipamentos:listar-por-cliente",
  async (_event, idCliente: number) =>
    comTratamentoDeErro(async () => {
      const resultado = await pool.query<equipamentos>(
        "SELECT id, marca, modelo, id_cliente FROM equipamentos WHERE id_cliente = $1 ORDER BY id",
        [idCliente],
      );
      return resultado.rows;
    }),
);

ipcMain.handle(
  "equipamentos:criar",
  async (_event, novoEquipamento: Omit<equipamentos, "id">) =>
    comTratamentoDeErro(async () => {
      const resultado = await pool.query<equipamentos>(
        "INSERT INTO equipamentos (marca, modelo, id_cliente) VALUES ($1, $2, $3) RETURNING id, marca, modelo, id_cliente",
        [
          novoEquipamento.marca,
          novoEquipamento.modelo,
          novoEquipamento.id_cliente,
        ],
      );
      return resultado.rows[0];
    }),
);

ipcMain.handle(
  "equipamentos:atualizar",
  async (
    _event,
    id: number,
    dadosEquipamento: Omit<equipamentos, "id" | "id_cliente">,
  ) =>
    comTratamentoDeErro(async () => {
      const resultado = await pool.query<equipamentos>(
        "UPDATE equipamentos SET marca = $1, modelo = $2 WHERE id = $3 RETURNING id, marca, modelo, id_cliente",
        [dadosEquipamento.marca, dadosEquipamento.modelo, id],
      );
      if (resultado.rowCount === 0)
        throw new ErroDeValidacao("Equipamento não encontrado");
      return resultado.rows[0];
    }),
);

ipcMain.handle("equipamentos:excluir", async (_event, id: number) =>
  comTratamentoDeErro(async () => {
    const resultado = await pool.query(
      "DELETE FROM equipamentos WHERE id = $1",
      [id],
    );
    if (resultado.rowCount === 0)
      throw new ErroDeValidacao("Equipamento não encontrado");
  }),
);

const marcasSuportadas: marca_suportada[] = [
  { marca: "Samsung", garantiaMeses: 12 },
  { marca: "Apple", garantiaMeses: 12 },
  { marca: "Motorola", garantiaMeses: 12 },
  { marca: "Xiaomi", garantiaMeses: 12 },
  { marca: "LG", garantiaMeses: 6 },
];

ipcMain.handle(
  "equipamentos:listar-marcas-suportadas",
  async () => marcasSuportadas,
);

ipcMain.handle("os:listar", async (_event, termo?: string) =>
  comTratamentoDeErro(async () => {
    if (termo !== undefined && /\d/.test(termo.trim())) {
      throw new ErroDeValidacao("Termo de busca inválido: não use números.");
    }
    const resultado = await pool.query<ordens_de_servico>(
      "SELECT id, id_equipamento, descricao_defeito, status, valor_total, data_abertura FROM ordens_servico ORDER BY id DESC",
    );
    return resultado.rows;
  }),
);

ipcMain.handle(
  "os:criar",
  async (
    _event,
    novaOS: Omit<ordens_de_servico, "id" | "status" | "valor_total" | "data_abertura">,
  ) =>
    comTratamentoDeErro(async () => {
      const resultado = await pool.query<ordens_de_servico>(
        "INSERT INTO ordens_servico (id_equipamento, descricao_defeito) VALUES ($1, $2) RETURNING id, id_equipamento, descricao_defeito, status, valor_total, data_abertura",
        [novaOS.id_equipamento, novaOS.descricao_defeito],
      );
      return resultado.rows[0];
    }),
);

ipcMain.handle(
  "os:atualizar-status",
  async (
    _event,
    id: number,
    novoStatus: ordens_de_servico["status"],
    valorTotal?: number,
  ) =>
    comTratamentoDeErro(async () => {
      const resultado = await pool.query<ordens_de_servico>(
        "UPDATE ordens_servico SET status = $1, valor_total = COALESCE($3, valor_total) WHERE id = $2 RETURNING id, id_equipamento, descricao_defeito, status, valor_total, data_abertura",
        [novoStatus, id, valorTotal ?? null],
      );
      if (resultado.rowCount === 0)
        throw new ErroDeValidacao("OS não encontrada");
      return resultado.rows[0];
    }),
);

ipcMain.handle("os:excluir", async (_event, id: number) =>
  comTratamentoDeErro(async () => {
    const resultado = await pool.query(
      "DELETE FROM ordens_servico WHERE id = $1",
      [id],
    );
    if (resultado.rowCount === 0)
      throw new ErroDeValidacao("OS não encontrada");
  }),
);

ipcMain.handle(
  "os:relatorio-faturamento",
  async (_event, dataInicio?: string, dataFim?: string) =>
    comTratamentoDeErro(async () => {
      const condicoes = ["status = 'finalizada'"];
      const parametros: string[] = [];

      if (dataInicio) {
        parametros.push(dataInicio);
        condicoes.push(`data_abertura >= $${parametros.length}::date`);
      }
      if (dataFim) {
        parametros.push(dataFim);
        condicoes.push(`data_abertura < $${parametros.length}::date + interval '1 day'`);
      }

      const resultado = await pool.query<{ total: number }>(
        `SELECT COALESCE(SUM(valor_total), 0) AS total FROM ordens_servico WHERE ${condicoes.join(" AND ")}`,
        parametros,
      );
      return { total: resultado.rows[0].total };
    }),
);

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
