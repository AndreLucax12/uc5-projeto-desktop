export interface clientes {
    id: number; 
    nome: string;
    telefone: string;
}

export interface equipamentos {
    id: number;
    marca: string;
    modelo: string;
    Idclientes: number;
}

export interface ordens_de_servico {
    id: number;
    idEquipamento: number;
    descricao_defeito: string;
    status: 'aberta' | 'em andamento' | 'finalizada';
    valor_Total: number;
}       



