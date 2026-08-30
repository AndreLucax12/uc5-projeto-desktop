import "./style.css";
import type {
  clientes,
  equipamentos,
  ordens_de_servico,
  ordem_servico_detalhada,
  marca_suportada,
  RespostaIPC,
} from "./types";
declare global {
  interface Window {
    api: {
      ping: () => Promise<RespostaIPC<string>>;
      clientes: {
        listar: () => Promise<RespostaIPC<clientes[]>>;
        criar: (cliente: Omit<clientes, "id">) => Promise<RespostaIPC<clientes>>;
        atualizar: (
          id: number,
          cliente: Omit<clientes, "id">,
        ) => Promise<RespostaIPC<clientes>>;
        excluir: (id: number) => Promise<RespostaIPC<void>>;
      };
      equipamentos: {
        listar: () => Promise<RespostaIPC<equipamentos[]>>;
        listarPorCliente: (idCliente: number) => Promise<RespostaIPC<equipamentos[]>>;
        criar: (equipamento: Omit<equipamentos, "id">) => Promise<RespostaIPC<equipamentos>>;
        atualizar: (
          id: number,
          equipamento: Omit<equipamentos, "id" | "id_cliente">,
        ) => Promise<RespostaIPC<equipamentos>>;
        excluir: (id: number) => Promise<RespostaIPC<void>>;
        listarMarcasSuportadas: () => Promise<RespostaIPC<marca_suportada[]>>;
      };

      os: {
        listar: (termo?: string) => Promise<RespostaIPC<ordem_servico_detalhada[]>>;
        criar: (
          os: Omit<ordens_de_servico, "id" | "status" | "valor_total" | "data_abertura">,
        ) => Promise<RespostaIPC<ordens_de_servico>>;
        atualizarStatus: (
          id: number,
          status: ordens_de_servico["status"],
          valorTotal?: number,
        ) => Promise<RespostaIPC<ordens_de_servico>>;
        excluir: (id: number) => Promise<RespostaIPC<void>>;
        relatorioFaturamento: (
          dataInicio?: string,
          dataFim?: string,
        ) => Promise<RespostaIPC<{ total: number }>>;
      };
    };
  }
}

type Aba = "clientes" | "equipamentos" | "os" | "relatorio";

