import "./style.css";
import type { clientes, equipamentos, ordens_de_servico, marca_suportada } from "./types";
declare global {
  interface Window {
    api: {
      ping: () => Promise<string>
      clientes: {
        listar: () => Promise<clientes[]>
        criar: (cliente: Omit<clientes, 'id'>) => Promise<clientes>
      }
      equipamentos: {
        listar: () => Promise<equipamentos[]>
        listarPorCliente: (idCliente: number) => Promise<equipamentos[]>
        criar: (equipamento: Omit<equipamentos, 'id'>) => Promise<equipamentos>
        listarMarcasSuportadas: () => Promise<marca_suportada[]>
      }

      os: {
        listar: () => Promise<ordens_de_servico[]>
        criar: (os: Omit<ordens_de_servico, 'id' | 'status' | 'valor_total'>) => Promise<ordens_de_servico>
        atualizarStatus: (id: number, status: ordens_de_servico['status'], valorTotal?: number) => Promise<ordens_de_servico>
        relatorioFaturamento: () => Promise<{ total: number }>
      }
    }
  }
}


type Aba = 'clientes' | 'equipamentos' | 'os' | 'relatorio'

const estado: {
  aba: Aba
  clientes: clientes[]
  equipamentos: equipamentos[]
  ordens: ordens_de_servico[]
  marcasSuportadas: marca_suportada[]
  clienteFiltroEquipamentos: number | null
  clienteFormOS: number | null
} = {
  aba: 'clientes',
  clientes: [],
  equipamentos: [],
  ordens: [],
  marcasSuportadas: [],
  clienteFiltroEquipamentos: null,
  clienteFormOS: null,
}


const proximoStatus: Record<ordens_de_servico['status'], ordens_de_servico['status'] | null> = {
  aberta: 'em andamento',
  'em andamento': 'finalizada',
  finalizada: null,
}

function classeBadge(status: ordens_de_servico['status']): string {
  return `badge badge-${status.replace(/\s+/g, '-')}`
}

function nomeCliente(idCliente: number): string {
  return estado.clientes.find((c) => c.id === idCliente)?.nome ?? `Cliente #${idCliente}`
}

function descricaoEquipamento(idEquipamento: number): string {
  const equipamento = estado.equipamentos.find((e) => e.id === idEquipamento)
  return equipamento ? `${equipamento.marca} ${equipamento.modelo}` : `Equipamento #${idEquipamento}`
}

function pedirValor(mensagem: string): Promise<number | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
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
    `
    document.body.appendChild(overlay)

    const input = overlay.querySelector('#modal-valor-input') as HTMLInputElement
    const erro = overlay.querySelector('#modal-valor-erro') as HTMLElement
    input.focus()
    input.select()

    const fechar = (resultado: number | null) => {
      overlay.remove()
      resolve(resultado)
    }

    overlay.querySelector('#modal-cancelar')!.addEventListener('click', () => fechar(null))
    overlay.querySelector('#modal-confirmar')!.addEventListener('click', () => {
      const valor = Number(input.value)
      if (Number.isNaN(valor) || valor < 0) {
        erro.textContent = 'Digite um valor válido.'
        return
      }
      fechar(valor)
    })
  })
}


function montarCasca() {
  const appElement = document.getElementById('app') as HTMLDivElement
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
  `

  document.querySelectorAll<HTMLButtonElement>('.tab-button').forEach((botao) => {
    botao.addEventListener('click', () => {
      estado.aba = botao.dataset.tab as Aba
      atualizarAbaAtiva()
    })
  })
}
function atualizarAbaAtiva() {
  document.querySelectorAll<HTMLButtonElement>('.tab-button').forEach((botao) => {
    botao.classList.toggle('active', botao.dataset.tab === estado.aba)
  })
  document.querySelectorAll<HTMLElement>('.section').forEach((secao) => {
    secao.classList.toggle('active', secao.id === `secao-${estado.aba}`)
  })
}

