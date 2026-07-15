interface clientes {
    id: number; 
    nome: string;
    telefone: string;
}

interface equipamentos {
    id: number;
    marca: string;
    modelo: string;
    Idclientes: number;
}

interface ordens_de_servico {
    id: number;
    idEquipamento: number;
    descricao_defeito: string;
    status: 'aberta' | 'em andamento' | 'finalizada';
    valor_Total: number;
}       

export { clientes, equipamentos, ordens_de_servico };