const estado: {
  aba: Aba;
  clientes: clientes[];
  equipamentos: equipamentos[];
  ordens: ordem_servico_detalhada[];
  marcasSuportadas: marca_suportada[];
  clienteFiltroEquipamentos: number | null;
  clienteFormOS: number | null;
  clienteEditando: number | null;
  equipamentoEditando: number | null;
  filtroClienteOS: number | null;
  filtroStatusOS: ordens_de_servico["status"] | "todas";
  filtroRelatorioInicio: string;
  filtroRelatorioFim: string;
  erroClientes: string | null;
  erroEquipamentos: string | null;
  erroOS: string | null;
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
  erroClientes: null,
  erroEquipamentos: null,
  erroOS: null,
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

function rotuloDataAbertura(dataAbertura: string): string {
  return new Date(dataAbertura).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function comDivisoriasDeData<T extends { data_abertura: string }>(
  itens: T[],
  renderizarItem: (item: T) => HTMLElement,
): HTMLElement[] {
  let rotuloAnterior: string | null = null;
  const nos: HTMLElement[] = [];
  itens.forEach((item) => {
    const rotulo = rotuloDataAbertura(item.data_abertura);
    if (rotulo !== rotuloAnterior) {
      nos.push(criarElemento("h3", { classe: "date-divider", texto: rotulo }));
      rotuloAnterior = rotulo;
    }
    nos.push(renderizarItem(item));
  });
  return nos;
}

function criarElemento<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opcoes?: {
    classe?: string;
    texto?: string;
    atributos?: Record<string, string>;
    filhos?: (Node | null)[];
  },
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(tag);
  if (opcoes?.classe) elemento.className = opcoes.classe;
  if (opcoes?.texto !== undefined) elemento.textContent = opcoes.texto;
  if (opcoes?.atributos) {
    for (const [chave, valor] of Object.entries(opcoes.atributos)) {
      elemento.setAttribute(chave, valor);
    }
  }
  if (opcoes?.filhos) {
    for (const filho of opcoes.filhos) {
      if (filho) elemento.appendChild(filho);
    }
  }
  return elemento;
}

function pedirValor(mensagem: string): Promise<number | null> {
  return new Promise((resolve) => {
    const input = criarElemento("input", {
      atributos: { type: "number", step: "0.01", min: "0" },
    });
    input.value = "0";

    const erro = criarElemento("p", { classe: "modal-erro" });

    const botaoCancelar = criarElemento("button", {
      classe: "secondary",
      texto: "Cancelar",
      atributos: { type: "button" },
    });
    const botaoConfirmar = criarElemento("button", {
      texto: "Confirmar",
      atributos: { type: "button" },
    });

    const overlay = criarElemento("div", {
      classe: "modal-overlay",
      filhos: [
        criarElemento("div", {
          classe: "modal-card",
          filhos: [
            criarElemento("p", { texto: mensagem }),
            input,
            erro,
            criarElemento("div", {
              classe: "modal-actions",
              filhos: [botaoCancelar, botaoConfirmar],
            }),
          ],
        }),
      ],
    });
    document.body.appendChild(overlay);
    input.focus();
    input.select();

    const fechar = (resultado: number | null) => {
      overlay.remove();
      resolve(resultado);
    };

    botaoCancelar.addEventListener("click", () => fechar(null));
    botaoConfirmar.addEventListener("click", () => {
      const valor = Number(input.value);
      if (Number.isNaN(valor) || valor < 0) {
        erro.textContent = "Digite um valor válido.";
        return;
      }
      fechar(valor);
    });
  });
}

function confirmarAcao(mensagem: string): Promise<boolean> {
  return new Promise((resolve) => {
    const botaoCancelar = criarElemento("button", {
      classe: "secondary",
      texto: "Cancelar",
      atributos: { type: "button" },
    });
    const botaoConfirmar = criarElemento("button", {
      texto: "Confirmar",
      atributos: { type: "button" },
    });

    const overlay = criarElemento("div", {
      classe: "modal-overlay",
      filhos: [
        criarElemento("div", {
          classe: "modal-card",
          filhos: [
            criarElemento("p", { texto: mensagem }),
            criarElemento("div", {
              classe: "modal-actions",
              filhos: [botaoCancelar, botaoConfirmar],
            }),
          ],
        }),
      ],
    });
    document.body.appendChild(overlay);

    const fechar = (resultado: boolean) => {
      overlay.remove();
      resolve(resultado);
    };

    botaoCancelar.addEventListener("click", () => fechar(false));
    botaoConfirmar.addEventListener("click", () => fechar(true));
  });
}

function iniciarTabs() {
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
  if (clientesResp.sucesso) {
    estado.clientes = clientesResp.dados ?? [];
    estado.erroClientes = null;
  } else {
    estado.clientes = [];
    estado.erroClientes =
      clientesResp.erro ?? "Não foi possível carregar os clientes.";
  }
  if (equipamentosResp.sucesso) {
    estado.equipamentos = equipamentosResp.dados ?? [];
    estado.erroEquipamentos = null;
  } else {
    estado.equipamentos = [];
    estado.erroEquipamentos =
      equipamentosResp.erro ?? "Não foi possível carregar os equipamentos.";
  }
  if (ordensResp.sucesso) {
    estado.ordens = ordensResp.dados ?? [];
    estado.erroOS = null;
  } else {
    estado.ordens = [];
    estado.erroOS = ordensResp.erro ?? "Não foi possível carregar as ordens de serviço.";
  }
  estado.marcasSuportadas = marcasResp.sucesso ? (marcasResp.dados ?? []) : [];
}

let temporizadorErroClientes: ReturnType<typeof setTimeout> | null = null;

function limparErroClientes() {
  if (temporizadorErroClientes) {
    clearTimeout(temporizadorErroClientes);
    temporizadorErroClientes = null;
  }
  estado.erroClientes = null;
}

function mostrarErroClientes(mensagem: string) {
  estado.erroClientes = mensagem;
  renderClientes();

  if (temporizadorErroClientes) clearTimeout(temporizadorErroClientes);
  temporizadorErroClientes = setTimeout(() => {
    temporizadorErroClientes = null;
    estado.erroClientes = null;
    renderClientes();
  }, 5000);
}

async function recarregarClientes() {
  const resposta = await window.api.clientes.listar();
  if (resposta.sucesso) {
    estado.clientes = resposta.dados ?? [];
    limparErroClientes();
  } else {
    mostrarErroClientes(
      resposta.erro ?? "Não foi possível recarregar os clientes.",
    );
  }
}

function criarCardCliente(c: clientes): HTMLElement {
  if (estado.clienteEditando === c.id) {
    const inputNome = criarElemento("input", {
      atributos: { type: "text", name: "nome", required: "" },
    });
    inputNome.value = c.nome;

    const inputTelefone = criarElemento("input", {
      atributos: { type: "text", name: "telefone", required: "" },
    });
    inputTelefone.value = formatarTelefone(c.telefone);
    inputTelefone.addEventListener("input", () => {
      inputTelefone.value = formatarTelefone(inputTelefone.value);
    });

    const botaoCancelar = criarElemento("button", {
      classe: "secondary",
      texto: "Cancelar",
      atributos: { type: "button" },
    });
    botaoCancelar.addEventListener("click", () => {
      estado.clienteEditando = null;
      renderClientes();
    });

    const form = criarElemento("form", {
      classe: "form-editar-cliente",
      filhos: [
        criarElemento("div", {
          classe: "form-grid",
          filhos: [
            criarElemento("label", { texto: "Nome", filhos: [inputNome] }),
            criarElemento("label", {
              texto: "Telefone",
              filhos: [inputTelefone],
            }),
          ],
        }),
        criarElemento("div", {
          classe: "modal-actions",
          filhos: [
            botaoCancelar,
            criarElemento("button", { texto: "Salvar", atributos: { type: "submit" } }),
          ],
        }),
      ],
    });

    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const nome = inputNome.value.trim();
      const telefone = inputTelefone.value.trim();
      if (!nome || !telefone) return;
      if (/\d/.test(nome)) {
        mostrarErroClientes("O nome do cliente não pode conter números.");
        return;
      }
      if (!telefoneCompleto(telefone)) {
        mostrarErroClientes("Telefone incompleto. Digite o DDD e o número completo.");
        return;
      }
      const resposta = await window.api.clientes.atualizar(c.id, { nome, telefone });
      if (!resposta.sucesso) {
        mostrarErroClientes(resposta.erro ?? "Não foi possível salvar o cliente.");
        return;
      }
      estado.clienteEditando = null;
      await recarregarClientes();
      renderClientes();
      renderEquipamentos();
      renderOS();
    });

    return criarElemento("div", { classe: "card-item", filhos: [form] });
  }

  const botaoEditar = criarElemento("button", {
    classe: "secondary",
    texto: "Editar",
    atributos: { type: "button" },
  });
  botaoEditar.addEventListener("click", () => {
    estado.clienteEditando = c.id;
    renderClientes();
  });

  const botaoExcluir = criarElemento("button", {
    classe: "btn-excluir",
    texto: "Excluir",
    atributos: { type: "button" },
  });
  botaoExcluir.addEventListener("click", async () => {
    const confirmou = await confirmarAcao(
      `Excluir o cliente "${c.nome}"? Essa ação não pode ser desfeita.`,
    );
    if (!confirmou) return;
    const resposta = await window.api.clientes.excluir(c.id);
    if (!resposta.sucesso) {
      mostrarErroClientes(resposta.erro ?? "Não foi possível excluir o cliente.");
      return;
    }
    await recarregarClientes();
    renderClientes();
  });

  return criarElemento("div", {
    classe: "card-item",
    filhos: [
      criarElemento("div", {
        classe: "card-item-main",
        filhos: [
          criarElemento("strong", { texto: c.nome }),
          criarElemento("small", { texto: formatarTelefone(c.telefone) }),
        ],
      }),
      criarElemento("div", {
        classe: "modal-actions",
        filhos: [botaoEditar, botaoExcluir],
      }),
    ],
  });
}