async function carregarDados() {
  const [clientesResp, equipamentosResp, ordensResp, marcasResp] = await Promise.all([
    window.api.clientes.listar(),
    window.api.equipamentos.listar(),
    window.api.os.listar(),
    window.api.equipamentos.listarMarcasSuportadas(),
  ])
  estado.clientes = clientesResp
  estado.equipamentos = equipamentosResp
  estado.ordens = ordensResp
  estado.marcasSuportadas = marcasResp
}


function renderClientes() {
  const secao = document.getElementById('secao-clientes') as HTMLElement
  const linhas = estado.clientes.length
    ? estado.clientes
        .map(
          (c) => `
        <div class="card-item">
          <div class="card-item-main">
            <strong>${c.nome}</strong>
            <small>${c.telefone}</small>
          </div>
        </div>
      `,
        )
        .join('')
    : '<p class="empty-state">Nenhum cliente cadastrado ainda.</p>'

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
  `

  const form = document.getElementById('form-cliente') as HTMLFormElement
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    const dados = new FormData(form)
    const nome = String(dados.get('nome') ?? '').trim()
    const telefone = String(dados.get('telefone') ?? '').trim()
    if (!nome || !telefone) return
    await window.api.clientes.criar({ nome, telefone })
    estado.clientes = await window.api.clientes.listar()
    renderClientes()
    renderEquipamentos()
    renderOS()
  })
}

function renderEquipamentos() {
  const secao = document.getElementById('secao-equipamentos') as HTMLElement
  const opcoesClientes = estado.clientes
    .map(
      (c) =>
        `<option value="${c.id}" ${estado.clienteFiltroEquipamentos === c.id ? 'selected' : ''}>${c.nome}</option>`,
    )
    .join('')

  const equipamentosFiltrados = estado.clienteFiltroEquipamentos
    ? estado.equipamentos.filter((e) => e.id_cliente === estado.clienteFiltroEquipamentos)
    : []

  const linhas = equipamentosFiltrados.length
    ? equipamentosFiltrados
        .map(
          (e) => `
        <div class="card-item">
          <div class="card-item-main">
            <strong>${e.marca} ${e.modelo}</strong>
            <small>${nomeCliente(e.id_cliente)}</small>
          </div>
        </div>
      `,
        )
        .join('')
    : `<p class="empty-state">${
        estado.clienteFiltroEquipamentos
          ? 'Nenhum equipamento cadastrado para este cliente.'
          : 'Selecione um cliente para ver os equipamentos.'
      }</p>`

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
          .join('')}
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
        <button type="submit" ${estado.clienteFiltroEquipamentos ? '' : 'disabled'}>Cadastrar</button>
      </form>
    </div>
  `

  const select = document.getElementById('select-cliente-equipamentos') as HTMLSelectElement
  select.value = estado.clienteFiltroEquipamentos ? String(estado.clienteFiltroEquipamentos) : ''
  select.addEventListener('change', () => {
    estado.clienteFiltroEquipamentos = select.value ? Number(select.value) : null
    renderEquipamentos()
  })

  const form = document.getElementById('form-equipamento') as HTMLFormElement
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    if (!estado.clienteFiltroEquipamentos) return
    const dados = new FormData(form)
    const marca = String(dados.get('marca') ?? '').trim()
    const modelo = String(dados.get('modelo') ?? '').trim()
    if (!marca || !modelo) return
    await window.api.equipamentos.criar({ marca, modelo, id_cliente: estado.clienteFiltroEquipamentos })
    estado.equipamentos = await window.api.equipamentos.listar()
    renderEquipamentos()
    renderOS()
  })
}

