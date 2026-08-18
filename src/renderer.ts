import "./style.css";
import type {
  clientes,
  equipamentos,
  ordens_de_servico,
  marca_suportada,
} from "./types";
declare global {
  interface Window {
    api: {
      ping: () => Promise<string>;
      clientes: {
        listar: () => Promise<clientes[]>;
        criar: (cliente: Omit<clientes, "id">) => Promise<clientes>;
        atualizar: (
          id: number,
          cliente: Omit<clientes, "id">,
        ) => Promise<clientes>;
        excluir: (id: number) => Promise<{ sucesso: boolean }>;
      };
      equipamentos: {
        listar: () => Promise<equipamentos[]>;
        listarPorCliente: (idCliente: number) => Promise<equipamentos[]>;
        criar: (equipamento: Omit<equipamentos, "id">) => Promise<equipamentos>;
        atualizar: (
          id: number,
          equipamento: Omit<equipamentos, "id" | "id_cliente">,
        ) => Promise<equipamentos>;
        excluir: (id: number) => Promise<{ sucesso: boolean }>;
        listarMarcasSuportadas: () => Promise<marca_suportada[]>;
      };

      os: {
        listar: (termo?: string) => Promise<ordens_de_servico[]>;
        criar: (
          os: Omit<ordens_de_servico, "id" | "status" | "valor_total" | "data_abertura">,
        ) => Promise<ordens_de_servico>;
        atualizarStatus: (
          id: number,
          status: ordens_de_servico["status"],
          valorTotal?: number,
        ) => Promise<ordens_de_servico>;
        excluir: (id: number) => Promise<{ sucesso: boolean }>;
        relatorioFaturamento: (
          dataInicio?: string,
          dataFim?: string,
        ) => Promise<{ total: number }>;
      };
    };
  }
}

type Aba = "clientes" | "equipamentos" | "os" | "relatorio";

const estado: {
  aba: Aba;
  clientes: clientes[];
  equipamentos: equipamentos[];
  ordens: ordens_de_servico[];
  marcasSuportadas: marca_suportada[];
  clienteFiltroEquipamentos: number | null;
  clienteFormOS: number | null;
  clienteEditando: number | null;
  equipamentoEditando: number | null;
  filtroClienteOS: number | null;
  filtroStatusOS: ordens_de_servico["status"] | "todas";
  filtroRelatorioInicio: string;
  filtroRelatorioFim: string;
} = {
  aba: "clientes",
  clientes: [],
  equipamentos: [],
  ordens: [],
  marcasSuportadas: [],
  clienteFiltroEquipamentos: null,
  clienteFormOS: null,
  clienteEditando: null,
  equipamentoEditando: null,
  filtroClienteOS: null,
  filtroStatusOS: "todas",
  filtroRelatorioInicio: "",
  filtroRelatorioFim: "",
};

const proximoStatus: Record<
  ordens_de_servico["status"],
  ordens_de_servico["status"] | null
> = {
  aberta: "em andamento",
  "em andamento": "finalizada",
  finalizada: null,
};

function classeBadge(status: ordens_de_servico["status"]): string {
  return `badge badge-${status.replace(/\s+/g, "-")}`;
}

function nomeCliente(idCliente: number): string {
  return (
    estado.clientes.find((c) => c.id === idCliente)?.nome ??
    `Cliente #${idCliente}`
  );
}

function descricaoEquipamento(idEquipamento: number): string {
  const equipamento = estado.equipamentos.find((e) => e.id === idEquipamento);
  return equipamento
    ? `${equipamento.marca} ${equipamento.modelo}`
    : `Equipamento #${idEquipamento}`;
}