function renderClientes() {
  const erroEl = document.getElementById("erro-clientes") as HTMLParagraphElement;
  erroEl.textContent = estado.erroClientes ?? "";

  const lista = document.getElementById("lista-clientes") as HTMLDivElement;
  lista.replaceChildren();
  if (estado.clientes.length === 0) {
    lista.appendChild(
      criarElemento("p", {
        classe: "empty-state",
        texto: "Nenhum cliente cadastrado ainda.",
      }),
    );
  } else {
    estado.clientes.forEach((c) => lista.appendChild(criarCardCliente(c)));
  }
}

function iniciarFormCliente() {
  const form = document.getElementById("form-cliente") as HTMLFormElement;
  const inputTelefone = form.querySelector(
    'input[name="telefone"]',
  ) as HTMLInputElement;
  inputTelefone.addEventListener("input", () => {
    inputTelefone.value = formatarTelefone(inputTelefone.value);
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = new FormData(form);
    const nome = String(dados.get("nome") ?? "").trim();
    const telefone = String(dados.get("telefone") ?? "").trim();
    if (!nome || !telefone) return;
    if (/\d/.test(nome)) {
      mostrarErroClientes("O nome do cliente não pode conter números.");
      return;
    }
    if (!telefoneCompleto(telefone)) {
      mostrarErroClientes("Telefone incompleto. Digite o DDD e o número completo.");
      return;
    }
    const resposta = await window.api.clientes.criar({ nome, telefone });
    if (!resposta.sucesso) {
      mostrarErroClientes(resposta.erro ?? "Não foi possível cadastrar o cliente.");
      return;
    }
    form.reset();
    await recarregarClientes();
    renderClientes();
    renderEquipamentos();
    renderOS();
  });
}