function renderOS() {
  const secao = document.getElementById('secao-os') as HTMLElement

  const opcoesClientes = estado.clientes
    .map(
      (c) => `<option value="${c.id}" ${estado.clienteFormOS === c.id ? 'selected' : ''}>${c.nome}</option>`,
    )
    .join('')

  const equipamentosDoCliente = estado.clienteFormOS
    ? estado.equipamentos.filter((e) => e.id_cliente === estado.clienteFormOS)
    : []

  const opcoesEquipamentos = equipamentosDoCliente
    .map((e) => `<option value="${e.id}">${e.marca} ${e.modelo}</option>`)
    .join('')

  const ordensOrdenadas = [...estado.ordens].sort((a, b) => b.id - a.id)

  const linhas = ordensOrdenadas.length
    ? ordensOrdenadas
        .map((os) => {
          const proximo = proximoStatus[os.status]
          return `
        <div class="card-item">
          <div class="card-item-main">
            <strong>${descricaoEquipamento(os.id_equipamento)}</strong>
            <small>${os.descricao_defeito}</small>
          </div>
          <span class="${classeBadge(os.status)}">${os.status}</span>
          ${proximo ? `<button class="secondary" data-avancar="${os.id}">Marcar como "${proximo}"</button>` : ''}
        </div>
      `
        })
        .join('')
    : '<p class="empty-state">Nenhuma ordem de serviço aberta ainda.</p>'

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
            <select name="id_equipamento" id="select-equipamento-os" ${equipamentosDoCliente.length ? '' : 'disabled'}>
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
    <div class="card-list">${linhas}</div>
  `

  const selectCliente = document.getElementById('select-cliente-os') as HTMLSelectElement
  selectCliente.value = estado.clienteFormOS ? String(estado.clienteFormOS) : ''
  selectCliente.addEventListener('change', () => {
    estado.clienteFormOS = selectCliente.value ? Number(selectCliente.value) : null
    renderOS()
  })

  const form = document.getElementById('form-os') as HTMLFormElement
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    const dados = new FormData(form)
    const idEquipamento = Number(dados.get('id_equipamento'))
    const descricaoDefeito = String(dados.get('descricao_defeito') ?? '').trim()
    if (!idEquipamento || !descricaoDefeito) return
    await window.api.os.criar({ id_equipamento: idEquipamento, descricao_defeito: descricaoDefeito })
    estado.ordens = await window.api.os.listar()
    renderOS()
    renderRelatorio()
  })

    secao.querySelectorAll<HTMLButtonElement>('[data-avancar]').forEach((botao) => {
      botao.addEventListener('click', async () => {
      const id = Number(botao.dataset.avancar)
      const os = estado.ordens.find((o) => o.id === id)
      const proximo = os ? proximoStatus[os.status] : null
      if (!proximo) return

      let valor: number | undefined
      if (proximo === 'finalizada') {
        const resultado = await pedirValor('Valor cobrado nesta OS (R$):')
        if (resultado === null) return
        valor = resultado
      }

      await window.api.os.atualizarStatus(id, proximo, valor)
      estado.ordens = await window.api.os.listar()
      renderOS()
      renderRelatorio()
    })
  })
}

function renderRelatorio() {
  const secao = document.getElementById('secao-relatorio') as HTMLElement
  secao.innerHTML = `
    <h2 class="section-title">Faturamento</h2>
    <div class="stat-card">
      <p class="label">Total faturado (OS finalizadas)</p>
      <p class="valor" id="valor-faturamento">carregando...</p>
      <button class="secondary" id="botao-atualizar-relatorio">Atualizar</button>
    </div>
  `

  const atualizar = async () => {
    const { total } = await window.api.os.relatorioFaturamento()
    const valorEl = document.getElementById('valor-faturamento') as HTMLElement
    valorEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  document.getElementById('botao-atualizar-relatorio')?.addEventListener('click', atualizar)
  atualizar()
}

async function iniciar() {
  montarCasca()
  await carregarDados()
  renderClientes()
  renderEquipamentos()
  renderOS()
  renderRelatorio()
  atualizarAbaAtiva()
}

iniciar()