function pedirValor(mensagem: string): Promise<number | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-card">
        <p>${mensagem}</p>
        <input type="number" id="modal-valor-input" step="0.01" min="0" value="0" />
        <p class="modal-erro" id="modal-valor-erro"></p>
        <div class="modal-actions">
          <button type="button" class="secondary" id="modal-cancelar">Cancelar</button>
          <button type="button" id="modal-confirmar">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector(
      "#modal-valor-input",
    ) as HTMLInputElement;
    const erro = overlay.querySelector("#modal-valor-erro") as HTMLElement;
    input.focus();
    input.select();

    const fechar = (resultado: number | null) => {
      overlay.remove();
      resolve(resultado);
    };

    overlay
      .querySelector("#modal-cancelar")!
      .addEventListener("click", () => fechar(null));
    overlay.querySelector("#modal-confirmar")!.addEventListener("click", () => {
      const valor = Number(input.value);
      if (Number.isNaN(valor) || valor < 0) {
        erro.textContent = "Digite um valor válido.";
        return;
      }
      fechar(valor);
    });
  });
}

function montarCasca() {
  const appElement = document.getElementById("app") as HTMLDivElement;
  appElement.innerHTML = `
    <header class="app-header">
      <svg class="logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 3h8a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V4a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5"/>
        <path d="M9 3h6v2H9z" fill="currentColor"/>
        <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 9v1M12 16v1M8 13H7M17 13h-1M9.5 10.5l-.7-.7M15.2 16.2l-.7-.7M9.5 15.5l-.7.7M15.2 9.8l-.7.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <div>
        <h1>TechOS</h1>
        <span>Gerenciamento de Assistência Técnica</span>
      </div>
    </header>
    <nav class="tabs">
      <button class="tab-button" data-tab="clientes">Clientes</button>
      <button class="tab-button" data-tab="equipamentos">Equipamentos</button>
      <button class="tab-button" data-tab="os">Ordens de Serviço</button>
      <button class="tab-button" data-tab="relatorio">Relatório</button>
    </nav>
    <section class="section" id="secao-clientes"></section>
    <section class="section" id="secao-equipamentos"></section>
    <section class="section" id="secao-os"></section>
    <section class="section" id="secao-relatorio"></section>
  `;

  document
    .querySelectorAll<HTMLButtonElement>(".tab-button")
    .forEach((botao) => {
      botao.addEventListener("click", () => {
        estado.aba = botao.dataset.tab as Aba;
        atualizarAbaAtiva();
      });
    });
}
function atualizarAbaAtiva() {
  document
    .querySelectorAll<HTMLButtonElement>(".tab-button")
    .forEach((botao) => {
      botao.classList.toggle("active", botao.dataset.tab === estado.aba);
    });
  document.querySelectorAll<HTMLElement>(".section").forEach((secao) => {
    secao.classList.toggle("active", secao.id === `secao-${estado.aba}`);
  });

  const secaoExercicioRelatorio = document.getElementById(
    "secao-relatorio-exercicio",
  );
  if (secaoExercicioRelatorio) {
    secaoExercicioRelatorio.hidden = estado.aba !== "relatorio";
  }
}

async function carregarDados() {
  const [clientesResp, equipamentosResp, ordensResp, marcasResp] =
    await Promise.all([
      window.api.clientes.listar(),
      window.api.equipamentos.listar(),
      window.api.os.listar(),
      window.api.equipamentos.listarMarcasSuportadas(),
    ]);
  estado.clientes = clientesResp;
  estado.equipamentos = equipamentosResp;
  estado.ordens = ordensResp;
  estado.marcasSuportadas = marcasResp;
}