let temporizadorErroEquipamentos: ReturnType<typeof setTimeout> | null = null;

function mostrarErroEquipamentos(mensagem: string) {
  estado.erroEquipamentos = mensagem;
  renderEquipamentos();

  if (temporizadorErroEquipamentos) clearTimeout(temporizadorErroEquipamentos);
  temporizadorErroEquipamentos = setTimeout(() => {
    temporizadorErroEquipamentos = null;
    estado.erroEquipamentos = null;
    renderEquipamentos();
  }, 5000);
}

async function recarregarEquipamentos() {
  const resposta = await window.api.equipamentos.listar();
  if (resposta.sucesso) {
    estado.equipamentos = resposta.dados ?? [];
    if (temporizadorErroEquipamentos) {
      clearTimeout(temporizadorErroEquipamentos);
      temporizadorErroEquipamentos = null;
    }
    estado.erroEquipamentos = null;
  } else {
    mostrarErroEquipamentos(
      resposta.erro ?? "Não foi possível recarregar os equipamentos.",
    );
  }
}

function criarCardEquipamento(e: equipamentos): HTMLElement {
  if (estado.equipamentoEditando === e.id) {
    const inputMarca = criarElemento("input", {
      atributos: { type: "text", name: "marca", required: "" },
    });
    inputMarca.value = e.marca;

    const inputModelo = criarElemento("input", {
      atributos: { type: "text", name: "modelo", required: "" },
    });
    inputModelo.value = e.modelo;

    const botaoCancelar = criarElemento("button", {
      classe: "secondary",
      texto: "Cancelar",
      atributos: { type: "button" },
    });
    botaoCancelar.addEventListener("click", () => {
      estado.equipamentoEditando = null;
      renderEquipamentos();
    });

    const form = criarElemento("form", {
      classe: "form-editar-equipamento",
      filhos: [
        criarElemento("div", {
          classe: "form-grid",
          filhos: [
            criarElemento("label", { texto: "Marca", filhos: [inputMarca] }),
            criarElemento("label", { texto: "Modelo", filhos: [inputModelo] }),
          ],
        }),
        criarElemento("div", {
          classe: "modal-actions",
          filhos: [
            botaoCancelar,
            criarElemento("button", { texto: "Salvar", atributos: { type: "submit" } }),
          ],
        }),
      ],
    });

    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const marca = inputMarca.value.trim();
      const modelo = inputModelo.value.trim();
      if (!marca || !modelo) return;
      const resposta = await window.api.equipamentos.atualizar(e.id, { marca, modelo });
      if (!resposta.sucesso) {
        mostrarErroEquipamentos(resposta.erro ?? "Não foi possível salvar o equipamento.");
        return;
      }
      estado.equipamentoEditando = null;
      await recarregarEquipamentos();
      renderEquipamentos();
      renderOS();
    });

    return criarElemento("div", { classe: "card-item", filhos: [form] });
  }

  const botaoEditar = criarElemento("button", {
    classe: "secondary",
    texto: "Editar",
    atributos: { type: "button" },
  });
  botaoEditar.addEventListener("click", () => {
    estado.equipamentoEditando = e.id;
    renderEquipamentos();
  });

  const botaoExcluir = criarElemento("button", {
    classe: "btn-excluir",
    texto: "Excluir",
    atributos: { type: "button" },
  });
  botaoExcluir.addEventListener("click", async () => {
    const confirmou = await confirmarAcao(
      `Excluir o equipamento "${e.marca} ${e.modelo}"? Essa ação não pode ser desfeita.`,
    );
    if (!confirmou) return;
    const resposta = await window.api.equipamentos.excluir(e.id);
    if (!resposta.sucesso) {
      mostrarErroEquipamentos(resposta.erro ?? "Não foi possível excluir o equipamento.");
      return;
    }
    await recarregarEquipamentos();
    renderEquipamentos();
  });

  return criarElemento("div", {
    classe: "card-item",
    filhos: [
      criarElemento("div", {
        classe: "card-item-main",
        filhos: [
          criarElemento("strong", { texto: `${e.marca} ${e.modelo}` }),
          criarElemento("small", { texto: nomeCliente(e.id_cliente) }),
        ],
      }),
      criarElemento("div", {
        classe: "modal-actions",
        filhos: [botaoEditar, botaoExcluir],
      }),
    ],
  });
}

