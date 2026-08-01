export interface clientes {
    id: number; 
    nome: string;
    telefone: string;
}

export interface equipamentos {
    id: number;
    marca: string;
    modelo: string;
    id_cliente: number;
}

export interface ordens_de_servico {
    id: number;
    id_equipamento: number;
    descricao_defeito: string;
    status: 'aberta' | 'em andamento' | 'finalizada';
    valor_total: number;
}       



