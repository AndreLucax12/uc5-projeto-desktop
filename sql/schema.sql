-- TechOS - Gerenciador de Assistência Técnica
-- Schema do banco (PostgreSQL / Neon). Rode este arquivo inteiro no banco
-- antes de usar o app pela primeira vez (via DBeaver, SQL Editor do Neon,
-- ou psql). Sem isso, todas as telas de listagem falham com
-- "relation ... does not exist" (código Postgres 42P01).

CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  telefone VARCHAR(20)
);

CREATE TABLE equipamentos (
  id SERIAL PRIMARY KEY,
  marca VARCHAR(80) NOT NULL,
  modelo VARCHAR(80) NOT NULL,
  id_cliente INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT
);

CREATE TABLE ordens_servico (
  id SERIAL PRIMARY KEY,
  id_equipamento INTEGER NOT NULL REFERENCES equipamentos(id) ON DELETE RESTRICT,
  descricao_defeito TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'em andamento', 'finalizada')),
  valor_total NUMERIC(10,2) DEFAULT 0,
  data_abertura TIMESTAMP NOT NULL DEFAULT NOW()
);