function renderEquipamentos() {
  const erroEl = document.getElementById("erro-equipamentos") as HTMLParagraphElement;
  erroEl.textContent = estado.erroEquipamentos ?? "";

  const selectFiltro = document.getElementById(
    "select-cliente-equipamentos",
  ) as HTMLSelectElement;
  selectFiltro.replaceChildren(
    criarElemento("option", { texto: "Selecione um cliente", atributos: { value: "" } }),
    ...estado.clientes.map((c) =>
      criarElemento("option", { texto: c.nome, atributos: { value: String(c.id) } }),
    ),
  );
  selectFiltro.value = estado.clienteFiltroEquipamentos
    ? String(estado.clienteFiltroEquipamentos)
    : "";

  const equipamentosFiltrados = estado.clienteFiltroEquipamentos
    ? estado.equipamentos.filter(
        (e) => e.id_cliente === estado.clienteFiltroEquipamentos,
      )
    : [];

  const lista = document.getElementById("lista-equipamentos") as HTMLDivElement;
  lista.replaceChildren();
  if (equipamentosFiltrados.length === 0) {
    lista.appendChild(
      criarElemento("p", {
        classe: "empty-state",
        texto: estado.clienteFiltroEquipamentos
          ? "Nenhum equipamento cadastrado para este cliente."
          : "Selecione um cliente para ver os equipamentos.",
      }),
    );
  } else {
    equipamentosFiltrados.forEach((e) =>
      lista.appendChild(criarCardEquipamento(e)),
    );
  }

  const botaoCadastrar = document.getElementById(
    "botao-cadastrar-equipamento",
  ) as HTMLButtonElement;
  botaoCadastrar.disabled = !estado.clienteFiltroEquipamentos;

  const listaMarcas = document.getElementById(
    "lista-marcas-suportadas",
  ) as HTMLDivElement;
  listaMarcas.replaceChildren(
    ...estado.marcasSuportadas.map((m) =>
      criarElemento("div", {
        classe: "card-item",
        filhos: [
          criarElemento("div", {
            classe: "card-item-main",
            filhos: [
              criarElemento("strong", { texto: m.marca }),
              criarElemento("small", { texto: `Garantia padrão: ${m.garantiaMeses} meses` }),
            ],
          }),
        ],
      }),
    ),
  );
}

function iniciarEquipamentos() {
  const select = document.getElementById(
    "select-cliente-equipamentos",
  ) as HTMLSelectElement;
  select.addEventListener("change", () => {
    estado.clienteFiltroEquipamentos = select.value ? Number(select.value) : null;
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
    const resposta = await window.api.equipamentos.criar({
      marca,
      modelo,
      id_cliente: estado.clienteFiltroEquipamentos,
    });
    if (!resposta.sucesso) {
      mostrarErroEquipamentos(resposta.erro ?? "Não foi possível cadastrar o equipamento.");
      return;
    }
    form.reset();
    await recarregarEquipamentos();
    renderEquipamentos();
    renderOS();
  });
}