function renderClientes() {
  const secao = document.getElementById("secao-clientes") as HTMLElement;
  const linhas = estado.clientes.length
    ? estado.clientes
        .map((c) => {
          if (estado.clienteEditando === c.id) {
            return `
        <div class="card-item">
          <form class="form-editar-cliente" data-id="${c.id}">
            <div class="form-grid">
              <label>Nome
                <input type="text" name="nome" value="${c.nome}" required />
              </label>
              <label>Telefone
                <input type="text" name="telefone" value="${c.telefone}" required />
              </label>
            </div>
            <div class="modal-actions">
              <button type="button" class="secondary" data-cancelar-edicao="${c.id}">Cancelar</button>
              <button type="submit">Salvar</button>
            </div>
          </form>
        </div>
      `;
          }
          return `
        <div class="card-item">
          <div class="card-item-main">
            <strong>${c.nome}</strong>
            <small>${c.telefone}</small>
          </div>
          <div class="modal-actions">
            <button type="button" class="secondary" data-editar-cliente="${c.id}">Editar</button>
            <button type="button" class="secondary" data-excluir-cliente="${c.id}">Excluir</button>
          </div>
        </div>
      `;
        })
        .join("")
    : '<p class="empty-state">Nenhum cliente cadastrado ainda.</p>';

  secao.innerHTML = `
    <h2 class="section-title">Clientes</h2>
    <div class="card-list">${linhas}</div>
    <div class="card">
      <h2 class="section-title">Novo cliente</h2>
      <form id="form-cliente">
        <div class="form-grid">
          <label>Nome
            <input type="text" name="nome" required />
          </label>
          <label>Telefone
            <input type="text" name="telefone" required />
          </label>
        </div>
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  `;

  const form = document.getElementById("form-cliente") as HTMLFormElement;
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = new FormData(form);
    const nome = String(dados.get("nome") ?? "").trim();
    const telefone = String(dados.get("telefone") ?? "").trim();
    if (!nome || !telefone) return;
    await window.api.clientes.criar({ nome, telefone });
    estado.clientes = await window.api.clientes.listar();
    renderClientes();
    renderEquipamentos();
    renderOS();
  });

  secao
    .querySelectorAll<HTMLButtonElement>("[data-editar-cliente]")
    .forEach((botao) => {
      botao.addEventListener("click", () => {
        estado.clienteEditando = Number(botao.dataset.editarCliente);
        renderClientes();
      });
    });

  secao
    .querySelectorAll<HTMLButtonElement>("[data-cancelar-edicao]")
    .forEach((botao) => {
      botao.addEventListener("click", () => {
        estado.clienteEditando = null;
        renderClientes();
      });
    });

  secao
    .querySelectorAll<HTMLFormElement>(".form-editar-cliente")
    .forEach((formEdicao) => {
      formEdicao.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const id = Number(formEdicao.dataset.id);
        const dados = new FormData(formEdicao);
        const nome = String(dados.get("nome") ?? "").trim();
        const telefone = String(dados.get("telefone") ?? "").trim();
        if (!nome || !telefone) return;
        await window.api.clientes.atualizar(id, { nome, telefone });
        estado.clienteEditando = null;
        estado.clientes = await window.api.clientes.listar();
        renderClientes();
        renderEquipamentos();
        renderOS();
      });
    });

  secao
    .querySelectorAll<HTMLButtonElement>("[data-excluir-cliente]")
    .forEach((botao) => {
      botao.addEventListener("click", async () => {
        const id = Number(botao.dataset.excluirCliente);
        const cliente = estado.clientes.find((c) => c.id === id);
        const confirmou = window.confirm(
          `Excluir o cliente "${cliente?.nome ?? ""}"? Essa ação não pode ser desfeita.`,
        );
        if (!confirmou) return;
        try {
          await window.api.clientes.excluir(id);
          estado.clientes = await window.api.clientes.listar();
          renderClientes();
        } catch {
          window.alert(
            "Não foi possível excluir: este cliente ainda tem equipamentos cadastrados.",
          );
        }
      });
    });
}