let temporizadorErroOS: ReturnType<typeof setTimeout> | null = null;

function mostrarErroOS(mensagem: string) {
  estado.erroOS = mensagem;
  renderOS();

  if (temporizadorErroOS) clearTimeout(temporizadorErroOS);
  temporizadorErroOS = setTimeout(() => {
    temporizadorErroOS = null;
    estado.erroOS = null;
    renderOS();
  }, 5000);
}

async function recarregarOrdens() {
  const resposta = await window.api.os.listar();
  if (resposta.sucesso) {
    estado.ordens = resposta.dados ?? [];
    if (temporizadorErroOS) {
      clearTimeout(temporizadorErroOS);
      temporizadorErroOS = null;
    }
    estado.erroOS = null;
  } else {
    mostrarErroOS(resposta.erro ?? "Não foi possível recarregar as ordens de serviço.");
  }
}

function criarCardOS(os: ordem_servico_detalhada): HTMLElement {
  const proximo = proximoStatus[os.status];

  const botoes: HTMLElement[] = [];
  if (proximo) {
    const botaoAvancar = criarElemento("button", {
      classe: "secondary",
      texto: `Marcar como "${proximo}"`,
      atributos: { type: "button" },
    });
    botaoAvancar.addEventListener("click", async () => {
      let valor: number | undefined;
      if (proximo === "finalizada") {
        const resultado = await pedirValor("Valor cobrado nesta OS (R$):");
        if (resultado === null) return;
        valor = resultado;
      }
      const resposta = await window.api.os.atualizarStatus(os.id, proximo, valor);
      if (!resposta.sucesso) {
        mostrarErroOS(resposta.erro ?? "Não foi possível atualizar o status.");
        return;
      }
      await recarregarOrdens();
      renderOS();
      atualizarRelatorio();
      atualizarBuscaOSFinalizadas();
    });
    botoes.push(botaoAvancar);
  }

  const botaoExcluir = criarElemento("button", {
    classe: "btn-excluir",
    texto: "Excluir",
    atributos: { type: "button" },
  });
  botaoExcluir.addEventListener("click", async () => {
    const confirmou = await confirmarAcao(
      "Excluir esta ordem de serviço? Essa ação não pode ser desfeita.",
    );
    if (!confirmou) return;
    const resposta = await window.api.os.excluir(os.id);
    if (!resposta.sucesso) {
      mostrarErroOS(resposta.erro ?? "Não foi possível excluir a OS.");
      return;
    }
    await recarregarOrdens();
    renderOS();
    atualizarRelatorio();
    atualizarBuscaOSFinalizadas();
  });
  botoes.push(botaoExcluir);

  return criarElemento("div", {
    classe: "card-item",
    filhos: [
      criarElemento("div", {
        classe: "card-item-main",
        filhos: [
          criarElemento("strong", { texto: `${os.nome_cliente} — ${os.marca} ${os.modelo}` }),
          criarElemento("small", { texto: os.descricao_defeito }),
        ],
      }),
      criarElemento("div", {
        classe: "card-item-side",
        filhos: [
          criarElemento("span", { classe: classeBadge(os.status), texto: os.status }),
          criarElemento("div", { classe: "card-item-actions", filhos: botoes }),
        ],
      }),
    ],
  });
}