function renderEquipamentos() {
  const secao = document.getElementById("secao-equipamentos") as HTMLElement;
  const opcoesClientes = estado.clientes
    .map(
      (c) =>
        `<option value="${c.id}" ${estado.clienteFiltroEquipamentos === c.id ? "selected" : ""}>${c.nome}</option>`,
    )
    .join("");

  const equipamentosFiltrados = estado.clienteFiltroEquipamentos
    ? estado.equipamentos.filter(
        (e) => e.id_cliente === estado.clienteFiltroEquipamentos,
      )
    : [];

  const linhas = equipamentosFiltrados.length
    ? equipamentosFiltrados
        .map((e) => {
          if (estado.equipamentoEditando === e.id) {
            return `
        <div class="card-item">
          <form class="form-editar-equipamento" data-id="${e.id}">
            <div class="form-grid">
              <label>Marca
                <input type="text" name="marca" value="${e.marca}" required />
              </label>
              <label>Modelo
                <input type="text" name="modelo" value="${e.modelo}" required />
              </label>
            </div>
            <div class="modal-actions">
              <button type="button" class="secondary" data-cancelar-edicao-equipamento="${e.id}">Cancelar</button>
              <button type="submit">Salvar</button>
            </div>
          </form>
        </div>
      `;
          }
          return `
        <div class="card-item">
          <div class="card-item-main">
            <strong>${e.marca} ${e.modelo}</strong>
            <small>${nomeCliente(e.id_cliente)}</small>
          </div>
          <div class="modal-actions">
            <button type="button" class="secondary" data-editar-equipamento="${e.id}">Editar</button>
            <button type="button" class="secondary" data-excluir-equipamento="${e.id}">Excluir</button>
          </div>
        </div>
      `;
        })
        .join("")
    : `<p class="empty-state">${
        estado.clienteFiltroEquipamentos
          ? "Nenhum equipamento cadastrado para este cliente."
          : "Selecione um cliente para ver os equipamentos."
      }</p>`;

  secao.innerHTML = `
    <h2 class="section-title">Equipamentos</h2>
    <div class="card">
    
      <label>Cliente
        <select id="select-cliente-equipamentos">
          <option value="">Selecione um cliente</option>
          ${opcoesClientes}
        </select>
      </label>
    </div>
    <div class="card-list">${linhas}</div>
    <div class="card">
      <h2 class="section-title">Marcas atendidas</h2>
      <div class="card-list">
        ${estado.marcasSuportadas
          .map(
            (m) => `
          <div class="card-item">
            <div class="card-item-main">
              <strong>${m.marca}</strong>
              <small>Garantia padrão: ${m.garantiaMeses} meses</small>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
    <div class="card">
      <h2 class="section-title">Novo equipamento</h2>
      <form id="form-equipamento">
        <div class="form-grid">
          <label>Marca
            <input type="text" name="marca" required />
          </label>
          <label>Modelo
            <input type="text" name="modelo" required />
          </label>
        </div>
        <button type="submit" ${estado.clienteFiltroEquipamentos ? "" : "disabled"}>Cadastrar</button>
      </form>
    </div>
  `;

  const select = document.getElementById(
    "select-cliente-equipamentos",
  ) as HTMLSelectElement;
  select.value = estado.clienteFiltroEquipamentos
    ? String(estado.clienteFiltroEquipamentos)
    : "";
  select.addEventListener("change", () => {
    estado.clienteFiltroEquipamentos = select.value
      ? Number(select.value)
      : null;
    renderEquipamentos();
  });

  const form = document.getElementById("form-equipamento") as HTMLFormElement;
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!estado.clienteFiltroEquipamentos) return;
    const dados = new FormData(form);
    const marca = String(dados.get("marca") ?? "").trim();
    const modelo = String(dados.get("modelo") ?? "").trim();
    if (!marca || !modelo) return;
    await window.api.equipamentos.criar({
      marca,
      modelo,
      id_cliente: estado.clienteFiltroEquipamentos,
    });
    estado.equipamentos = await window.api.equipamentos.listar();
    renderEquipamentos();
    renderOS();
  });

  secao
    .querySelectorAll<HTMLButtonElement>("[data-editar-equipamento]")
    .forEach((botao) => {
      botao.addEventListener("click", () => {
        estado.equipamentoEditando = Number(botao.dataset.editarEquipamento);
        renderEquipamentos();
      });
    });

  secao
    .querySelectorAll<HTMLButtonElement>("[data-cancelar-edicao-equipamento]")
    .forEach((botao) => {
      botao.addEventListener("click", () => {
        estado.equipamentoEditando = null;
        renderEquipamentos();
      });
    });

  secao
    .querySelectorAll<HTMLFormElement>(".form-editar-equipamento")
    .forEach((formEdicao) => {
      formEdicao.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const id = Number(formEdicao.dataset.id);
        const dados = new FormData(formEdicao);
        const marca = String(dados.get("marca") ?? "").trim();
        const modelo = String(dados.get("modelo") ?? "").trim();
        if (!marca || !modelo) return;
        await window.api.equipamentos.atualizar(id, { marca, modelo });
        estado.equipamentoEditando = null;
        estado.equipamentos = await window.api.equipamentos.listar();
        renderEquipamentos();
        renderOS();
      });
    });

  secao
    .querySelectorAll<HTMLButtonElement>("[data-excluir-equipamento]")
    .forEach((botao) => {
      botao.addEventListener("click", async () => {
        const id = Number(botao.dataset.excluirEquipamento);
        const equipamento = estado.equipamentos.find((e) => e.id === id);
        const confirmou = window.confirm(
          `Excluir o equipamento "${equipamento?.marca ?? ""} ${equipamento?.modelo ?? ""}"? Essa ação não pode ser desfeita.`,
        );
        if (!confirmou) return;
        try {
          await window.api.equipamentos.excluir(id);
          estado.equipamentos = await window.api.equipamentos.listar();
          renderEquipamentos();
        } catch {
          window.alert(
            "Não foi possível excluir: este equipamento ainda tem ordens de serviço registradas.",
          );
        }
      });
    });
}

function renderOS() {
  const secao = document.getElementById("secao-os") as HTMLElement;

  const opcoesClientes = estado.clientes
    .map(
      (c) =>
        `<option value="${c.id}" ${estado.clienteFormOS === c.id ? "selected" : ""}>${c.nome}</option>`,
    )
    .join("");

  const equipamentosDoCliente = estado.clienteFormOS
    ? estado.equipamentos.filter((e) => e.id_cliente === estado.clienteFormOS)
    : [];

  const opcoesEquipamentos = equipamentosDoCliente
    .map((e) => `<option value="${e.id}">${e.marca} ${e.modelo}</option>`)
    .join("");

  const ordensOrdenadas = [...estado.ordens].sort((a, b) => b.id - a.id);

  const opcoesClientesFiltro = estado.clientes
    .map(
      (c) =>
        `<option value="${c.id}" ${estado.filtroClienteOS === c.id ? "selected" : ""}>${c.nome}</option>`,
    )
    .join("");

  const ordensFiltradas = ordensOrdenadas.filter((os) => {
    if (estado.filtroStatusOS !== "todas" && os.status !== estado.filtroStatusOS) return false
    if (estado.filtroClienteOS !== null) {
      const equipamento = estado.equipamentos.find((e) => e.id === os.id_equipamento)
      if (!equipamento || equipamento.id_cliente !== estado.filtroClienteOS) return false
    }
    return true
  })

  const linhas = ordensFiltradas.length
    ? ordensFiltradas
        .map((os) => {
          const proximo = proximoStatus[os.status];
          return `
        <div class="card-item">
          <div class="card-item-main">
            <strong>${descricaoEquipamento(os.id_equipamento)}</strong>
            <small>${os.descricao_defeito}</small>
          </div>
          <span class="${classeBadge(os.status)}">${os.status}</span>
          <div class="modal-actions">
            ${proximo ? `<button class="secondary" data-avancar="${os.id}">Marcar como "${proximo}"</button>` : ""}
            <button class="secondary" data-excluir-os="${os.id}">Excluir</button>
          </div>
        </div>
      `;
        })
        .join("")
    : estado.ordens.length
      ? '<p class="empty-state">Nenhuma OS encontrada para esse filtro.</p>'
      : '<p class="empty-state">Nenhuma ordem de serviço aberta ainda.</p>';

  secao.innerHTML = `
    <h2 class="section-title">Abrir nova OS</h2>
    <div class="card">
      <form id="form-os">
        <div class="form-grid">
          <label>Cliente
            <select id="select-cliente-os">
              <option value="">Selecione um cliente</option>
              ${opcoesClientes}
            </select>
          </label>
          <label>Equipamento
            <select name="id_equipamento" id="select-equipamento-os" ${equipamentosDoCliente.length ? "" : "disabled"}>
              <option value="">Selecione um equipamento</option>
              ${opcoesEquipamentos}
            </select>
          </label>
        </div>
        <label>Descrição do defeito
          <textarea name="descricao_defeito" required></textarea>
        </label>
        <button type="submit">Abrir OS</button>
      </form>
    </div>
    <h2 class="section-title">Ordens de serviço</h2>
    <div class="card">
      <div class="form-grid">
        <label>Filtrar por cliente
          <select id="filtro-cliente-os">
            <option value="">Todos os clientes</option>
            ${opcoesClientesFiltro}
          </select>
        </label>
        <label>Filtrar por status
          <select id="filtro-status-os">
            <option value="todas">Todos os status</option>
            <option value="aberta">Aberta</option>
            <option value="em andamento">Em andamento</option>
            <option value="finalizada">Finalizada</option>
          </select>
        </label>
      </div>
    </div>
    <div class="card-list">${linhas}</div>
  `;

  const selectCliente = document.getElementById(
    "select-cliente-os",
  ) as HTMLSelectElement;
  selectCliente.value = estado.clienteFormOS
    ? String(estado.clienteFormOS)
    : "";
  selectCliente.addEventListener("change", () => {
    estado.clienteFormOS = selectCliente.value
      ? Number(selectCliente.value)
      : null;
    renderOS();
  });

  const filtroCliente = document.getElementById(
    "filtro-cliente-os",
  ) as HTMLSelectElement;
  filtroCliente.value = estado.filtroClienteOS
    ? String(estado.filtroClienteOS)
    : "";
  filtroCliente.addEventListener("change", () => {
    estado.filtroClienteOS = filtroCliente.value
      ? Number(filtroCliente.value)
      : null;
    renderOS();
  });

  const filtroStatus = document.getElementById(
    "filtro-status-os",
  ) as HTMLSelectElement;
  filtroStatus.value = estado.filtroStatusOS;
  filtroStatus.addEventListener("change", () => {
    estado.filtroStatusOS = filtroStatus.value as
      | ordens_de_servico["status"]
      | "todas";
    renderOS();
  });

  const form = document.getElementById("form-os") as HTMLFormElement;
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = new FormData(form);
    const idEquipamento = Number(dados.get("id_equipamento"));
    const descricaoDefeito = String(
      dados.get("descricao_defeito") ?? "",
    ).trim();
    if (!idEquipamento || !descricaoDefeito) return;
    await window.api.os.criar({
      id_equipamento: idEquipamento,
      descricao_defeito: descricaoDefeito,
    });
    estado.ordens = await window.api.os.listar();
    renderOS();
    renderRelatorio();
  });

  secao
    .querySelectorAll<HTMLButtonElement>("[data-avancar]")
    .forEach((botao) => {
      botao.addEventListener("click", async () => {
        const id = Number(botao.dataset.avancar);
        const os = estado.ordens.find((o) => o.id === id);
        const proximo = os ? proximoStatus[os.status] : null;
        if (!proximo) return;

        let valor: number | undefined;
        if (proximo === "finalizada") {
          const resultado = await pedirValor("Valor cobrado nesta OS (R$):");
          if (resultado === null) return;
          valor = resultado;
        }

        await window.api.os.atualizarStatus(id, proximo, valor);
        estado.ordens = await window.api.os.listar();
        renderOS();
        renderRelatorio();
      });
    });

  secao
    .querySelectorAll<HTMLButtonElement>("[data-excluir-os]")
    .forEach((botao) => {
      botao.addEventListener("click", async () => {
        const id = Number(botao.dataset.excluirOs);
        const confirmou = window.confirm(
          "Excluir esta ordem de serviço? Essa ação não pode ser desfeita.",
        );
        if (!confirmou) return;
        await window.api.os.excluir(id);
        estado.ordens = await window.api.os.listar();
        renderOS();
        renderRelatorio();
      });
    });
}

function renderRelatorio() {
  const secao = document.getElementById("secao-relatorio") as HTMLElement;
  secao.innerHTML = `
    <h2 class="section-title">Faturamento</h2>
    <div class="card">
      <div class="form-grid">
        <label>De
          <input type="date" id="filtro-relatorio-inicio" value="${estado.filtroRelatorioInicio}" />
        </label>
        <label>Até
          <input type="date" id="filtro-relatorio-fim" value="${estado.filtroRelatorioFim}" />
        </label>
      </div>
      <button type="button" class="secondary" id="botao-limpar-filtro-relatorio">Limpar período</button>
    </div>
    <div class="stat-card">
      <p class="label">Total faturado (OS finalizadas)</p>
      <p class="valor" id="valor-faturamento">carregando...</p>
      <button class="secondary" id="botao-atualizar-relatorio">Atualizar</button>
    </div>
  `;

  const atualizar = async () => {
    const { total } = await window.api.os.relatorioFaturamento(
      estado.filtroRelatorioInicio || undefined,
      estado.filtroRelatorioFim || undefined,
    );
    const valorEl = document.getElementById("valor-faturamento") as HTMLElement;
    valorEl.textContent = total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const inputInicio = document.getElementById(
    "filtro-relatorio-inicio",
  ) as HTMLInputElement;
  inputInicio.addEventListener("change", () => {
    estado.filtroRelatorioInicio = inputInicio.value;
    atualizar();
  });

  const inputFim = document.getElementById(
    "filtro-relatorio-fim",
  ) as HTMLInputElement;
  inputFim.addEventListener("change", () => {
    estado.filtroRelatorioFim = inputFim.value;
    atualizar();
  });

  document
    .getElementById("botao-limpar-filtro-relatorio")
    ?.addEventListener("click", () => {
      estado.filtroRelatorioInicio = "";
      estado.filtroRelatorioFim = "";
      renderRelatorio();
    });

  document
    .getElementById("botao-atualizar-relatorio")
    ?.addEventListener("click", atualizar);
  atualizar();
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase();
}

function dobrarCaractere(caractere: string): string {
  return caractere
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase();
}

function textoDobrado(texto: string): string {
  return Array.from(texto).map(dobrarCaractere).join("");
}

function montarTextoComDestaque(elemento: HTMLElement, texto: string, termo: string) {
  elemento.textContent = "";
  const indice = termo ? textoDobrado(texto).indexOf(textoDobrado(termo)) : -1;

  if (indice === -1) {
    elemento.textContent = texto;
    return;
  }

  const antes = texto.slice(0, indice);
  const trecho = texto.slice(indice, indice + termo.length);
  const depois = texto.slice(indice + termo.length);

  if (antes) elemento.appendChild(document.createTextNode(antes));
  const marca = document.createElement("mark");
  marca.textContent = trecho;
  elemento.appendChild(marca);
  if (depois) elemento.appendChild(document.createTextNode(depois));
}

function renderizarListaOSFinalizadas(ordens: ordens_de_servico[], termoDestaque: string) {
  const lista = document.getElementById("lista-os-finalizadas") as HTMLUListElement;
  lista.textContent = "";

  ordens.forEach((os) => {
    const equipamento = estado.equipamentos.find((e) => e.id === os.id_equipamento);
    const nomeDoCliente = equipamento
      ? nomeCliente(equipamento.id_cliente)
      : "Cliente desconhecido";

    const item = document.createElement("li");

    const cliente = document.createElement("strong");
    montarTextoComDestaque(cliente, nomeDoCliente, termoDestaque);

    const detalhe = document.createElement("span");
    detalhe.textContent = ` — ${os.descricao_defeito} — ${os.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;

    item.appendChild(cliente);
    item.appendChild(detalhe);
    lista.appendChild(item);
  });
}