function renderOS() {
  const erroEl = document.getElementById("erro-os") as HTMLParagraphElement;
  erroEl.textContent = estado.erroOS ?? "";

  const selectCliente = document.getElementById(
    "select-cliente-os",
  ) as HTMLSelectElement;
  selectCliente.replaceChildren(
    criarElemento("option", { texto: "Selecione um cliente", atributos: { value: "" } }),
    ...estado.clientes.map((c) =>
      criarElemento("option", { texto: c.nome, atributos: { value: String(c.id) } }),
    ),
  );
  selectCliente.value = estado.clienteFormOS ? String(estado.clienteFormOS) : "";

  const equipamentosDoCliente = estado.clienteFormOS
    ? estado.equipamentos.filter((e) => e.id_cliente === estado.clienteFormOS)
    : [];
  const selectEquipamento = document.getElementById(
    "select-equipamento-os",
  ) as HTMLSelectElement;
  selectEquipamento.replaceChildren(
    criarElemento("option", { texto: "Selecione um equipamento", atributos: { value: "" } }),
    ...equipamentosDoCliente.map((e) =>
      criarElemento("option", {
        texto: `${e.marca} ${e.modelo}`,
        atributos: { value: String(e.id) },
      }),
    ),
  );
  selectEquipamento.disabled = equipamentosDoCliente.length === 0;

  const filtroCliente = document.getElementById(
    "filtro-cliente-os",
  ) as HTMLSelectElement;
  filtroCliente.replaceChildren(
    criarElemento("option", { texto: "Todos os clientes", atributos: { value: "" } }),
    ...estado.clientes.map((c) =>
      criarElemento("option", { texto: c.nome, atributos: { value: String(c.id) } }),
    ),
  );
  filtroCliente.value = estado.filtroClienteOS ? String(estado.filtroClienteOS) : "";

  const filtroStatus = document.getElementById(
    "filtro-status-os",
  ) as HTMLSelectElement;
  filtroStatus.value = estado.filtroStatusOS;

  const ordensOrdenadas = [...estado.ordens].sort((a, b) => b.id - a.id);
  const ordensFiltradas = ordensOrdenadas.filter((os) => {
    if (estado.filtroStatusOS !== "todas" && os.status !== estado.filtroStatusOS) return false;
    if (estado.filtroClienteOS !== null && os.id_cliente !== estado.filtroClienteOS) return false;
    return true;
  });

  const lista = document.getElementById("lista-os") as HTMLDivElement;
  lista.replaceChildren();
  if (ordensFiltradas.length > 0) {
    comDivisoriasDeData(ordensFiltradas, criarCardOS).forEach((no) =>
      lista.appendChild(no),
    );
  } else {
    lista.appendChild(
      criarElemento("p", {
        classe: "empty-state",
        texto: estado.ordens.length
          ? "Nenhuma OS encontrada para esse filtro."
          : "Nenhuma ordem de serviço aberta ainda.",
      }),
    );
  }
}

function iniciarOS() {
  const selectCliente = document.getElementById(
    "select-cliente-os",
  ) as HTMLSelectElement;
  selectCliente.addEventListener("change", () => {
    estado.clienteFormOS = selectCliente.value ? Number(selectCliente.value) : null;
    renderOS();
  });

  const filtroCliente = document.getElementById(
    "filtro-cliente-os",
  ) as HTMLSelectElement;
  filtroCliente.addEventListener("change", () => {
    estado.filtroClienteOS = filtroCliente.value ? Number(filtroCliente.value) : null;
    renderOS();
  });

  const filtroStatus = document.getElementById(
    "filtro-status-os",
  ) as HTMLSelectElement;
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
    const resposta = await window.api.os.criar({
      id_equipamento: idEquipamento,
      descricao_defeito: descricaoDefeito,
    });
    if (!resposta.sucesso) {
      mostrarErroOS(resposta.erro ?? "Não foi possível abrir a OS.");
      return;
    }
    form.reset();
    await recarregarOrdens();
    renderOS();
    atualizarRelatorio();
  });
}

function renderRelatorio() {
  const inputInicio = document.getElementById(
    "filtro-relatorio-inicio",
  ) as HTMLInputElement;
  inputInicio.value = estado.filtroRelatorioInicio;

  const inputFim = document.getElementById(
    "filtro-relatorio-fim",
  ) as HTMLInputElement;
  inputFim.value = estado.filtroRelatorioFim;
}