async function buscarOSFinalizadas(termo?: string) {
  const erro = document.getElementById("erro-buscar-os-finalizadas") as HTMLParagraphElement;
  erro.textContent = "";

  try {
    const todasAsOrdens = await window.api.os.listar(termo);
    const finalizadas = todasAsOrdens.filter((os) => os.status === "finalizada");

    if (finalizadas.length === 0) {
      (document.getElementById("lista-os-finalizadas") as HTMLUListElement).textContent = "";
      erro.textContent = "Nenhuma OS finalizada registrada ainda.";
      return;
    }

    const termoBusca = (termo ?? "").trim();
    const termoNormalizado = normalizarTexto(termoBusca);

    const existeCorrespondencia =
      !termoNormalizado ||
      finalizadas.some((os) => {
        const equipamento = estado.equipamentos.find((e) => e.id === os.id_equipamento);
        const nomeDoCliente = equipamento ? nomeCliente(equipamento.id_cliente) : "";
        return normalizarTexto(nomeDoCliente).includes(termoNormalizado);
      });

    renderizarListaOSFinalizadas(finalizadas, termoBusca);

    if (termoNormalizado && !existeCorrespondencia) {
      erro.textContent =
        "Nenhuma correspondência para esse termo — mostrando todas as OS finalizadas.";
    }
  }  catch (falha) {
    (document.getElementById("lista-os-finalizadas") as HTMLUListElement).textContent = "";
    if (falha instanceof Error && falha.message.includes("não use números")) {
      erro.textContent = "Termo de busca inválido: não use números.";
    } else {
      erro.textContent = "Não foi possível buscar agora: sem conexão com o banco de dados.";
    }
  }
}

function iniciarExercicioOSFinalizadas() {
  const form = document.getElementById("form-buscar-os-finalizadas") as HTMLFormElement;
  const campoBusca = document.getElementById("campo-buscar-os-finalizadas") as HTMLInputElement;
  const campoFiltro = document.getElementById("campo-filtro-os-finalizadas") as HTMLInputElement;

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const termo = campoBusca.value.trim();
    buscarOSFinalizadas(termo || undefined);
  });

  campoFiltro.addEventListener("input", () => {
    const termo = normalizarTexto(campoFiltro.value.trim());
    const itens = document.querySelectorAll<HTMLLIElement>("#lista-os-finalizadas li");
    itens.forEach((item) => {
      const visivel = normalizarTexto(item.textContent ?? "").includes(termo);
      item.hidden = !visivel;
    });
  });

  buscarOSFinalizadas();
}

async function iniciar() {
  montarCasca();
  try {
  await carregarDados();
  } catch (error) {
    const appElement = document.getElementById("app") as HTMLDivElement;
    const aviso = document.createElement("p");
    aviso.className = "modal-erro";
    aviso.textContent = "Não foi possível carregar os dados do banco. Verifique a conexão e tente novamente.";
    appElement.prepend(aviso);
  }
  renderClientes();
  renderEquipamentos();
  renderOS();
  renderRelatorio();
  atualizarAbaAtiva();
  iniciarExercicioOSFinalizadas();
}

iniciar()