async function atualizarRelatorio() {
  const erro = document.getElementById("erro-relatorio") as HTMLParagraphElement;
  const valorEl = document.getElementById("valor-faturamento") as HTMLElement;
  erro.textContent = "";

  const resposta = await window.api.os.relatorioFaturamento(
    estado.filtroRelatorioInicio || undefined,
    estado.filtroRelatorioFim || undefined,
  );

  if (!resposta.sucesso) {
    erro.textContent = resposta.erro ?? "Não foi possível carregar o faturamento.";
    valorEl.textContent = "—";
    return;
  }

  const total = resposta.dados?.total ?? 0;
  valorEl.textContent = total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function iniciarRelatorio() {
  const inputInicio = document.getElementById(
    "filtro-relatorio-inicio",
  ) as HTMLInputElement;
  inputInicio.addEventListener("change", () => {
    estado.filtroRelatorioInicio = inputInicio.value;
    atualizarRelatorio();
  });

  const inputFim = document.getElementById(
    "filtro-relatorio-fim",
  ) as HTMLInputElement;
  inputFim.addEventListener("change", () => {
    estado.filtroRelatorioFim = inputFim.value;
    atualizarRelatorio();
  });

  document
    .getElementById("botao-limpar-filtro-relatorio")
    ?.addEventListener("click", () => {
      estado.filtroRelatorioInicio = "";
      estado.filtroRelatorioFim = "";
      renderRelatorio();
      atualizarRelatorio();
    });

  document
    .getElementById("botao-atualizar-relatorio")
    ?.addEventListener("click", () => atualizarRelatorio());
}

function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 2) return digitos.replace(/^(\d*)/, "($1");
  if (digitos.length <= 7)
    return digitos.replace(/^(\d{2})(\d*)/, "($1) $2");
  return digitos.replace(/^(\d{2})(\d{5})(\d*)/, "($1) $2-$3");
}

function telefoneCompleto(valor: string): boolean {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length === 10 || digitos.length === 11;
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

function renderizarListaOSFinalizadas(ordens: ordem_servico_detalhada[], termoDestaque: string) {
  const lista = document.getElementById("lista-os-finalizadas") as HTMLUListElement;
  lista.textContent = "";

  let rotuloAnterior: string | null = null;

  ordens.forEach((os) => {
    const rotulo = rotuloDataAbertura(os.data_abertura);
    if (rotulo !== rotuloAnterior) {
      const divisoria = document.createElement("li");
      divisoria.className = "date-divider";
      divisoria.textContent = rotulo;
      lista.appendChild(divisoria);
      rotuloAnterior = rotulo;
    }

    const item = document.createElement("li");

    const cliente = document.createElement("strong");
    montarTextoComDestaque(cliente, os.nome_cliente, termoDestaque);

    const detalhe = document.createElement("span");
    detalhe.textContent = ` — ${os.descricao_defeito} — ${os.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;

    item.appendChild(cliente);
    item.appendChild(detalhe);
    lista.appendChild(item);
  });
}

async function buscarOSFinalizadas(termo?: string) {
  const erro = document.getElementById("erro-buscar-os-finalizadas") as HTMLParagraphElement;
  const lista = document.getElementById("lista-os-finalizadas") as HTMLUListElement;
  erro.textContent = "";

  const resposta = await window.api.os.listar(termo);
  if (!resposta.sucesso) {
    lista.textContent = "";
    erro.textContent = resposta.erro ?? "Não foi possível buscar agora.";
    return;
  }

  const finalizadas = (resposta.dados ?? []).filter((os) => os.status === "finalizada");

  if (finalizadas.length === 0) {
    lista.textContent = "";
    erro.textContent = "Nenhuma OS finalizada registrada ainda.";
    return;
  }

  const termoBusca = (termo ?? "").trim();
  const termoNormalizado = normalizarTexto(termoBusca);

  const existeCorrespondencia =
    !termoNormalizado ||
    finalizadas.some((os) => normalizarTexto(os.nome_cliente).includes(termoNormalizado));

  renderizarListaOSFinalizadas(finalizadas, termoBusca);

  if (termoNormalizado && !existeCorrespondencia) {
    erro.textContent =
      "Nenhuma correspondência para esse termo — mostrando todas as OS finalizadas.";
  }
}

function atualizarBuscaOSFinalizadas() {
  const campoBusca = document.getElementById(
    "campo-buscar-os-finalizadas",
  ) as HTMLInputElement | null;
  if (!campoBusca) return;
  buscarOSFinalizadas(campoBusca.value.trim() || undefined);
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
    const itens = document.querySelectorAll<HTMLLIElement>(
      "#lista-os-finalizadas li:not(.date-divider)",
    );
    itens.forEach((item) => {
      const visivel = normalizarTexto(item.textContent ?? "").includes(termo);
      item.hidden = !visivel;
    });
  });

  buscarOSFinalizadas();
}

async function iniciar() {
  iniciarTabs();
  iniciarFormCliente();
  iniciarEquipamentos();
  iniciarOS();
  iniciarRelatorio();

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
  atualizarRelatorio();
  atualizarAbaAtiva();
  iniciarExercicioOSFinalizadas();
}

iniciar()
